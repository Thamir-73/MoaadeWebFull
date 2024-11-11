import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, getDocs, updateDoc, query, where, serverTimestamp, writeBatch, arrayUnion, increment } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
let analytics;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}


// Enhanced pickup statuses
const PICKUP_STATUSES = {
  PENDING_INITIAL_PICKUP: 'pending_initial_pickup',    // Initial state when factory adds branch
  PENDING_BRANCH_APPROVAL: 'pending_branch_approval',  // After factory sets time, waiting for branch
  SCHEDULED: 'scheduled',                             // After branch approves
  IN_PROGRESS: 'in_progress',                        // When pickup started
  COMPLETED: 'completed',                            // After pickup completed
  CANCELLED: 'cancelled'                             // If cancelled
};

const RECURRING_FREQUENCIES = {
  WEEKLY: 'weekly',
  BI_WEEKLY: 'bi_weekly',
  MONTHLY: 'monthly'
};

const RECURRING_STATUS = {
  ACTIVE: 'active',
  PAUSED: 'paused'
};

// New function to check pickup history
async function hasSuccessfulPickup(factoryId, companyId) {
  try {
    const pickupsRef = collection(db, 'pickups');
    const q = query(
      pickupsRef,
      where('factoryId', '==', factoryId),
      where('status', '==', PICKUP_STATUSES.COMPLETED),
      where('companyId', '==', companyId)  // Check any branch from this company
    );
    
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error("Error checking company pickup history:", error);
    throw error;
  }
}

async function addToPickupRoute(factoryId, materials, pickupType, timeSlot = null) {
  if (!factoryId) return null;
  try {
    console.log('Starting addToPickupRoute with materials:', materials);
    const pickupsRef = collection(db, 'pickups');
    
    // Keep recurring pickup check
    if (pickupType === 'recurring') {
      for (const material of materials) {
        if (material.frequency !== 'one_time') {
          const hasHistory = await hasSuccessfulPickup(factoryId, material.branchId);
          if (!hasHistory) {
            throw new Error('FIRST_PICKUP_REQUIRED');
          }
        }
      }
    }
    
    const newPickup = {
      factoryId,
      pickupType,
      createdAt: serverTimestamp(),
      proposedDate: timeSlot ? new Date(timeSlot.date) : null,
      confirmedDate: null,
      pickupHistory: [],
      timeSlot: timeSlot ? {
        date: timeSlot.date,
        startTime: timeSlot.startTime,
        endTime: timeSlot.endTime
      } : null,
      
      branches: materials.map(material => ({
        branchId: material.branchId,
        companyId: material.companyId,
        materialType: material.materialType,
        estimatedQuantity: material.quantity,
        frequency: material.frequency,
        status: timeSlot ? PICKUP_STATUSES.PENDING_BRANCH_APPROVAL : PICKUP_STATUSES.PENDING_INITIAL_PICKUP,
        actualWeight: null,
        approvalStatus: {
          branchApproved: false
        }
      })),

      approvalStatus: {
        factoryApproved: true
      },

      recurringDetails: (pickupType === 'recurring') ? {
        startDate: timeSlot ? new Date(timeSlot.date) : null,
        frequency: materials[0].frequency,
        dayOfWeek: timeSlot ? new Date(timeSlot.date).getDay() : null,
        status: RECURRING_STATUS.ACTIVE,
        lastPickup: null,
        nextPickup: calculateNextPickupDate(
          timeSlot.date,
          materials[0].frequency,
          new Date(timeSlot.date).getDay()
        ),
        skipDates: []
      } : null
    };

    const docRef = await addDoc(pickupsRef, newPickup);
    console.log('Created pickup document:', docRef.id);

    // Batch update for branches including field deletion
    const batch = writeBatch(db);
    for (const material of materials) {
      const branchRef = doc(db, 'branches', material.branchId);
      const branchDoc = await getDoc(branchRef);
      const branchData = branchDoc.data();
      
      // Remove pending fields if they exist
      if (branchData.materials[material.materialType].pendingFactoryId) {
        const updatedMaterials = { ...branchData.materials };
        delete updatedMaterials[material.materialType].pendingFactoryId;
        delete updatedMaterials[material.materialType].pendingTimestamp;
        
        batch.update(branchRef, {
          materials: updatedMaterials,
          [`materials.${material.materialType}.quantity`]: material.quantity || 0,
          [`materials.${material.materialType}.pickupDetails.pickupId`]: docRef.id,
          [`materials.${material.materialType}.pickupDetails.day`]: timeSlot?.date || null
        });
      } else {
        batch.update(branchRef, {
          [`materials.${material.materialType}.quantity`]: material.quantity || 0,
          [`materials.${material.materialType}.pickupDetails.pickupId`]: docRef.id,
          [`materials.${material.materialType}.pickupDetails.day`]: timeSlot?.date || null
        });
      }
    }
    await batch.commit();
    console.log('Branch updates completed');

    // Group materials by companyId (user ID) for notifications
    const companiesMap = {};
    materials.forEach(material => {
      if (!companiesMap[material.companyId]) {
        companiesMap[material.companyId] = [];
      }
      companiesMap[material.companyId].push(material);
    });

    console.log('Grouped materials by company:', companiesMap);

    // Create notifications for each company
    for (const [userId, companyMaterials] of Object.entries(companiesMap)) {
      console.log('Creating notification for user:', userId);
      
      // Get branch names
      const branchNames = await Promise.all(
        companyMaterials.map(async (material) => {
          const branchDoc = await getDoc(doc(db, 'branches', material.branchId));
          return branchDoc.exists() ? branchDoc.data().name : 'Unknown Branch';
        })
      );

      console.log('Branch names for notification:', branchNames);

      try {
        await createNotification(userId, {
          type: NOTIFICATION_TYPES.NEW_PICKUP_REQUEST,
          title: 'New Pickup Request',
          message: `New pickup request for branches: ${branchNames.join(', ')}`,
          pickupId: docRef.id,
          branches: companyMaterials.map(m => ({
            branchId: m.branchId,
            materialType: m.materialType
          }))
        });
        console.log('Notification created successfully for user:', userId);
      } catch (notifError) {
        console.error('Error creating notification:', notifError);
      }
    }

    return docRef.id;
  } catch (error) {
    console.error("Error in addToPickupRoute:", error);
    throw error;
  }
}



async function updatePickupApproval(pickupId, branchId, isApproved) {
  try {
    const pickupRef = doc(db, 'pickups', pickupId);
    const pickupDoc = await getDoc(pickupRef);
    
    if (!pickupDoc.exists()) {
      throw new Error('Pickup not found');
    }

    const pickupData = pickupDoc.data();
    
    // Get branch data first
    const branchRef = doc(db, 'branches', branchId);
    const branchDoc = await getDoc(branchRef);
    const branchName = branchDoc.exists() ? branchDoc.data().name : 'Unknown Branch';
    
    // Update the specific branch's approval status and status
    const updatedBranches = pickupData.branches.map(branch => {
      if (branch.branchId === branchId) {
        return {
          ...branch,
          status: isApproved ? 'scheduled' : 'cancelled',
          approvalStatus: {
            branchApproved: isApproved
          }
        };
      }
      return branch;
    });

    // Get the branch's material type from the pickup data
    const branchData = pickupData.branches.find(b => b.branchId === branchId);
    const materialType = branchData.materialType;

    // Update the pickup document
    await updateDoc(pickupRef, {
      branches: updatedBranches
    });

    // Update branch material status
    await updateDoc(branchRef, {
      [`materials.${materialType}.status`]: isApproved ? 'scheduled' : 'cancelled'
    });

    // If approved, create notification for factory
    if (isApproved) {
      const date = pickupData.timeSlot?.date;
      const startTime = pickupData.timeSlot?.startTime;
      const endTime = pickupData.timeSlot?.endTime;

      const notificationMessage = {
        ar: `تم جدولة عملية جمع لفرع: ${branchName}\nالتاريخ: ${date}\nالوقت: ${startTime} - ${endTime}`,
        en: `Pickup scheduled for branch: ${branchName}\nDate: ${date}\nTime: ${startTime} - ${endTime}`
      };

      await createNotification(pickupData.factoryId, {
        type: NOTIFICATION_TYPES.FACTORY_PICKUP_SCHEDULED,
        title: NOTIFICATION_TYPES.FACTORY_PICKUP_SCHEDULED,
        message: notificationMessage,
        pickupId: pickupId,
        branchId: branchId,
        branchName: branchName,
        timeSlot: pickupData.timeSlot
      });
    }

    return true;
  } catch (error) {
    console.error("Error updating pickup approval:", error);
    throw error;
  }
}


// Modified completePickup function
async function completePickup(pickupId, totalWeight, selectedBranchIds) {
  if (!pickupId || !totalWeight || !selectedBranchIds) {
    throw new Error('Pickup ID, total weight, and selected branches are required');
  }

  try {
    const pickupRef = doc(db, 'pickups', pickupId);
    const pickupDoc = await getDoc(pickupRef);
    
    if (!pickupDoc.exists()) {
      throw new Error('Pickup not found');
    }

    const pickupData = pickupDoc.data();
    const now = new Date();

    // Update only selected branches
    const updatedBranches = pickupData.branches.map(branch => ({
      ...branch,
      status: selectedBranchIds.includes(branch.branchId) ? 'completed' : branch.status
    }));

    // Base updates object
    const updates = {
      status: updatedBranches.every(b => b.status === 'completed') 
        ? PICKUP_STATUSES.COMPLETED 
        : PICKUP_STATUSES.IN_PROGRESS,
      completedAt: serverTimestamp(),
      totalActualWeight: totalWeight,
      branches: updatedBranches,
      pickupHistory: arrayUnion({
        date: now,
        totalWeight,
        completedBranches: selectedBranchIds
      })
    };

    // Only add recurring updates if it's a recurring pickup
    if (pickupData.pickupType === 'recurring' && pickupData.recurringDetails) {
      const nextPickupDate = calculateNextPickupDate(
        now,
        pickupData.recurringDetails.frequency,
        pickupData.recurringDetails.dayOfWeek
      );
      
      updates.recurringDetails = {
        ...pickupData.recurringDetails,
        lastPickup: now,
        nextPickup: nextPickupDate
      };
    }

    await updateDoc(pickupRef, updates);

    // Update branch quantities
    const batch = writeBatch(db);
    for (const branchId of selectedBranchIds) {
      const branch = pickupData.branches.find(b => b.branchId === branchId);
      if (branch) {
        const branchRef = doc(db, 'branches', branch.branchId);
        batch.update(branchRef, {
          [`materials.${branch.materialType}.quantity`]: increment(-totalWeight)
        });
      }
    }
    await batch.commit();

    return { success: true, message: 'Pickup completed successfully' };
  } catch (error) {
    console.error("Error completing pickup:", error);
    throw error;
  }
}

async function updateUserProfile(user, additionalData = {}) {
  if (!user) return;

  const userRef = doc(db, 'users', user.uid);
  try {
    const userDoc = await getDoc(userRef);
    let dataToUpdate = userDoc.exists() ? userDoc.data() : {};

    // Update only the fields that are provided in additionalData
    Object.keys(additionalData).forEach(key => {
      if (additionalData[key] !== undefined) {
        dataToUpdate[key] = additionalData[key];
      }
    });

    // Ensure phoneNumber is always present for phone sign-ups
    if (user.phoneNumber && !dataToUpdate.phoneNumber) {
      dataToUpdate.phoneNumber = user.phoneNumber;
    }

    // Add email field if the user has an email
    if (user.email && !dataToUpdate.email) {
      dataToUpdate.email = user.email;
    }

    console.log('Data to update in Firebase:', dataToUpdate);

    await setDoc(userRef, dataToUpdate, { merge: true });

    console.log('User profile updated successfully');
  } catch (error) {
    console.error("Error updating user document:", error);
    throw error;
  }
}

async function getUserData(userId) {
  if (!userId) return null;
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    return userSnap.data();
  } else {
    return null;
  }
}

function getPickupDetails(frequency, pickupDate) {
  switch (frequency) {
    case 'daily':
    case 'weekly':
    case 'monthly':
      return { frequency };
    case 'one_time':
      return { frequency, date: pickupDate };
    default:
      console.error('Invalid frequency:', frequency);
      return { frequency: 'unknown' };
  }
}



async function registerBranch(userId, branchData) {
  if (!userId) return null;
  try {
    console.log("Starting branch registration for user:", userId);
    console.log("Branch data:", branchData);

    const branchesRef = collection(db, 'branches');
    const storage = getStorage();

    // Upload images if any
    let imageUrls = [];
    if (branchData.images && branchData.images.length > 0) {
      console.log("Uploading branch images");
      for (let image of branchData.images) {
        const imageRef = ref(storage, `branch_images/${userId}/${Date.now()}_${image.name}`);
        await uploadBytes(imageRef, image);
        const imageUrl = await getDownloadURL(imageRef);
        imageUrls.push(imageUrl);
      }
      console.log("Images uploaded successfully. URLs:", imageUrls);
    }

    const newBranch = {
      userId,
      name: branchData.name,
      phoneNumber: branchData.phoneNumber || '', // Ensure it's always a string
      location: branchData.location,
      locationAddress: branchData.locationAddress,
      createdAt: serverTimestamp(),
      materials: {
        [branchData.materialType]: {
          type: branchData.materialType,
          frequency: branchData.frequency,
          pickupDetails: getPickupDetails(branchData.frequency, branchData.pickupDate),
          status: true,
          materialAvailability: 'available', // Add this new field
          quantity: branchData.quantity || 0,
          images: imageUrls
        }
      }
    };

    console.log("Prepared new branch data:", newBranch);

    const docRef = await addDoc(branchesRef, newBranch);
    console.log("Branch registered successfully with ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Error registering branch:", error);
    console.error("Error details:", error.message);
    console.error("Error stack:", error.stack);
    throw error;
  }
}



async function getUserBranches(userId) {
  if (!userId) return [];
  try {
    const branchesRef = collection(db, 'branches');
    const q = query(branchesRef, where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error fetching user branches:", error);
    throw error;
  }
}

async function declareMaterial(branchId, materialData) {
  if (!branchId) return null;
  try {
    const branchRef = doc(db, 'branches', branchId);
    const branchDoc = await getDoc(branchRef);
    if (!branchDoc.exists()) throw new Error("Branch not found");

    const materials = branchDoc.data().materials || {};
    materials[materialData.type] = {
      ...materialData,
      status: 'available',
    };

    await updateDoc(branchRef, { materials });
    return true;
  } catch (error) {
    console.error("Error declaring material:", error);
    throw error;
  }
}

async function updateMaterialQuantity(branchId, materialType, newQuantity) {
  if (!branchId) return null;
  try {
    const branchRef = doc(db, 'branches', branchId);
    const branchDoc = await getDoc(branchRef);
    if (!branchDoc.exists()) throw new Error("Branch not found");

    await updateDoc(branchRef, {
      [`materials.${materialType}.quantity`]: newQuantity
    });
    return true;
  } catch (error) {
    console.error("Error updating material quantity:", error);
    throw error;
  }
}


async function getAvailableMaterials(factoryMaterialType) {
  try {
    console.log("Starting getAvailableMaterials function for factory type:", factoryMaterialType);
    
    // Get all scheduled or ongoing pickups
    const pickupsRef = collection(db, 'pickups');
    const pickupsQuery = query(pickupsRef, where('status', 'in', ['pending_initial_pickup', 'scheduled']));
    const pickupsSnapshot = await getDocs(pickupsQuery);
    
    // Create a Set of branch IDs that are already in a pickup
    const branchesInPickup = new Set();
    pickupsSnapshot.forEach(doc => {
      branchesInPickup.add(doc.data().branchId);
    });

    const branchesRef = collection(db, 'branches');
    const querySnapshot = await getDocs(branchesRef);
    let availableMaterials = [];

    querySnapshot.forEach((doc) => {
      const branch = { id: doc.id, ...doc.data() };
      
      // Only process this branch if it's not already in a pickup
      if (!branchesInPickup.has(branch.id)) {
        Object.entries(branch.materials).forEach(([materialType, material]) => {
          if (material.status === true) {
            // Check if the material type matches the factory's material type
            const isMatch = 
              materialType.toLowerCase() === factoryMaterialType.toLowerCase() ||
              (factoryMaterialType.toLowerCase() === 'paperandcardboard' && 
               (materialType.toLowerCase() === 'paper' || 
                materialType.toLowerCase() === 'cardboard' || 
                materialType.toLowerCase() === 'paperandcardboard'));

            if (isMatch) {
              availableMaterials.push({
                id: doc.id + '_' + materialType,
                branchId: doc.id,
                companyId: branch.userId,
                name: branch.name,
                location: branch.location,
                locationAddress: branch.locationAddress,
                phoneNumber: branch.phoneNumber || '',
                materialType: materialType,
                frequency: material.frequency,
                pickupDetails: material.pickupDetails,
                quantity: material.quantity || 0,
                images: material.images || []
              });
            }
          }
        });
      }
    });

    return availableMaterials;
  } catch (error) {
    console.error("Error fetching available materials:", error);
    throw error;
  }
}



async function startPickup(factoryId, routeId) {
  if (!factoryId || !routeId) return null;
  try {
    const factoryRef = doc(db, 'factories', factoryId);
    await updateDoc(factoryRef, {
      [`pickupRoutes.${routeId}.status`]: 'ongoing'
    });
    return true;
  } catch (error) {
    console.error("Error starting pickup:", error);
    throw error;
  }
}

async function updateMaterialStatus(branchId, materialType, newStatus) {
  try {
    const branchRef = doc(db, 'branches', branchId);
    await updateDoc(branchRef, {
      [`materials.${materialType}.status`]: newStatus
    });
    return true;
  } catch (error) {
    console.error("Error updating material status:", error);
    throw error;
  }
}

// New function for updating material availability
async function updateMaterialAvailability(branchId, materialType, isAvailable) {
  try {
    const branchRef = doc(db, 'branches', branchId);
    await updateDoc(branchRef, {
      [`materials.${materialType}.materialAvailability`]: isAvailable ? 'available' : 'unavailable'
    });
    return true;
  } catch (error) {
    console.error("Error updating material availability:", error);
    throw error;
  }
}

async function updateMaterialPickupDay(branchId, materialType, newPickupDay) {
  try {
    const branchRef = doc(db, 'branches', branchId);
    await updateDoc(branchRef, {
      [`materials.${materialType}.pickupDetails.day`]: newPickupDay
    });
    return true;
  } catch (error) {
    console.error("Error updating material pickup day:", error);
    throw error;
  }
}

function calculateNextPickupDate(currentDate, frequency, dayOfWeek, skipDates = []) {
  let nextDate = new Date(currentDate);
  
  switch(frequency) {
    case RECURRING_FREQUENCIES.WEEKLY:
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case RECURRING_FREQUENCIES.BI_WEEKLY:
      nextDate.setDate(nextDate.getDate() + 14);
      break;
    case RECURRING_FREQUENCIES.MONTHLY:
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
  }

  // Check if date should be skipped
  while (skipDates.some(skipDate => 
    new Date(skipDate).toDateString() === nextDate.toDateString())) {
    nextDate.setDate(nextDate.getDate() + 1);
  }

  return nextDate;
}


function getNextMonthlyPickup(pickupDay) {
  const now = new Date();
  let nextPickup = new Date(now.getFullYear(), now.getMonth(), 1); // First day of current month

  const [_, day] = pickupDay.split('_');
  const dayIndex = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(day);

  // Find the first occurrence of the specified day in the month
  while (nextPickup.getDay() !== dayIndex) {
    nextPickup.setDate(nextPickup.getDate() + 1);
  }

  // If this date has already passed, move to next month
  if (nextPickup < now) {
    nextPickup.setMonth(nextPickup.getMonth() + 1);
    nextPickup.setDate(1);
    while (nextPickup.getDay() !== dayIndex) {
      nextPickup.setDate(nextPickup.getDate() + 1);
    }
  }

  return nextPickup;
}

async function setInitialPickupTime(pickupId, timeSlot) {
  if (!pickupId) return null;
  try {
    const pickupRef = doc(db, 'pickups', pickupId);
    const pickupDoc = await getDoc(pickupRef);
    
    if (!pickupDoc.exists()) {
      throw new Error('Pickup not found');
    }
    
    const pickup = pickupDoc.data();
    const batch = writeBatch(db);
    
    // Update pickup document
    batch.update(pickupRef, {
      proposedDate: new Date(timeSlot.date),
      timeSlot: {
        date: timeSlot.date,
        startTime: timeSlot.startTime,
        endTime: timeSlot.endTime
      },
      status: PICKUP_STATUSES.PENDING_BRANCH_APPROVAL,
      approvalStatus: {
        branchApproved: false,
        factoryApproved: true
      },
      // Update all branches status
      branches: pickup.branches.map(branch => ({
        ...branch,
        status: PICKUP_STATUSES.PENDING_BRANCH_APPROVAL
      }))
    });

    // Update branch statuses
    for (const branch of pickup.branches) {
      const branchRef = doc(db, 'branches', branch.branchId);
      batch.update(branchRef, {
        [`materials.${branch.materialType}.status`]: true,  // Keep boolean for map/list view
        status: PICKUP_STATUSES.PENDING_BRANCH_APPROVAL
      });
    }

    await batch.commit();
    return true;
  } catch (error) {
    console.error("Error setting initial pickup time:", error);
    throw error;
  }
}


async function updateBranchStatus(branchId, status, pendingInfo = null) {
  try {
    console.log('Starting updateBranchStatus with:', { branchId, status, pendingInfo });
    
    const branchRef = doc(db, 'branches', branchId);
    const branchDoc = await getDoc(branchRef);
    const branchData = branchDoc.data();
    const materialType = Object.keys(branchData.materials)[0];

    if (pendingInfo) {
      // Add pending info at the same level as status inside materials
      await updateDoc(branchRef, {
        [`materials.${materialType}.status`]: status,
        [`materials.${materialType}.pendingFactoryId`]: pendingInfo.pendingFactoryId,
        [`materials.${materialType}.pendingTimestamp`]: pendingInfo.pendingTimestamp
      });
      
      console.log('Updated with pending info inside materials:', {
        materialType,
        status,
        pendingFactoryId: pendingInfo.pendingFactoryId,
        pendingTimestamp: pendingInfo.pendingTimestamp
      });

      // Verify the update
      const verifyDoc = await getDoc(branchRef);
      console.log('Verification - Updated document:', verifyDoc.data());
    } else {
      await updateDoc(branchRef, {
        [`materials.${materialType}.status`]: status
      });
    }
    
    return true;
  } catch (error) {
    console.error("Error in updateBranchStatus:", error);
    throw error;
  }
}


async function updateRecurringPickupStatus(pickupId, newStatus) {
  try {
    const pickupRef = doc(db, 'pickups', pickupId);
    const pickupDoc = await getDoc(pickupRef);
    
    if (!pickupDoc.exists()) throw new Error('Pickup not found');
    const pickup = pickupDoc.data();
    
    const batch = writeBatch(db);
    
    batch.update(pickupRef, {
      'recurringDetails.status': newStatus,
      'recurringDetails.lastModified': serverTimestamp()
    });

    // Keep branch.materials.status true for map/list view
    for (const branch of pickup.branches) {
      const branchRef = doc(db, 'branches', branch.branchId);
      batch.update(branchRef, {
        [`materials.${branch.materialType}.status`]: true
      });
    }

    await batch.commit();
    return true;
  } catch (error) {
    console.error("Error updating recurring status:", error);
    throw error;
  }
}

async function reBookPickup(previousPickupId) {
  try {
    const pickupRef = doc(db, 'pickups', previousPickupId);
    const pickupDoc = await getDoc(pickupRef);
    
    if (!pickupDoc.exists()) {
      throw new Error('Previous pickup not found');
    }

    const pickupData = pickupDoc.data();

    // Create reuseable branch details
    const reuseableBranchDetails = pickupData.branches.map(branch => ({
      branchId: branch.branchId,
      companyId: branch.companyId,
      materialType: branch.materialType,
      estimatedQuantity: branch.estimatedQuantity || 0,
      frequency: 'one_time',
      status: PICKUP_STATUSES.PENDING_INITIAL_PICKUP,
      approvalStatus: {
        branchApproved: false,
        factoryApproved: true
      },
      name: branch.name || '',
      companyName: branch.companyName || ''
    }));

    // Create new pickup
    const newPickup = {
      factoryId: pickupData.factoryId,
      pickupType: 'one_time',
      status: PICKUP_STATUSES.PENDING_INITIAL_PICKUP,
      createdAt: serverTimestamp(),
      branches: reuseableBranchDetails,
      proposedDate: null,
      confirmedDate: null,
      pickupHistory: [],
      timeSlot: null,
      totalActualWeight: 0,
      approvalStatus: {
        factoryApproved: true
      }
    };

    // Add the pickup
    const pickupsRef = collection(db, 'pickups');
    const docRef = await addDoc(pickupsRef, newPickup);

    // Only update pickup-related info and quantity at correct level
    const batch = writeBatch(db);
    for (const branch of reuseableBranchDetails) {
      const branchRef = doc(db, 'branches', branch.branchId);
      batch.update(branchRef, {
        [`materials.${branch.materialType}.quantity`]: branch.estimatedQuantity || 0,
        [`materials.${branch.materialType}.pickupDetails.pickupId`]: docRef.id,
        [`materials.${branch.materialType}.pickupDetails.day`]: null
      });
    }
    await batch.commit();
    
    return docRef.id;

  } catch (error) {
    console.error("Error in reBookPickup:", error);
    throw error;
  }
}

// Enhanced notification types
const NOTIFICATION_TYPES = {
  NEW_PICKUP_REQUEST: 'new_pickup_request',
  PICKUP_APPROVED: 'pickup_approved',
  PICKUP_REJECTED: 'pickup_rejected',
  PICKUP_STARTED: 'pickup_started',
  PICKUP_COMPLETED: 'pickup_completed',
  PICKUP_CANCELLED: 'pickup_cancelled',
  STATUS_UPDATED: 'status_updated',
  FACTORY_PICKUP_SCHEDULED: 'factory_pickup_scheduled',
  FACTORY_PICKUP_IN_PROGRESS: 'factory_pickup_in_progress',
  FACTORY_PICKUP_COMPLETED: 'factory_pickup_completed'
};

let messaging;
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  messaging = getMessaging(app);
}



async function createNotification(userId, notification) {
  try {
    console.log('Starting createNotification for user:', userId);
    console.log('Notification data:', notification);

    const userNotificationsRef = doc(db, 'notifications', userId);
    const userRef = doc(db, 'users', userId);
    
    // Check if user exists
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      console.error('User document not found:', userId);
      return null;
    }

    const newNotification = {
      id: crypto.randomUUID(),
      ...notification,
      createdAt: new Date().toISOString(), // Changed from serverTimestamp()
      read: false,
      clicked: false,
      actionUrl: `/dashboard/${notification.pickupId || ''}`
    };

    console.log('New notification object:', newNotification);

    // Check if notifications document exists
    const notifDoc = await getDoc(userNotificationsRef);
    
    try {
      if (!notifDoc.exists()) {
        // Create new notifications document with initial array
        console.log('Creating new notifications document');
        await setDoc(userNotificationsRef, {
          notifications: [newNotification]
        });
      } else {
        // Add to existing notifications array
        console.log('Adding to existing notifications array');
        await updateDoc(userNotificationsRef, {
          notifications: arrayUnion(newNotification)
        });
      }
      console.log('Notification saved successfully');

      // Send push notification if enabled
      if (userDoc.data().notificationsEnabled) {
        const token = userDoc.data().notificationToken;
        if (token) {
          try {
            await fetch('/api/sendPushNotification', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                token,
                title: notification.title,
                body: notification.message,
                data: {
                  url: newNotification.actionUrl
                }
              })
            });
            console.log('Push notification sent successfully');
          } catch (pushError) {
            console.error('Error sending push notification:', pushError);
            // Don't throw here - notification was still created in Firestore
          }
        }
      }

      return newNotification;
    } catch (firestoreError) {
      console.error('Firestore operation failed:', firestoreError);
      throw firestoreError;
    }
  } catch (error) {
    console.error("Error in createNotification:", error);
    console.error("Error details:", error.message);
    throw error;
  }
}

// Function to mark notifications as read
async function markNotificationsAsRead(userId, notificationIds) {
  try {
    const notificationsRef = doc(db, 'notifications', userId);
    const notificationsDoc = await getDoc(notificationsRef);
    
    if (!notificationsDoc.exists()) return;

    const notifications = notificationsDoc.data().notifications;
    const updatedNotifications = notifications.map(notif => 
      notificationIds.includes(notif.id) ? { ...notif, read: true } : notif
    );

    await setDoc(notificationsRef, { notifications: updatedNotifications });
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    throw error;
  }
}

// Function to mark notification as clicked
async function markNotificationClicked(userId, notificationId) {
  try {
    const notificationsRef = doc(db, 'notifications', userId);
    const notificationsDoc = await getDoc(notificationsRef);
    
    if (!notificationsDoc.exists()) return;

    const notifications = notificationsDoc.data().notifications;
    const updatedNotifications = notifications.map(notif => 
      notif.id === notificationId ? { ...notif, clicked: true, read: true } : notif
    );

    await setDoc(notificationsRef, { notifications: updatedNotifications });
  } catch (error) {
    console.error("Error marking notification as clicked:", error);
    throw error;
  }
}


// automatically enable notifications
// Keep the existing function for the button
const requestNotificationPermission = async (userId) => {
  if (typeof window === 'undefined') return false;
  
  try {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted' && messaging) {
      const token = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
      });
      
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        notificationToken: token,
        notificationsEnabled: true
      });
      
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
}

// Add new function for automatic prompt
const requestInitialNotificationPermission = async () => {
  try {
    // Check if we've already asked before using localStorage
    const hasAskedPermission = localStorage.getItem('hasAskedNotificationPermission');
    
    if (!hasAskedPermission && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      localStorage.setItem('hasAskedNotificationPermission', 'true');
      
      if (permission === 'granted' && auth.currentUser) {
        const token = await getToken(messaging, {
          vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
        });
        
        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
          notificationToken: token,
          notificationsEnabled: true
        });
      }
      
      return permission === 'granted';
    }
    return Notification.permission === 'granted';
  } catch (error) {
    console.error('Error requesting initial notification permission:', error);
    return false;
  }
};

export { 
  auth, 
  db, 
  storage, 
  updateUserProfile, 
  getUserData, 
  registerBranch, 
  getUserBranches, 
  declareMaterial, 
  updateMaterialQuantity,
  getAvailableMaterials,
  addToPickupRoute,
  startPickup,
  completePickup,
  updateMaterialStatus,
  updateMaterialAvailability,
  updateMaterialPickupDay,
  setInitialPickupTime,
  PICKUP_STATUSES,
  hasSuccessfulPickup,
  updatePickupApproval,
  updateBranchStatus,
  RECURRING_FREQUENCIES,
  RECURRING_STATUS,
  updateRecurringPickupStatus,
  calculateNextPickupDate,
  reBookPickup,
  NOTIFICATION_TYPES,
  requestNotificationPermission,
  requestInitialNotificationPermission,
  markNotificationsAsRead,
  markNotificationClicked,
  createNotification
};

