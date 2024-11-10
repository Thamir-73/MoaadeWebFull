import { useState, useEffect } from 'react';
import { FaBoxOpen, FaCalendarAlt, FaSpinner } from 'react-icons/fa';
import BottomSheet from './BottomSheet';
import { translateMaterialType } from '../utils/helpers';
import { doc, getDoc } from 'firebase/firestore';
import { db, PICKUP_STATUSES, updatePickupApproval,updateBranchStatus, addToPickupRoute  } from '@/app/utils/firebase';

// Helper function to extract district from address
const extractDistrict = (address) => {
  if (!address) return '';
  
  // Split by commas and try to find district
  const parts = address.split(',');
  // Usually district is the third part (after street number and name)
  const district = parts[2]?.trim();
  return district || '';
};

const StatusBadge = ({ status, isRTL }) => {
  const statusConfig = {
    [PICKUP_STATUSES.PENDING_BRANCH_APPROVAL]: {
      color: 'bg-yellow-100 text-yellow-800',
      text: { ar: 'في انتظار موافقة الفرع', en: 'Pending Branch Approval' }
    },
    [PICKUP_STATUSES.PENDING_INITIAL_PICKUP]: {
      color: 'bg-blue-100 text-blue-800',
      text: { ar: 'في انتظار تحديد موعد', en: 'Pending Time Selection' }
    },
    [PICKUP_STATUSES.SCHEDULED]: {
      color: 'bg-green-100 text-green-800',
      text: { ar: 'تم الجدولة', en: 'Scheduled' }
    }
  };

  const config = statusConfig[status] || statusConfig[PICKUP_STATUSES.PENDING_INITIAL_PICKUP];
  return (
    <span className={`${config.color} px-3 py-1 rounded-full text-sm font-medium`}>
      {config.text[isRTL ? 'ar' : 'en']}
    </span>
  );
};

export default function PendingInitialPickups({ pickups, onSetInitialTime, text, isRTL, language, user, fetchPickups  }) {
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [selectedPickup, setSelectedPickup] = useState(null);
  const [enrichedPickups, setEnrichedPickups] = useState([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => {
    const enrichPickupsData = async () => {
      if (isInitialLoad) {
        const enrichedData = await Promise.all(pickups.map(async (pickup) => {
          try {
            const branchDoc = await getDoc(doc(db, 'branches', pickup.branchId));
            const branchData = branchDoc.exists() ? branchDoc.data() : null;
            const userDoc = await getDoc(doc(db, 'users', branchData.userId));
            const userData = userDoc.exists() ? userDoc.data() : null;

            return {
              ...pickup,
              branchName: branchData?.name || text.unknownBranch,
              companyName: userData?.name || text.unknownCompany,
              district: extractDistrict(branchData?.locationAddress),
              translatedMaterialType: translateMaterialType(pickup.materialType, language)
            };
          } catch (error) {
            console.error("Error enriching pickup data:", error);
            return pickup;
          }
        }));

        setEnrichedPickups(enrichedData);
        setIsInitialLoad(false);
      }
    };

    enrichPickupsData();
  }, [pickups, isInitialLoad]);

  if (isInitialLoad && pickups.length > 0) {
    return (
      <div className="flex justify-center items-center py-20">
        <FaSpinner className="animate-spin text-blue-500 text-3xl" />
      </div>
    );
  }

  const handleSetTime = (pickup) => {
    setSelectedPickup(pickup);
    setShowBottomSheet(true);
  };
  

  const handleTimeSubmit = async (timeSlot) => {
    if (selectedPickup && timeSlot) {
      try {
        console.log("Setting time for pickup:", selectedPickup, "with timeSlot:", timeSlot);
        
        // Check if this is a branch or a pickup
        if (selectedPickup.id.startsWith('branch_')) {
          // For branches that were added via "Schedule Later"
          const material = {
            branchId: selectedPickup.branchId,
            companyId: selectedPickup.companyId,
            materialType: selectedPickup.materialType,
            quantity: selectedPickup.estimatedQuantity,
            frequency: selectedPickup.frequency || 'one_time'
          };

          // Create a new pickup with the single branch
          await addToPickupRoute(user.uid, [material], 'one_time', timeSlot);
          await updateBranchStatus(selectedPickup.branchId, 'pending_branch_approval');
        } else {
          // For existing pickups, update the pickup time
          const materials = selectedPickup.branches.map(branch => ({
            branchId: branch.branchId,
            companyId: branch.companyId,
            materialType: branch.materialType,
            quantity: branch.estimatedQuantity,
            frequency: branch.frequency || 'one_time'
          }));

          // Create a new pickup with all branches
          await addToPickupRoute(user.uid, materials, 'one_time', timeSlot);
          
          // Update all branch statuses
          await Promise.all(
            materials.map(material => 
              updateBranchStatus(material.branchId, 'pending_branch_approval')
            )
          );
        }

        // Show success feedback
        setShowBottomSheet(false);
        setSelectedPickup(null);
        setFeedbackMessage(text.pickupScheduledSuccess);
        setShowFeedback(true);
        
        // Hide feedback after 3 seconds
        setTimeout(() => {
          setShowFeedback(false);
          setFeedbackMessage('');
          if (typeof fetchPickups === 'function') {
            fetchPickups(); // Only call if available
          }
        }, 3000);
        
      } catch (error) {
        console.error("Error setting pickup time:", error);
        setFeedbackMessage(text.errorSettingTime);
        setShowFeedback(true);
        setTimeout(() => {
          setShowFeedback(false);
          setFeedbackMessage('');
        }, 3000);
      }
    }
  };


  if (enrichedPickups.length === 0) {
    return (
      <div className="text-center py-10">
        <FaBoxOpen className="mx-auto text-gray-400 text-5xl mb-4" />
        <p className="text-gray-700 font-medium text-lg mb-2">{text.noPendingPickups}</p>
        <p className="text-gray-500 text-sm">{text.checkBackLater}</p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <h2 className="text-xl font-bold mb-4">{text.pendingInitialPickups}</h2>
      
      {enrichedPickups.map((pickup) => (
        <div key={pickup.id} 
          className="bg-white border-2 border-blue-300 p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
          {/* Add Status Badge */}
          <div className="flex justify-between items-start mb-4">
            <h3 className="font-bold text-lg text-blue-900">
              {pickup.branchName}
            </h3>
            <StatusBadge status={pickup.status} isRTL={isRTL} />
          </div>
          
          {/* Company Name */}
          <p className="text-gray-600 mb-4">
            {pickup.companyName}
          </p>
          
          <div className="space-y-3">
            {/* Material Type */}
            <div className="flex gap-2">
              <span className="text-gray-600">{text.materialType}:</span>
              <span className="font-medium">{pickup.translatedMaterialType}</span>
            </div>

            {/* Estimated Quantity - Only show if > 0 */}
            {pickup.estimatedQuantity > 0 && (
              <div className="flex gap-2">
                <span className="text-gray-600">{text.estimatedQuantity}:</span>
                <span className="font-medium">{pickup.estimatedQuantity} {text.kg}</span>
              </div>
            )}

            {/* District */}
            {pickup.district && (
              <div className="flex gap-2">
                <span className="text-gray-600">{text.district}:</span>
                <span className="font-medium">{pickup.district}</span>
              </div>
            )}
          </div>

          {/* Only show Set Time button if status is pending initial pickup */}
          {pickup.status === PICKUP_STATUSES.PENDING_INITIAL_PICKUP && (
            <button
              onClick={() => handleSetTime(pickup)}
              className="w-full mt-6 bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg
                font-medium transition-colors flex items-center justify-center space-x-2 rtl:space-x-reverse"
            >
              <FaCalendarAlt className={isRTL ? 'ml-2' : 'mr-2'} />
              <span>{text.setInitialTime}</span>
            </button>
          )}
        </div>
      ))}

      {/* Success/Error Feedback */}
      {showFeedback && (
        <div className="fixed inset-x-0 bottom-0 mb-4 mx-auto w-max z-50">
          <div className={`px-6 py-3 rounded-lg shadow-lg ${
            feedbackMessage === text.pickupScheduledSuccess 
              ? 'bg-green-500 text-white' 
              : 'bg-red-500 text-white'
          }`}>
            <p className="flex items-center">
              {feedbackMessage === text.pickupScheduledSuccess ? (
                <span className="mr-2">✓</span>
              ) : (
                <span className="mr-2">⚠</span>
              )}
              {feedbackMessage}
            </p>
          </div>
        </div>
      )}

      {showBottomSheet && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <BottomSheet
            selectedBranches={[selectedPickup]}
            onAddBranches={handleTimeSubmit}
            onClose={() => {
              setShowBottomSheet(false);
              setSelectedPickup(null);
            }}
            text={text}
            isRTL={isRTL}
            isPendingPickup={true}
          />
        </div>
      )}
    </div>
  );
}

