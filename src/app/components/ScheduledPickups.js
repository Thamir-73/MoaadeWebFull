import { useState, useEffect } from 'react';
import { FaCalendarTimes, FaCalendarAlt, FaSpinner, FaHistory, FaSync, FaCalendarWeek } from 'react-icons/fa';
import { getDoc, doc, updateDoc } from 'firebase/firestore';
import { db, PICKUP_STATUSES } from '@/app/utils/firebase';
import { translateMaterialType } from '../utils/helpers';
import { reBookPickup, addToPickupRoute } from '@/app/utils/firebase';
import BottomSheet from './BottomSheet';

const StatusBadge = ({ pickup, isRTL }) => {
  const branchStatus = pickup.branches?.find(b => b.branchId === pickup.branchId)?.status;
  
  const statusConfig = {
    'scheduled': {
      color: 'bg-yellow-100 text-yellow-800',
      text: { ar: 'في انتظار الجمع', en: 'To Be Picked Up' }
    },
    'in_progress': {
      color: 'bg-blue-100 text-blue-800',
      text: { ar: 'جاري الجمع', en: 'In Progress' }
    },
    'completed': {
      color: 'bg-green-100 text-green-800',
      text: { ar: 'تم الجمع', en: 'Picked Up' }
    }
  };

  const config = statusConfig[branchStatus] || statusConfig['scheduled'];
  return (
    <span className={`${config.color} px-3 py-1 rounded-full text-sm font-medium`}>
      {config.text[isRTL ? 'ar' : 'en']}
    </span>
  );
};

export default function ScheduledPickups({ pickups, onComplete, text, isRTL, language, companyNames, user, fetchPickups }) {
  // Group all hooks at the top
  const [activeSubTab, setActiveSubTab] = useState('current');
  const [enrichedPickups, setEnrichedPickups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [selectedPickup, setSelectedPickup] = useState(null);
  const [weight, setWeight] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;
  const [selectedCompanyPickups, setSelectedCompanyPickups] = useState([]);
  const [isRebooking, setIsRebooking] = useState(false);
  const [rebookingId, setRebookingId] = useState(null);
  const [feedback, setFeedback] = useState({ show: false, message: '', type: '' });
  const [showTimeSheet, setShowTimeSheet] = useState(false);
  const [selectedRebookPickup, setSelectedRebookPickup] = useState(null);
  const [selectedBranches, setSelectedBranches] = useState([]);
  const [branchesWithNames, setBranchesWithNames] = useState([]);

  // Data enrichment effect
  useEffect(() => {
    const enrichPickupsData = async () => {
      setIsLoading(true);
      const enrichedData = await Promise.all(pickups.map(async (pickup) => {
        try {
          const branchDoc = await getDoc(doc(db, 'branches', pickup.branchId));
          const branchData = branchDoc.exists() ? branchDoc.data() : null;

          const userDoc = await getDoc(doc(db, 'users', branchData?.userId));
          const userData = userDoc.exists() ? userDoc.data() : null;

          return {
            ...pickup,
            branchName: branchData?.name || text.unknownBranch,
            companyName: userData?.name || text.unknownCompany,
            translatedMaterialType: translateMaterialType(pickup.materialType, language)
          };
        } catch (error) {
          console.error("Error enriching pickup data:", error);
          return pickup;
        }
      }));

      setEnrichedPickups(enrichedData);
      setIsLoading(false);
    };

    enrichPickupsData();
  }, [pickups, language]);

  // Reset page when tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeSubTab]);

  const formatDate = (dateString) => {
    try {
      if (!dateString) return '';
      const [year, month, day] = dateString.split('-');
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return dateString;
    }
  };

  // Group pickups by company
  const groupPickupsByCompany = (pickups) => {
    return pickups.reduce((acc, pickup) => {
      const companyId = pickup.companyId;
      if (!acc[companyId]) {
        acc[companyId] = [];
      }
      acc[companyId].push(pickup);
      return acc;
    }, {});
  };

  const handlePickupClick = (pickup) => {
    setSelectedPickup(pickup);
    setShowWeightModal(true);
  };

  const WeightModal = () => {
    // Local state to prevent re-renders
    const [localBranches, setLocalBranches] = useState([]);
    const [localWeight, setLocalWeight] = useState('');
    const [localSelected, setLocalSelected] = useState(new Set());

    // One-time initialization
    useEffect(() => {
      const initializeModal = async () => {
        if (selectedPickup) {
          const branchNames = await Promise.all(
            selectedPickup.branches.map(async (branch) => {
              const branchDoc = await getDoc(doc(db, 'branches', branch.branchId));
              return {
                ...branch,
                branchName: branchDoc.data()?.name || 'Unknown Branch'
              };
            })
          );
          setLocalBranches(branchNames);
          // Initialize with all branches selected
          setLocalSelected(new Set(selectedPickup.branches.map(b => b.branchId)));
        }
      };
      initializeModal();
    }, []); // Empty dependency array - run once only

    const toggleBranch = (branchId) => {
      setLocalSelected(prev => {
        const newSet = new Set(prev);
        if (newSet.has(branchId)) {
          newSet.delete(branchId);
        } else {
          newSet.add(branchId);
        }
        return newSet;
      });
    };

    const handleSubmit = async () => {
      try {
        const weightNum = Number(localWeight);
        if (!localWeight || isNaN(weightNum) || weightNum <= 0) {
          alert(text.enterValidWeight);
          return;
        }

        if (localSelected.size === 0) {
          alert(text.selectAtLeastOneBranch);
          return;
        }

        // Get the pickup document reference
        const pickupRef = doc(db, 'pickups', selectedPickup.id);
        
        // Update the pickup document
        await updateDoc(pickupRef, {
          // Update total weight at root level only
          totalActualWeight: weightNum,
          // Update status for selected branches without individual weights
          branches: selectedPickup.branches.map(branch => ({
            ...branch,
            status: localSelected.has(branch.branchId) 
              ? PICKUP_STATUSES.COMPLETED 
              : branch.status
          }))
        });

        // Call the original onComplete handler
        await onComplete(selectedPickup.id, weightNum, Array.from(localSelected));
        
        setShowWeightModal(false);
        setWeight('');
        setSelectedPickup(null);
        setBranchesWithNames([]);
        setSelectedBranches([]);
        fetchPickups();
      } catch (error) {
        console.error("Error completing pickup:", error);
        alert(error.message || text.errorCompletingPickup);
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={(e) => e.stopPropagation()}>
        <div className="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full mx-4 relative" onClick={(e) => e.stopPropagation()}>
          {/* Close button */}
          <button 
            onClick={() => setShowWeightModal(false)}
            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>

          <h3 className="text-lg font-bold mb-4">{text.enterTotalWeight}</h3>

          <div className="space-y-4">
            {/* Branches list */}
            <div className="mb-4">
              <p className="text-gray-600 mb-2">{text.includedBranches}:</p>
              {localBranches.map((branch) => (
                <div key={branch.branchId} className="ml-4 mb-2 flex items-center gap-3">
                  <input
                    type="checkbox"
                    id={`branch-${branch.branchId}`}
                    checked={localSelected.has(branch.branchId)}
                    onChange={() => toggleBranch(branch.branchId)}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded cursor-pointer"
                  />
                  <label htmlFor={`branch-${branch.branchId}`} className="font-medium cursor-pointer">
                    {branch.branchName}
                  </label>
                </div>
              ))}
            </div>

            {/* Weight input */}
            <div>
              <label className="block text-gray-700 mb-2">
                {text.enterTotalWeightLabel}
              </label>
              <input
                type="text"
                value={localWeight}
                onChange={(e) => setLocalWeight(e.target.value)}
                className="w-full p-2 border rounded"
                placeholder={text.weightInKg}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => setShowWeightModal(false)}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
            >
              {text.cancel}
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              {text.complete}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const showFeedback = (message, type = 'success') => {
    setFeedback({ show: true, message, type });
    setTimeout(() => {
      setFeedback({ show: false, message: '', type: '' });
    }, 3000);
  };

  const handleReBook = (pickup) => {
    if (!pickup) return;
    setSelectedRebookPickup({
      ...pickup,
      id: pickup.id,
      branchId: pickup.branchId,
      companyId: pickup.companyId,
      materialType: pickup.materialType,
      estimatedQuantity: pickup.estimatedQuantity
    });
    setShowTimeSheet(true);
  };

  const handleTimeSubmit = async (timeSlot) => {
    if (!selectedRebookPickup || !timeSlot) return;
    
    try {
      setIsRebooking(true);
      setRebookingId(selectedRebookPickup.id);

      // Create single material object
      const material = {
        branchId: selectedRebookPickup.branchId,
        companyId: selectedRebookPickup.companyId,
        materialType: selectedRebookPickup.materialType,
        quantity: selectedRebookPickup.estimatedQuantity,
        frequency: 'one_time'
      };

      await addToPickupRoute(user.uid, [material], 'one_time', timeSlot);
      await fetchPickups();
      
      setShowTimeSheet(false);
      showFeedback(isRTL 
        ? 'تم إعادة حجز الرحلة بنجاح' 
        : 'Pickup successfully rebooked'
      );
    } catch (error) {
      console.error("Error rebooking:", error);
      showFeedback(isRTL 
        ? `حدث خطأ أثناء إعادة الحجز: ${error.message}`
        : `Error rebooking pickup: ${error.message}`,
        'error'
      );
    } finally {
      setIsRebooking(false);
      setRebookingId(null);
      setSelectedRebookPickup(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <FaSpinner className="animate-spin text-blue-500 text-3xl" />
      </div>
    );
  }

  // Pagination helper
  const paginate = (items) => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return items.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  };

  // Filter pickups based on branch status
  const currentPickups = enrichedPickups.filter(p => {
    const branchStatus = p.branches?.find(b => b.branchId === p.branchId)?.status;
    return branchStatus === 'scheduled' || branchStatus === 'in_progress';
  });

  const historicalPickups = enrichedPickups.filter(p => {
    const branchStatus = p.branches?.find(b => b.branchId === p.branchId)?.status;
    return branchStatus === 'completed';
  });

  const currentPageItems = paginate(
    activeSubTab === 'current' ? currentPickups : historicalPickups
  );

  const totalPages = Math.ceil(
    (activeSubTab === 'current' ? currentPickups.length : historicalPickups.length) 
    / ITEMS_PER_PAGE
  );

  return (
    <div className={`space-y-4 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Modified Sub-tabs */}
      <div className="flex space-x-4 mb-6 border-b">
        <button
          className={`px-4 py-2 ${activeSubTab === 'current' 
            ? 'border-b-2 border-blue-500 text-blue-600' 
            : 'text-gray-500'}`}
          onClick={() => setActiveSubTab('current')}
        >
          <FaCalendarAlt className="inline ml-2" />
          {text.currentPickups}
        </button>
        <button
          className={`px-4 py-2 ${activeSubTab === 'history' 
            ? 'border-b-2 border-blue-500 text-blue-600' 
            : 'text-gray-500'}`}
          onClick={() => setActiveSubTab('history')}
        >
          <FaHistory className="inline ml-2" />
          {text.pickupHistory}
        </button>
        <button
          className={`px-4 py-2 ${activeSubTab === 'recurring' 
            ? 'border-b-2 border-blue-500 text-blue-600' 
            : 'text-gray-500'}`}
          onClick={() => setActiveSubTab('recurring')}
        >
          <FaCalendarWeek className="inline ml-2" />
          {isRTL ? 'التجميع المتكرر' : 'Recurring Pickups'}
        </button>
      </div>

      {/* Content based on active tab */}
      {activeSubTab === 'current' && (
        // Keep existing current pickups view
        <div className="space-y-4">
          {currentPageItems.map((pickup) => (
            <div key={pickup.id} 
              className="bg-white border-2 border-blue-300 p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
            >
              {/* Header with Branch Name and Status */}
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-bold text-lg text-blue-900">
                  {pickup.branchName}
                </h3>
                <StatusBadge pickup={pickup} isRTL={isRTL} />        
              </div>
              
              {/* Company Name */}
              <p className="text-gray-600 mb-4">
                {pickup.companyName}
              </p>
              
              <div className="space-y-3">
                {/* Pickup Date */}
                <div className="flex gap-2">
                  <FaCalendarAlt className={`text-gray-500 mt-1 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                  <div>
                    <span className="text-gray-600">{text.pickupDate}: </span>
                    <span className="font-medium">{pickup.timeSlot?.date}</span>
                  </div>
                </div>

                {/* Time Slot */}
                <div className="flex gap-2">
                  <span className="text-gray-600">{text.timeSlot}: </span>
                  <span className="font-medium">
                    {pickup.timeSlot?.startTime} - {pickup.timeSlot?.endTime}
                  </span>
                </div>

                {/* Material Type & Quantity */}
                <div className="flex gap-2">
                  <span className="text-gray-600">{text.materialType}: </span>
                  <span className="font-medium">{pickup.translatedMaterialType}</span>
                </div>
                
                <div className="flex gap-2">
                  <span className="text-gray-600">{text.estimatedQuantity}: </span>
                  <span className="font-medium">{pickup.estimatedQuantity} {text.kg}</span>
                </div>
              </div>

              {/* Add Complete Button for in-progress pickups */}
              {pickup.branches?.find(b => b.branchId === pickup.branchId)?.status === 'in_progress' && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handlePickupClick(pickup)}
                    className="w-full bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 transition-colors"
                  >
                    {text.completePickup}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {activeSubTab === 'recurring' && (
        <div className="text-center py-10">
          <FaCalendarWeek className="mx-auto text-gray-400 text-5xl mb-4" />
          <p className="text-gray-700 font-medium text-lg mb-2">
            {isRTL 
              ? 'لا يوجد جدول تجميع متكرر حالياً' 
              : 'No recurring pickups scheduled yet'}
          </p>
          <p className="text-gray-500 text-sm">
            {isRTL 
              ? 'سيظهر هنا جدول التجميع المتكرر بمجرد إضافته' 
              : 'Recurring pickup schedules will appear here once added'}
          </p>
        </div>
      )}

      {activeSubTab === 'history' && (
        // Keep existing history view
        <div className="space-y-4">
          {historicalPickups.map((pickup) => (
            <div key={pickup.id} className="bg-white border-2 border-blue-300 p-6 rounded-lg shadow-md">
              {/* Header with Branch Name and Status */}
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-bold text-lg text-blue-900">
                  {pickup.branchName}
                </h3>
                <StatusBadge pickup={pickup} isRTL={isRTL} />        
              </div>
              
              {/* Company Name */}
              <p className="text-gray-600 mb-4">
                {pickup.companyName}
              </p>
              
              <div className="space-y-3">
                {/* Pickup Date */}
                <div className="flex gap-2">
                  <FaCalendarAlt className={`text-gray-500 mt-1 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                  <div>
                    <span className="text-gray-600">{text.pickupDate}: </span>
                    <span className="font-medium">{pickup.timeSlot?.date}</span>
                  </div>
                </div>

                {/* Time Slot */}
                <div className="flex gap-2">
                  <span className="text-gray-600">{text.timeSlot}: </span>
                  <span className="font-medium">
                    {pickup.timeSlot?.startTime} - {pickup.timeSlot?.endTime}
                  </span>
                </div>

                {/* Material Type & Quantity */}
                <div className="flex gap-2">
                  <span className="text-gray-600">{text.materialType}: </span>
                  <span className="font-medium">{pickup.translatedMaterialType}</span>
                </div>
                
                <div className="flex gap-2">
                  <span className="text-gray-600">{text.estimatedQuantity}: </span>
                  <span className="font-medium">{pickup.estimatedQuantity} {text.kg}</span>
                </div>
              </div>

              {/* Modified Rebook button with loading state */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleReBook(pickup)}
                  disabled={isRebooking}
                  className={`w-full py-2 px-4 rounded transition-colors flex items-center justify-center
                    ${isRebooking && pickup.id === rebookingId
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-500 hover:bg-blue-600'} 
                    text-white`}
                >
                  {isRebooking && pickup.id === rebookingId ? (
                    <>
                      <FaSpinner className="animate-spin mr-2" />
                      {isRTL ? 'جاري إعادة الحجز...' : 'Rebooking...'}
                    </>
                  ) : (
                    <>{isRTL ? 'حجز رحلة مماثلة' : 'Book Similar Pickup'}</>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className={`flex ${isRTL ? 'flex-row-reverse' : ''} justify-center gap-2 mt-6`}>
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className={`px-3 py-1 rounded border ${
              currentPage === 1 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-white text-blue-500 hover:bg-blue-50'
            }`}
          >
            {isRTL ? '→' : '←'}
          </button>
          
          <span className="px-4 py-1">
            {text.page} {currentPage} {text.of} {totalPages}
          </span>
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className={`px-3 py-1 rounded border ${
              currentPage === totalPages 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-white text-blue-500 hover:bg-blue-50'
            }`}
          >
            {isRTL ? '←' : '→'}
          </button>
        </div>
      )}

      {/* Show message when no pickups */}
      {currentPageItems.length === 0 && (
        <div className="text-center py-10">
          <FaCalendarTimes className="mx-auto text-gray-400 text-5xl mb-4" />
          <p className="text-gray-700 font-medium text-lg mb-2">
            {activeSubTab === 'current' 
              ? text.noScheduledPickups 
              : text.noHistoricalPickups}
          </p>
        </div>
      )}

      {/* Weight Input Modal */}
      {showWeightModal && <WeightModal />}

      {/* Feedback Toast */}
      {feedback.show && (
        <div 
          className={`fixed bottom-4 right-4 py-2 px-4 rounded-lg shadow-lg transition-opacity
            ${feedback.type === 'error' ? 'bg-red-500' : 'bg-green-500'} 
            text-white z-50`}
        >
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            {feedback.type === 'error' ? (
              <span>⚠️</span>
            ) : (
              <span>✓</span>
            )}
            <span>{feedback.message}</span>
          </div>
        </div>
      )}

      {/* Add Time Selection Sheet */}
      {showTimeSheet && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <BottomSheet
            selectedBranches={[selectedRebookPickup]}
            onAddBranches={handleTimeSubmit}
            onClose={() => {
              setShowTimeSheet(false);
              setSelectedRebookPickup(null);
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

