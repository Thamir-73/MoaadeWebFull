'use client'

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useLanguage } from '@/app/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import { FaSearch, FaBars, FaPlus, FaCalendarAlt, FaBoxOpen, FaCalendarTimes } from 'react-icons/fa';
import { useLoadScript } from '@react-google-maps/api';
import MapListView from '../components/MapListView';
import PendingInitialPickups from '../components/PendingInitialPickups';
import ScheduledPickups from '../components/ScheduledPickups';
import VerticalMenu from '../components/VerticalMenu';
import { getAvailableMaterials, addToPickupRoute, setInitialPickupTime, completePickup, getUserData } from '@/app/utils/firebase';
import { collection, query, where, getDocs, onSnapshot, doc } from 'firebase/firestore';
import { db } from '@/app/utils/firebase';
import { PICKUP_STATUSES } from '@/app/utils/firebase';
import NotificationsList from '../components/NotificationsList';

export default function FactoryDashboard() {
  const { user, userName, refreshUserData } = useAuth();
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedTab = localStorage.getItem('factoryDashboardTab');
      const lastVisitTime = localStorage.getItem('lastVisitTime');
      const ONE_HOUR = 60 * 60 * 1000; // 1 hour in milliseconds
      
      if (savedTab && lastVisitTime && (Date.now() - parseInt(lastVisitTime)) < ONE_HOUR) {
        return savedTab;
      }
    }
    return 'map';
  });
  const [pendingInitialPickups, setPendingInitialPickups] = useState([]);
  const [scheduledPickups, setScheduledPickups] = useState([]);
  const [isMobile, setIsMobile] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [branches, setBranches] = useState([]);
  const [factoryMaterialType, setFactoryMaterialType] = useState(null);
  const [companyNames, setCompanyNames] = useState({});
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const visitedTabs = useRef(new Set());
  const [unreadCount, setUnreadCount] = useState(0);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [hasInitialData, setHasInitialData] = useState(false);
  const [isActiveFetch, setIsActiveFetch] = useState(false);





  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    libraries: ['places'],
  });

// Update the main Firebase listener useEffect
useEffect(() => {
  if (!user?.uid) return;
  
  console.log("Setting up Firebase listeners");
  
  const pickupsRef = collection(db, 'pickups');
  const pickupsQuery = query(pickupsRef, where("factoryId", "==", user.uid));
  
  const unsubscribePickups = onSnapshot(pickupsQuery, (snapshot) => {
    const changesAffectData = snapshot.docChanges().some(change => 
      change.type === 'added' || change.type === 'modified' || change.type === 'removed'
    );
    
    if (changesAffectData) {
      console.log("Pickup changes detected in Firebase, updating data");
      fetchPickups(false); // Pass false since this is an update
    }
  });

  // Listen for branch changes
  const branchesRef = collection(db, 'branches');
  const unsubscribeBranches = onSnapshot(branchesRef, (snapshot) => {
    const changesAffectData = snapshot.docChanges().some(change => 
      change.type === 'added' || change.type === 'modified' || change.type === 'removed'
    );
    
    if (changesAffectData) {
      console.log("Branch changes detected in Firebase, updating data");
      fetchPickups(false); // Pass false since this is an update
    }
  });

  // Initial data fetch
  fetchUserData();
  fetchPickups(true); // Pass true for initial fetch

  return () => {
    unsubscribePickups();
    unsubscribeBranches();
  };
}, [user?.uid]);


// Notifications useEffect - keep as is since it's already optimized
useEffect(() => {
  if (!user?.uid) return;

  const notificationsRef = doc(db, 'notifications', user.uid);
  const unsubscribe = onSnapshot(notificationsRef, (doc) => {
    if (doc.exists()) {
      const notifications = doc.data().notifications || [];
      const unreadCount = notifications.filter(n => !n.read).length;
      setUnreadCount(unreadCount);
    }
  });

  return () => unsubscribe();
}, [user?.uid]);

// Company names useEffect - optimize to prevent unnecessary calls
useEffect(() => {
  const shouldFetchCompanyNames = branches.length > 0 && 
    Object.keys(companyNames).length !== branches.length;
    
  if (shouldFetchCompanyNames) {
    fetchCompanyNames();
  }
}, [branches, companyNames]); // Add companyNames to dependencies

// Add new useEffect for tab persistence
useEffect(() => {
  if (activeTab) {
    localStorage.setItem('factoryDashboardTab', activeTab);
    localStorage.setItem('lastVisitTime', Date.now().toString());
  }
}, [activeTab]);



  const fetchUserData = async () => {
    try {
      const userData = await getUserData(user.uid);
      console.log("Fetched user data:", userData);
      if (userData && userData.materialType) {
        console.log("Setting factory material type:", userData.materialType);
        setFactoryMaterialType(userData.materialType);
        fetchAvailableMaterials(userData.materialType);
      } else {
        console.error("User data or material type is missing");
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  const fetchPickups = async (isInitialFetch = false) => {
  // Only show loading on initial fetch or when Firebase triggers an update
  if (isInitialFetch || !hasInitialData) {
    setIsActiveFetch(true);
    setIsDataLoading(true);
  }
      try {
      const pending = [];
      const scheduled = [];

      const pickupsRef = collection(db, 'pickups');
      const q = query(pickupsRef, where("factoryId", "==", user.uid));
      const querySnapshot = await getDocs(q);
      
      querySnapshot.forEach((doc) => {
        const pickup = { id: doc.id, ...doc.data() };
        
        // Process each branch in the pickup
        pickup.branches.forEach(branch => {
          const pickupData = {
            ...pickup,
            id: pickup.id,
            branchId: branch.branchId,
            companyId: branch.companyId,
            materialType: branch.materialType,
            estimatedQuantity: branch.estimatedQuantity,
            name: branch.name,
            companyName: branch.companyName
          };

          // Branch goes to Scheduled if:
          // 1. Branch is approved AND
          // 2. Pickup has timeSlot
          if (branch.approvalStatus.branchApproved && pickup.timeSlot) {
            scheduled.push({
              ...pickupData,
              status: PICKUP_STATUSES.SCHEDULED
            });
          } 
          // Branch goes to Pending if not approved or no timeSlot
          else {
            pending.push({
              ...pickupData,
              status: !pickup.timeSlot ? 
                PICKUP_STATUSES.PENDING_INITIAL_PICKUP : 
                PICKUP_STATUSES.PENDING_BRANCH_APPROVAL
            });
          }
        });
      });

      // Check branches collection for new pending pickups
      const branchesRef = collection(db, 'branches');
      const branchesSnapshot = await getDocs(branchesRef);
      
      branchesSnapshot.forEach((doc) => {
        const branch = { id: doc.id, ...doc.data() };
        Object.entries(branch.materials || {}).forEach(([materialType, material]) => {
          if (material.status === 'pending_initial_pickup') {
            pending.push({
              id: `branch_${doc.id}`,
              branchId: doc.id,
              companyId: branch.userId,
              materialType: materialType,
              estimatedQuantity: material.quantity,
              status: PICKUP_STATUSES.PENDING_INITIAL_PICKUP,
              name: branch.name,
              location: branch.location,
              locationAddress: branch.locationAddress
            });
          }
        });
      });

      setPendingInitialPickups(pending);
      setScheduledPickups(scheduled);
      setHasInitialData(true);
    } catch (error) {
      console.error("Error fetching pickups:", error);
    } finally {
      setIsActiveFetch(false);
      setIsDataLoading(false);
    }
  };


  const fetchAvailableMaterials = async (materialType) => {
    try {
      console.log("Fetching available materials for material type:", materialType);
      const materials = await getAvailableMaterials(materialType);
      console.log("Fetched materials:", materials);
      setBranches(materials);
    } catch (error) {
      console.error("Error fetching available materials:", error);
    }
  };


  const handleAddToRoute = async (branch, timeSlot = null, navigateToTab = null, forceRefresh = false, successMessage = null) => {
    try {
      if (navigateToTab) {
        setActiveTab(navigateToTab);
        return;
      }
  
      if (forceRefresh) {
        // Set feedback message BEFORE updating data
        if (successMessage) {
          setFeedbackMessage(successMessage);
          setTimeout(() => {
            setFeedbackMessage('');
          }, 5000);
        }

        // Then update the data
        await fetchPickups(false);
        await fetchAvailableMaterials(factoryMaterialType);
        return;
      }

      console.log("Adding to route:", { branch, timeSlot });
      
      // First update branch status
      await updateBranchStatus(branch.id, 'pending_initial_pickup');
      console.log("Branch status updated");

      // Then add to pickup route
      if (timeSlot) {
        // Scheduled pickup
        await addToPickupRoute(user.uid, branch, 'one_time', timeSlot);
        setFeedbackMessage(text[language].scheduledPickupAdded);
      } else {
        // Pending pickup
        await addToPickupRoute(user.uid, branch, 'one_time');
        setFeedbackMessage(text[language].pendingPickupAdded);
      }
      
      // Immediately refresh available materials before fetching pickups
      await fetchAvailableMaterials(factoryMaterialType);
      await fetchPickups();
      
      // Clear feedback after 3 seconds
      setTimeout(() => setFeedbackMessage(''), 3000);

    } catch (error) {
      console.error("Error adding to pickup route:", error);
      setFeedbackMessage(text[language].errorAddingToRoute);
      setTimeout(() => setFeedbackMessage(''), 4000);
    }
  };

  const handleSetInitialTime = async (pickupId, initialTime) => {
    try {
      await setInitialPickupTime(pickupId, initialTime);
      // Fetch pickups again to update the UI
      fetchPickups();
    } catch (error) {
      console.error("Error setting initial pickup time:", error);
      // You might want to show an error message to the user here
    }
  };

  const handleCompletePickup = async (pickupId, actualWeight) => {
    try {
      await completePickup(pickupId, actualWeight);
      fetchPickups();
    } catch (error) {
      console.error("Error completing pickup:", error);
    }
  };

  const fetchCompanyNames = async () => {
    const uniqueCompanyIds = [...new Set(branches.map(branch => branch.companyId))];
    const names = {};
    for (const companyId of uniqueCompanyIds) {
      const userData = await getUserData(companyId);
      names[companyId] = userData?.name || 'Unknown Company';
    }
    setCompanyNames(names);
  };



  const createFactoryNotification = async (pickupId, type, branchName) => {
    if (!user?.uid) return;
    
    try {
      await createNotification(user.uid, {
        type: type,
        title: text[language].notifications[type],
        message: `${text[language].notifications[type]} - ${branchName}`,
        pickupId: pickupId
      });
    } catch (error) {
      console.error("Error creating factory notification:", error);
    }
  };

  // When pickup is approved by branch
const handlePickupScheduled = async (pickupId, branchName) => {
  await createFactoryNotification(
    pickupId, 
    NOTIFICATION_TYPES.FACTORY_PICKUP_SCHEDULED,
    branchName
  );
};

// When pickup starts
const handlePickupStarted = async (pickupId, branchName) => {
  await createFactoryNotification(
    pickupId, 
    NOTIFICATION_TYPES.FACTORY_PICKUP_IN_PROGRESS,
    branchName
  );
};

// When pickup completes
const handlePickupCompleted = async (pickupId, branchName) => {
  await createFactoryNotification(
    pickupId, 
    NOTIFICATION_TYPES.FACTORY_PICKUP_COMPLETED,
    branchName
  );
};

  const text = {
    ar: {
    // Main navigation
    scheduledPickups: "عمليات الجمع المجدولة",
    pendingPickups: "عمليات الجمع المعلقة",
    mapListView: "خريطة وقائمة",
    
    // Map/List view
    mapView: "عرض الخريطة",
    listView: "عرض القائمة",
    noAvailableBranches: "لا توجد فروع متاحة للجمع حالياً",
    browseAvailableBranches: "تصفح الفروع المتاحة للجمع",
    
    // Bundle prompt
    bundlePromptTitle: "تجميع الفروع",
    bundlePromptMessage: "هناك فروع قريبة. هل ترغب في إضافتها إلى المسار؟",
    selectedBranch: "الفرع المحدد",
    initialSelection: "الاختيار الأولي",
    additionalBranchesPrompt: "هل ترغب في إضافة هذه الفروع القريبة من نفس الشكة؟",
    distance: "المسافة",
    continueWithSelected: "المتابعة مع المحدد فقط",
    addSelected: "إضافة الفروع المحددة",
    
    // Pickup details
    company: "الشركة",
    branch: "الفرع",
    estimatedQuantity: "الكمية المقدرة",
    frequency: "التكرار",
    nextPickupDate: "تاريخ الجمع التالي",
    
    // Actions
    startPickup: "بدء الاستلام",
    completePickup: "إكمال الاستلام",
    enterActualWeight: "أدخل الوزن الفعلي",
    addToRoute: "إضافة إلى المسار",
    cancel: "إلغاء",
    scheduleLater: "جدولة لاحقاً",
    
    // Empty states
    noScheduledPickups: "لا توجد عمليات جمع مجدولة",
    startAddingPickups: "ابدأ بإضافة عمليات جمع إلى جدولك",
    
    // Header/Search
    search: "بحث",
    hello: "مرحبا",
    
    // Feedback messages
    scheduledPickupAdded: "تمت إضافة الاستلام المجدول بنجاح",
    pendingPickupAdded: "تمت إضافة الاستلام المعلق بنجاح",
    errorAddingToRoute: "حدث خطأ أثناء الإضافة إلى المسار",

    // Time selection
    selectDate: "اختر التاريخ",
    selectStartTime: "وقت البدء",
    selectEndTime: "وقت الانتهاء",

    // Bottom Sheet (Timing)
    addPreferredTimeTitle: "أضف الوقت المرغوب لاستلام المواد",
    preferredTimeInterval: "الفترة الزمنية المفضلة",
    preferredPickupDate: "تاريخ الاستلام المفضل",
    from: "من",
    to: "إلى",
    setInitialTime: "تعيين الوقت الأولي",

  // Branch Details
    branchName: "اسم الفرع",
    phoneNumber: "رقم الهاتف",
    materialType: "نوع المواد",
    unknownCompany: "شركة غير معروفة",
    unknownBranch: "فرع غير معروف",
    selectedBranchesCount: "الفروع المختارة",

    // Pending Pickups
    noPickups: "لا توجد عمليات جمع معلقة",

    //cardinfo 
    materialType: "نوع المادة",
    estimatedQuantity: "الكمية المقدرة",
    kg: "كجم",
    unknownBranch: "فرع غير معروف",
    unknownCompany: "شركة غير معروفة",
    frequency: "التكرار",
    noPendingPickups: "لا توجد عمليات جمع معلقة",
    checkBackLater: "يرجى المحاولة لاحقاً",

    district: "الحي",
    unknownLocation: "موقع غير معروف",

    requestOneTimePickup: 'طلب جمع لمرة واحدة',
    requestRecurringPickup: 'طلب جمع دوري',
    recurringPickupRequirement: 'يجب إتمام عملية جمع واحدة على الأقل قبل طلب الجمع الدوري',
    errorRequestingPickup: 'حدث خطأ أثناء طلب الجمع',


    pickupScheduledSuccess: "تم جدولة عملية الجمع بنجاح. في انتظار موافقة الفرع",
    errorSettingTime: "حدث خطأ أثناء جدولة عملية الجمع",


    pickupDate: "تاريخ الجمع",
    timeSlot: "وقت الجمع",
    weightInKg: "الوزن بالكيلوغرام",
    cancel: "إلغاء",
    complete: "إكمال",
    enterActualWeight: "أدخل الوزن الفعلي",

    currentPickups: "عمليات الجمع الحالية",
    pickupHistory: "سجل عمليات الجمع",
    actualWeight: "الوزن الفعلي",
    completedAt: "تم الإكمال في",
    page: "صفحة",
    of: "من",
    noScheduledPickups: "لا يوجد عمليات جمع مجدولة",
    noHistoricalPickups: "لا يوجد عمليات جمع سابقة",
    enterActualWeight: "أدخل الوزن الفعلي",
    weightInKg: "الوزن بالكيلوغرام",
    cancel: "إلغاء",
    complete: "إكمال",

    markAsCompleted: "وضع علامة مكتمل",
    completingPickupFor: "إكمال الجمع لـ",
    enterValidWeight: "الرجاء إدخال وزن صحيح",
    estimatedQuantity: "الكمية المقدرة",

    enterTotalWeight: "أدخل الوزن الإجمالي لجميع الفروع",
    includedBranches: "الفروع المشمولة",
    totalEstimated: "إجمالي الكمية المقدرة",
    enterTotalWeightLabel: "أدخل الوزن الإجمالي لجميع الفروع",
    notifications: 'الاشعارات',
    viewPendingPickups: "عرض عمليات الجمع المعلقة",
    },

    en: {
      enterTotalWeight: "Enter Total Weight for All Branches",
      includedBranches: "Included Branches",
      totalEstimated: "Total Estimated Quantity",
      enterTotalWeightLabel: "Enter Total Weight for All Branches",

      viewPendingPickups: "View Pending Pickups",



      markAsCompleted: "Mark as Completed",
      completingPickupFor: "Completing pickup for",
      enterValidWeight: "Please enter a valid weight",
      estimatedQuantity: "Estimated Quantity",


      currentPickups: "Current Pickups",
      pickupHistory: "Pickup History",
      actualWeight: "Actual Weight",
      completedAt: "Completed At",
      page: "Page",
      of: "of",
      noScheduledPickups: "No scheduled pickups found",
      noHistoricalPickups: "No historical pickups found",
      enterActualWeight: "Enter Actual Weight",
      weightInKg: "Weight in KG",
      cancel: "Cancel",
      complete: "Complete",


      // Main navigation
      scheduledPickups: "Scheduled Pickups",
      pendingPickups: "Pending Pickups",
      mapListView: "Map & List View",
      
      // Map/List view
      mapView: "Map View",
      listView: "List View",
      noAvailableBranches: "No Available Branches",
      browseAvailableBranches: "Browse available branches for pickup",
      
      // Bundle prompt
      bundlePromptTitle: "Bundle Branches",
      bundlePromptMessage: "There are nearby branches. Would you like to add them to the route?",
      selectedBranch: "Selected Branch",
      initialSelection: "Initial Selection",
      additionalBranchesPrompt: "Would you like to add these nearby branches from the same company?",
      distance: "Distance",
      continueWithSelected: "Continue with Selected Only",
      addSelected: "Add Selected Branches",
      
      // Pickup details
      company: "Company",
      branch: "Branch",
      estimatedQuantity: "Estimated Quantity",
      frequency: "Frequency",
      nextPickupDate: "Next Pickup Date",
      
      // Actions
      startPickup: "Start Pickup",
      completePickup: "Complete Pickup",
      enterActualWeight: "Enter Actual Weight",
      addToRoute: "Add to Route",
      cancel: "Cancel",
      scheduleLater: "Schedule Later",
      
      // Empty states
      noScheduledPickups: "No Scheduled Pickups",
      startAddingPickups: "Start adding pickups to your schedule",
      
      // Header/Search
      search: "Search",
      hello: "Hello",
      
      // Feedback messages
      scheduledPickupAdded: "Scheduled pickup added successfully",
      pendingPickupAdded: "Pending pickup added successfully",
      errorAddingToRoute: "An error occurred while adding to the route",
      
      // Time selection
      selectDate: "Select Date",
      selectStartTime: "Start Time",
      selectEndTime: "End Time",

      // Bottom Sheet (Timing)
      addPreferredTimeTitle: "Add Preferred Time for Material Collection",
      preferredTimeInterval: "Preferred Time Interval",
      preferredPickupDate: "Preferred Pickup Date",
      from: "From",
      to: "To",
      setInitialTime: "Set Initial Time",

    // Branch Details
      branchName: "Branch Name",
      phoneNumber: "Phone Number",
      materialType: "Material Type",
      unknownCompany: "Unknown Company",
      unknownBranch: "Unknown Branch",
      selectedBranchesCount: "Selected Branches",

    // Pending Pickups
       noPickups: "No pending pickups available",


    //cardinfo 
      materialType: "Material Type",
      estimatedQuantity: "Estimated Quantity",
      kg: "kg",
      unknownBranch: "Unknown Branch",
      unknownCompany: "Unknown Company",
      frequency: "Frequency",
      noPendingPickups: "No Pending Pickups",
      checkBackLater: "Please check back later",

      district: "District",
      unknownLocation: "Unknown Location",

      requestOneTimePickup: 'Request One-Time Pickup',
      requestRecurringPickup: 'Request Recurring Pickup',
      recurringPickupRequirement: 'Complete at least one pickup before requesting recurring pickups',
      errorRequestingPickup: 'Error requesting pickup',

      pickupScheduledSuccess: "Pickup scheduled successfully. Waiting for branch approval",
    errorSettingTime: "Error scheduling pickup",

    pickupDate: "Pickup Date",
    timeSlot: "Pickup Time",
    weightInKg: "Weight in kg",
    cancel: "Cancel",
    complete: "Complete",
    enterActualWeight: "Enter Actual Weight",

    page: "Page",
    of: "of",
    noHistoricalPickups: "No historical pickups found",
    noScheduledPickups: "No scheduled pickups found",

    notifications: 'Notifications'
    }
  };



  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isRTL = language === 'ar';

  // Modify the tab switching to refresh data
   // Update localStorage when tab changes
   const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    if (typeof window !== 'undefined') {
      localStorage.setItem('factoryDashboardTab', newTab);
      localStorage.setItem('lastVisitTime', Date.now().toString());
    }
  };

  return (
    <div className="relative">
      <div className={`min-h-screen bg-gray-100 ${isRTL ? 'rtl' : 'ltr'} flex`}>
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white shadow-md p-4 relative">
            <div className="flex flex-col sm:flex-row justify-between items-center">
              {/* Mobile layout */}
              {isMobile && (
                <>
                  <div className="flex items-center w-full justify-between mb-0">
                    <div className="bg-blue-100 rounded-lg px-4 py-2 border border-blue-300">
                      <h1 className="text-lg font-semibold text-blue-800">
                        {userName || user?.name}
                      </h1>
                    </div>
                    <div className="flex items-center">
                      <button 
                        className="text-gray-600 hover:text-gray-800 mr-4"
                        onClick={() => setShowSearch(!showSearch)}
                      >
                        <FaSearch size={24} />
                      </button>
                      <button 
                        className="text-gray-600 hover:text-gray-800"
                        onClick={() => setMenuOpen(!menuOpen)}
                      >
                        <FaBars size={24} />
                      </button>
                    </div>
                  </div>
                  {showSearch && (
                    <div className="w-full m-4">
                      <input
                        type="text"
                        placeholder={text[language].search}
                        className="border rounded-md px-3 py-2 w-full"
                      />
                    </div>
                  )}
                </>
              )}
              
              {/* Desktop layout */}
              {!isMobile && (
                <>
                  <div className="flex items-center">
                    <input
                      type="text"
                      placeholder={text[language].search}
                      className={`border rounded-md px-3 py-2 ${isRTL ? 'ml-4' : 'mr-4'}`}
                    />
                  </div>
                  <div className="bg-blue-100 rounded-lg px-4 py-2 border border-blue-300">
                    <h1 className="text-xl font-semibold text-blue-800">
                      {text[language].hello} {userName || user?.name}
                    </h1>
                  </div>
                </>
              )}
            </div>
            <AnimatePresence>
              {isMobile && menuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 top-full shadow-lg z-50"
                >
                  <VerticalMenu 
                    activeTab={activeTab} 
                    setActiveTab={(tab) => { 
                      setActiveTab(tab); 
                      setMenuOpen(false); 
                    }} 
                    text={text[language]} 
                    isRTL={isRTL}
                    unreadCount={unreadCount} 
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </header>
          
           <main className="flex-1 p-4 overflow-y-auto relative">
           <div className="flex border-b mb-6">
            {[
              { 
                id: 'notifications', 
                textKey: 'notifications',
                badge: unreadCount > 0 ? unreadCount : null
              },
              { id: 'scheduled', textKey: 'scheduledPickups' },
              { id: 'pending', textKey: 'pendingPickups' },
              { id: 'map', textKey: 'mapView' }
            ].map(tab => (
              <button
                key={tab.id}
                className={`flex-1 py-1.5 sm:py-2 px-0.5 sm:px-6 text-center relative text-[12px] sm:text-base
                  ${activeTab === tab.id 
                    ? 'bg-blue-100 border-b-2 border-blue-500 text-blue-700' 
                    : 'hover:bg-gray-50'
                  }`}
                onClick={() => handleTabChange(tab.id)}
              >
                <span>{text[language][tab.textKey]}</span>
                {tab.badge && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

            {/* Only show loading when there's an active fetch */}
            {isActiveFetch ? (
                <TabLoadingSkeleton />
              ) : (
      <>
        {activeTab === 'pending' && (
          <div className={`${isRTL ? 'rtl' : 'ltr'}`}>
            {pendingInitialPickups.length > 0 ? (
              <PendingInitialPickups 
                pickups={pendingInitialPickups}
                onSetInitialTime={handleSetInitialTime}
                text={text[language]}
                isRTL={isRTL}
                language={language}
                companyNames={companyNames} 
                user={user}
                fetchPickups={fetchPickups}
              />
            ) : (
              <div className="text-center py-10">
                <FaBoxOpen className="mx-auto text-gray-400 text-5xl mb-4" />
                <p className="text-gray-500">{text[language].noPendingPickups}</p>
              </div>
            )}
          </div>
        )}


      

              {activeTab === 'scheduled' && (
                <div className={`${isRTL ? 'rtl' : 'ltr'}`}>
                  {scheduledPickups.length > 0 ? (
                    <ScheduledPickups 
                      pickups={scheduledPickups}
                      onComplete={handleCompletePickup}
                      text={text[language]}
                      isRTL={isRTL}
                      language={language}
                      companyNames={companyNames}  // Add this
                      user={user}                  // Add this
                      fetchPickups={fetchPickups} 
                    />
                  ) : (
                    <div className="text-center py-10">
                      <FaCalendarTimes className="mx-auto text-gray-400 text-5xl mb-4" />
                      <p className="text-gray-700 font-medium text-lg mb-2">
                        {text[language].noScheduledPickups}
                      </p>
                      <p className="text-gray-500 text-sm">
                        {text[language].startAddingPickups}
                      </p>
                    </div>
                  )}
                </div>
              )}
              {activeTab === 'map' && isLoaded && (
                <MapListView 
                  branches={branches}
                  handleAddToRoute={handleAddToRoute}
                  text={text[language]}
                  isRTL={isRTL}
                  language={language}
                  companyNames={companyNames}
                  user={user}  // Add this line

                />
              )}
              {activeTab === 'notifications' && (
                <div className={`${isRTL ? 'rtl' : 'ltr'}`}>
                  <NotificationsList
                    text={text[language]}
                    isRTL={isRTL}
                    userType="factory"
                  />
                </div>
              )}
            </>
          )}
        </main>

        </div>
        {!isMobile && (
          <div className="w-20 bg-white shadow-md">
            <VerticalMenu activeTab={activeTab} setActiveTab={setActiveTab} text={text[language]} isRTL={isRTL}   unreadCount={unreadCount}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Add the skeleton component
function TabLoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
      {[1, 2, 3].map((n) => (
        <div key={n} className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-start mb-4">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          </div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
          <div className="h-10 bg-gray-200 rounded w-full mt-6"></div>
        </div>
      ))}
    </div>
  );
}


