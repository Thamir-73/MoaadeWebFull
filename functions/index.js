const { onSchedule } = require("firebase-functions/v2/scheduler");
const logger = require("firebase-functions/logger");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, Timestamp, FieldValue } = require("firebase-admin/firestore");

initializeApp();

// Check every minute for pickups that should be in progress
exports.updatePickupStatuses = onSchedule({
  schedule: "* * * * *", // Run every minute
  timeZone: "Asia/Riyadh",
  retryCount: 3, // Add retry
  memory: "256MB" // Specify memory
}, async (event) => {
  const db = getFirestore();
  const now = Timestamp.now();
  const pickupsRef = db.collection('pickups');

  try {
    // Add START log
    logger.info('Function started execution');
    logger.info(`Memory: ${process.memoryUsage().heapUsed / 1024 / 1024} MB`);

    // Get current time components in Riyadh timezone
    const riyadhTime = new Date(now.toDate().toLocaleString('en-US', { timeZone: 'Asia/Riyadh' }));
    const currentHour = riyadhTime.getHours().toString().padStart(2, '0');
    const currentMinute = riyadhTime.getMinutes().toString().padStart(2, '0');
    const currentTimeString = `${currentHour}:${currentMinute}`;
    
    logger.info(`Current Riyadh time: ${currentTimeString}`);

    // Query pickups for today, regardless of main status
    const pickupsSnapshot = await pickupsRef
      .where('timeSlot.date', '==', riyadhTime.toISOString().split('T')[0])
      .get();

    logger.info(`Found ${pickupsSnapshot.size} pickups for today`);

    const batch = db.batch();
    let updatesCount = 0;

    pickupsSnapshot.forEach(doc => {
      const pickup = doc.data();
      
      if (pickup.timeSlot && pickup.timeSlot.startTime === currentTimeString) {
        logger.info(`Checking pickup ${doc.id} branches at ${currentTimeString}`);
        
        let branchesUpdated = false;
        const updatedBranches = pickup.branches.map(branch => {
          if (branch.status === 'scheduled') {
            branchesUpdated = true;
            return {
              ...branch,
              status: 'in_progress'
            };
          }
          return branch;
        });

        if (branchesUpdated) {
          logger.info(`Updating branches for pickup: ${doc.id}`);
          
          // Only update the pickup document's branches array
          batch.update(doc.ref, {
            branches: updatedBranches
          });

          updatesCount++;
        }
      }
    });

    if (updatesCount > 0) {
      await batch.commit();
      logger.info(`Updated branches in ${updatesCount} pickups to in_progress`);
    } else {
      logger.info('No branches needed updating at this time');
    }

  } catch (error) {
    logger.error('Error updating pickup statuses:', error);
    logger.error(error.stack);
    throw error; // Rethrow to trigger retry
  }
});

// Keep your existing daily update function
exports.dailyPickupUpdate = onSchedule({
  schedule: "0 0 * * *",
  timeZone: "Asia/Riyadh",
}, async (event) => {
  const db = getFirestore();
  const factoriesRef = db.collection('factories');
  const branchesRef = db.collection('branches');
  const now = Timestamp.now();

  try {
    // Update factory pickup routes
    const factoriesSnapshot = await factoriesRef.get();
    const factoriesBatch = db.batch();

    factoriesSnapshot.forEach(doc => {
      const factory = doc.data();
      if (factory.pickupRoutes) {
        Object.entries(factory.pickupRoutes).forEach(([routeId, route]) => {
          Object.entries(route.materials).forEach(([materialId, material]) => {
            if (material.status === 'picked_up' && material.nextPickup && material.nextPickup.toDate() <= now.toDate()) {
              factoriesBatch.update(doc.ref, {
                [`pickupRoutes.${routeId}.materials.${materialId}.status`]: 'pending',
                [`pickupRoutes.${routeId}.materials.${materialId}.lastPickup`]: material.nextPickup,
                [`pickupRoutes.${routeId}.materials.${materialId}.nextPickup`]: FieldValue.delete()
              });
            }
          });
        });
      }
    });

    await factoriesBatch.commit();

    // Update branch material statuses
    const branchesSnapshot = await branchesRef.get();
    const branchesBatch = db.batch();

    branchesSnapshot.forEach(doc => {
      const branch = doc.data();
      if (branch.materials) {
        Object.entries(branch.materials).forEach(([materialId, material]) => {
          if (material.status === 'picked_up') {
            branchesBatch.update(doc.ref, {
              [`materials.${materialId}.status`]: 'available',
              [`materials.${materialId}.lastPickup`]: now
            });
          }
        });
      }
    });

    await branchesBatch.commit();

    logger.info('Pickup statuses updated successfully');
  } catch (error) {
    logger.error('Error updating pickup statuses:', error);
  }
});
