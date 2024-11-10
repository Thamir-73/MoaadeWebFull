'use client'

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPlus, FaRecycle, FaBuilding, FaCalendarAlt, FaMapMarkerAlt, FaHistory, FaCalendarWeek, FaSearch, FaMousePointer, FaBell, FaChartBar, FaUsers, FaBox, FaCog, FaTimes, FaBars, FaChevronLeft, FaChevronRight, FaEdit, FaTrash, FaInbox, FaClipboardList, FaCalendarCheck, FaArrowRight, FaArrowLeft } from 'react-icons/fa';
import { useLanguage } from '@/app/LanguageContext';
import { useAuth } from '@/app/contexts/AuthContext';
import { registerBranch, getUserBranches, declareMaterial, updateMaterialStatus, updateMaterialPickupDay, completePickup, updateMaterialAvailability } from '@/app/utils/firebase';
import { GoogleMap, Marker, StandaloneSearchBox, useLoadScript } from '@react-google-maps/api';
import { collection, getDocs, onSnapshot, query, where, getDoc, doc } from 'firebase/firestore';
import { db, PICKUP_STATUSES,updatePickupApproval } from '@/app/utils/firebase';
import { translateMaterialType } from '@/app/utils/helpers';
import { useRouter } from 'next/navigation';
import NotificationsList from '../components/NotificationsList';




export default function CompanyDashboard() {
  const { language } = useLanguage();
  const { user, userName, refreshUserData } = useAuth();
  const [branches, setBranches] = useState([]);
  const [showBranchSheet, setShowBranchSheet] = useState(false);
  const [showMaterialSheet, setShowMaterialSheet] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isMobile, setIsMobile] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [newBranch, setNewBranch] = useState({
    name: '',
    location: { lat: 24.7136, lng: 46.6753 },
    locationAddress: '',
    materialType: '',
    frequency: 'daily',
    pickupDate: '',
    quantity: '',
    images: [],
    phoneNumber: '' // Add this line
  });
  const [showSearch, setShowSearch] = useState(false);
  const [searchBox, setSearchBox] = useState(null);
  const [location, setLocation] = useState({ lat: 24.7136, lng: 46.6753 }); // Default to Riyadh
  const [locationAddress, setLocationAddress] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [requestsSubTab, setRequestsSubTab] = useState('current');
  const [unreadCount, setUnreadCount] = useState(0);



  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    libraries: ['places'],
  });

  const mapOptions = {
    disableDefaultUI: true,
    zoomControl: false,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
  };

  useEffect(() => {
    if (user) {
      fetchBranches();
    }
  }, [user]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768); // Adjust this value as needed
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (user && !userName) {
      refreshUserData();
    }
  }, [user, userName]);

  const fetchBranches = async () => {
    try {
      const userBranches = await getUserBranches(user.uid);
      setBranches(userBranches);
    } catch (error) {
      console.error("Error fetching branches:", error);
    }
  };

// Add this useEffect in CompanyDashboard
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


  const text = {
    ar: {
      welcome: 'مرحبًا بك في لوحة التحكم',
      registerBranch: ':تسجيل فرع جديد لاستلام مواد مُعاد تدويرها',
      branchOverview: 'الفروع المسجلة',
      addMaterial: 'إضافة مواد للفرع',
      noBranches: 'لم يتم تسجيل أي فروع بعد',
      noMaterials: 'لم يتم إضافة أي مواد بعد',
      branchName: 'اسم الفرع',
      materialType: 'نوع امادة',
      selectMaterial: 'اختر نوع المادة',
      plastic: 'بلاستيك',
      paper: 'ورق',
      paperAndCardboard: 'ورق وكرتون',
      glass: 'زجاج',
      frequency: 'التكرار',
      selectFrequency: 'اختر تكرار الاستلام',
      oneTimeDate: 'تاريخ التوفر لمرة واحدة',
      daily: 'يومي',
      weekly: 'أسبوعي',
      monthly: 'شهري',
      oneTime: 'مرة واحدة',
      submit: 'تسجيل الفرع',
      submitting: 'جاري التسجيل...',
      successMessage: 'تم تسجيل الفرع بنجاح!',
      cancel: 'إلغاء',
      availableMaterials: 'المواد المتاحة',
      outOfStockMaterials: 'المواد غير المتوفرة',
      pendingPickup: 'في انتظار الاستلام',
      pickedUpToday: 'تم الاستلام اليوم',
      pickedUpThisWeek: 'تم الاستام هذا الأسبوع',
      pickedUpThisMonth: 'تم الاستلام هذا الشهر',
      outOfStock: 'غير متوفر حاليًا',
      location: 'الموقع',
      clickOrDragMarker: 'انقر أو اسحب اعلامة لتحديد الموقع',
      or: 'أو',
      searchLocation: 'ابحث عن الموقع',
      hideSearch: 'إخفاء البحث',
      searchPlaceholder: 'ابحث عن موقع...',
      selectedLocation: 'الموقع المحدد',
      overview: 'نظرة عامة',
      branches: 'الفروع',
      requests: 'طلبات الاستلام',
      notifications: 'الإشعارات',
      totalBranches: 'إجمالي الفروع',
      totalMaterials: 'إجمالي المواد',
      pendingPickups: 'الاستلامات المعلقة',
      dashboard: 'لوحة القادة',
      customers: 'العملاء',
      income: 'الدخل',
      promote: 'الترويج',
      help: 'الساعدة',
      hello: 'مرحبا',
      search: 'بحث',
      materialPickupFrequencyTitle: 'توفر المواد المعاد تدويرها في الفرع',
      pickupDateRequired: 'يرجى اختيار تاريخ الاستلام للاستلام لمرة واحدة',
      branchNameHint: 'اسم الفرع',
      branchNameExample: 'مثال: الدانوب حي الربيع',
      branchRegisteredSuccess: 'تم تسجيل الفرع بنجاح!',
      pickupStatusFromFactory: 'حالة الاستلام من مصنع',
      showingEntries: 'عرض {start} إلى {end} من {total} سجل',
      pickupDay: 'يوم الاستلام',
      sunday: 'الأحد',
      monday: 'الاثني',
      tuesday: 'الثلاثاء',
      wednesday: 'الأربعاء',
      thursday: 'الخميس',
      friday: 'الجمعة',
      saturday: 'السبت',
      monthlyPickupDay: 'يوم الاستلام الشهري',
      firstSunday: 'أول أحد بداية الشهر',
      firstMonday: 'أول انين بداية الشهر',
      firstTuesday: 'أول ثلاثاء بداية الشهر',
      firstWednesday: 'أول أ��بعاء بداية ال��هر',
      firstThursday: 'أول خميس بداية الشهر',
      firstFriday: 'أول جمعة بداية الشهر',
      firstSaturday: 'أول سبت بدية الشهر',
      branchNameDescription: 'أدخل اسم الفرع',
      materialTypeDescription: 'اختر نوع المادة',
      frequencyDescription: 'اختر تكرار الاستلام',
      pickupDayDescription: 'اختر يوم الاستلام الأسبوعي',
      monthlyPickupDayDescription: 'اختر يوم الاستلام الشهري',
      quantityDescription: 'أدخل الكمية المتوقعة',
      images: 'الصور (اختياري)',
      clickToUpload: 'انقر للتحميل',
      orDragAndDrop: 'أو اسحب وأفلت',
      imageFormats: 'PNG، JPG، GIF حتى 10MB',
      imagesSelected: 'صور مختارة',
      noMaterial: 'لا توجد واد',
      statusTitle: 'الحالة',
      inStock: 'متوفر',
      outOfStock: 'غير متوفر',
      status: 'الحالة',
      branchPhoneNumber: "رقم هاتف الفرع",
      branchPhoneNumberDescription: "أدخل رقم هاتف الفرع",
      useAccountNumber: "استخدم رقم هاتف الحساب",
      quantity: "الكمية المتوقعة للمواد (اختياري)",
      currentRequests: 'الطلبات الحالية',
      previousRequests: 'الطلبات السابقة',
      recurringRequests: 'الطلبات المتكررة',
      factoryName: 'اسم المصنع',
      materialType: 'نوع المادة',
      requestDate: 'تايخ الطلب',
      status: 'الحالة',
      actions: 'الإجراءت',
      pending: 'قيد الانتظار',
      accept: 'قبول',
      reject: 'رفض',
      materialAvailability: 'توفر المواد في الفرع',
      completedPickups:"الاستلامات السابقة",
      details: 'التفاصيل',
      of: 'من',
      estimatedQuantity: 'الكمية المتوقعة',
      pending_branch_approval: 'قيد الموافقة',
      scheduled: 'مجدول',
      in_progress: 'قيد التنفيذ',
      completed: 'مكتمل',
      cancelled: 'ملغي',
      from: 'من',
      to: 'إلى',
      loading: 'جاري التحميل...',
      pickupDateTime: "تاريخ و وقت الاستلام",
      noNotifications: 'لا توجد إشعارات',
      enableNotifications: 'تفعيل الإشعارات',
      markAllRead: 'تعليم الكل كمقروء',
      new: 'جديد',
      successMessage: 'تم بنجاح!',
      pendingRequests: 'الطلبات المعلقة',
      requestMovedToCurrentPickups: 'تم نقل الطلب إلى الاستلامات الحالية',
      viewCurrentPickups: 'عرض الاستلامات الحالية',
      close: 'إغلاق',
      noPendingRequests: 'لا توجد طلبات معلقة',
      noCurrentRequests: 'لا توجد طلبات حالية',
      noPreviousRequests: 'لا توجد طلبات سابقة',
      noRecurringRequests: 'لا توجد طلبات متكررة',
      checkCurrentRequests: 'تصفح الطلبات الحالية',
      checkPreviousRequests: 'تصفح الطلبات السابقة',
      checkRecurringRequests: 'تصفح الطلبات المتكررة',
      checkPendingRequests: 'تصفح الطلبات المعلقة'
    },
    en: {
      welcome: 'Welcome to your Dashboard',
      registerBranch: 'Register New Branch',
      branchOverview: 'Branch Overview',
      addMaterial: 'Add Material to Branch',
      noBranches: 'No branches registered yet',
      noMaterials: 'No materials added yet',
      branchName: 'Branch Name',
      materialType: 'Material Type',
      selectMaterial: 'Select material type',
      plastic: 'Plastic',
      paper: 'Paper',
      paperAndCardboard: 'Paper and Cardboard',
      glass: 'Glass',
      frequency: 'Frequency',
      selectFrequency: 'Select pickup frequency',
      oneTimeDate: 'One-time Availability Date',
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly',
      oneTime: 'One-time',
      submit: 'Register Branch',
      submitting: 'Submitting...',
      successMessage: 'Branch registered successfully!',
      cancel: 'Cancel',
      availableMaterials: 'Available Materials',
      outOfStockMaterials: 'Out of Stock Materials',
      pendingPickup: 'Pending Pickup',
      pickedUpToday: 'Picked Up Today',
      pickedUpThisWeek: 'Picked Up This Week',
      pickedUpThisMonth: 'Picked Up This Month',
      outOfStock: 'Out of Stock',
      location: 'Location',
      clickOrDragMarker: 'Click or drag the marker to select location',
      or: 'Or',
      searchLocation: 'Search Location',
      hideSearch: 'Hide Search',
      searchPlaceholder: 'Search for a location...',
      selectedLocation: 'Selected Location',
      overview: 'Overview',
      branches: 'Branches',
      requests: 'Pickup Requests',
      notifications: 'Notifications',
      totalBranches: 'Total Branches',
      totalMaterials: 'Total Materials',
      pendingPickups: 'Pending Pickups',
      dashboard: 'Dashboard',
      customers: 'Customers',
      income: 'Income',
      promote: 'Promote',
      help: 'Help',
      hello: 'Hello',
      search: 'Search',
      materialPickupFrequencyTitle: 'Frequency of factory pickup for recycled materials',
      pickupDateRequired: 'Please select a pickup date for one-time pickup',
      branchNameHint: 'Branch name',
      branchNameExample: 'Example: Danube Al Rabwa District',
      branchRegisteredSuccess: 'Branch registered successfully!',
      pickupStatusFromFactory: 'Pickup Status from Factory',
      showingEntries: 'Showing {start} to {end} of {total} entries',
      pickupDay: 'Pickup Day',
      sunday: 'Sunday',
      monday: 'Monday',
      tuesday: 'Tuesday',
      wednesday: 'Wednesday',
      thursday: 'Thursday',
      friday: 'Friday',
      saturday: 'Saturday',
      monthlyPickupDay: 'Monthly Pickup Day',
      firstSunday: 'First Sunday',
      firstMonday: 'First Monday',
      firstTuesday: 'First Tuesday',
      firstWednesday: 'First Wednesday',
      firstThursday: 'First Thursday',
      firstFriday: 'First Friday',
      firstSaturday: 'First Saturday',
      branchNameDescription: 'Enter branch name',
      materialTypeDescription: 'Select material type',
      frequencyDescription: 'Select pickup frequency',
      pickupDayDescription: 'Select weekly pickup day',
      monthlyPickupDayDescription: 'Select monthly pickup day',
      quantityDescription: 'Enter expected quantity',
      imageDescription: 'Upload an image of the branch (optional)',
      noMaterial: 'No material',
      statusTitle: 'Status',
      inStock: 'In Stock',
      outOfStock: 'Out of Stock',
      status: 'Status',
      images: "images (optional)",
      clickToUpload: 'Click to upload',
      orDragAndDrop: 'or drag and drop',
      imageFormats: 'PNG, JPG, GIF up to 10MB',
      imagesSelected: 'images selected',
      branchPhoneNumber: "Branch Phone Number",
      branchPhoneNumberDescription: "Enter the branch phone number",
      useAccountNumber: "Use account phone number",
      quantity: "Expected quantity of materials (optional)",
      currentRequests: 'Current Requests',
      previousRequests: 'Previous Requests',
      recurringRequests: 'Recurring Requests',
      factoryName: 'Factory Name',
      materialType: 'Material Type',
      requestDate: 'Request Date',
      status: 'Status',
      actions: 'Actions',
      pending: 'Pending',
      accept: 'Accept',
      reject: 'Reject',
      materialAvailability: 'Material Availability',
      completedPickups: "Previous Completed Pickups",
      details: 'Details',
      of: 'of',
      estimatedQuantity: 'Estimated Quantity',
      pending_branch_approval: 'Pending Approval',
      scheduled: 'Scheduled',
      in_progress: 'In Progress',
      completed: 'Completed',
      cancelled: 'Cancelled',
      from: 'from',
      to: 'to',
      loading: 'Loading...',
      pickupDateTime: "Pickup Date & Time",
      noNotifications: 'No notifications',
      enableNotifications: 'Enable Notifications',
      markAllRead: 'Mark all as read',
      new: 'new',
      successMessage: 'Success!',
      pendingRequests: 'Pending Requests',
      requestMovedToCurrentPickups: 'Request moved to current pickups',
      viewCurrentPickups: 'View Current Pickups',
      close: 'Close',
      noPendingRequests: 'No pending requests',
      noCurrentRequests: 'No current requests',
      noPreviousRequests: 'No previous requests',
      noRecurringRequests: 'No recurring requests',
      checkCurrentRequests: 'Check Current Requests',
      checkPreviousRequests: 'Check Previous Requests',
      checkRecurringRequests: 'Check Recurring Requests',
      checkPendingRequests: 'Check Pending Requests'
    },
  };


  const handleRegisterBranch = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    console.log('Submitting branch...');

    try {
      if (!user) {
        console.error("No user logged in");
        return;
      }

      const branchData = {
        name: newBranch.name,
        location: newBranch.location,
        locationAddress: newBranch.locationAddress,
        materialType: newBranch.materialType,
        frequency: newBranch.frequency,
        pickupDate: newBranch.frequency === 'one_time' ? newBranch.pickupDate : null,
        quantity: newBranch.quantity,
        images: newBranch.images
      };

      console.log('Branch data to be submitted:', branchData);

      const branchId = await registerBranch(user.uid, branchData);
      
      if (branchId) {
        console.log("Branch registered successfully with ID:", branchId);
        // Reset the form
        setNewBranch({
          name: '',
          location: { lat: 24.7136, lng: 46.6753 },
          locationAddress: '',
          materialType: '',
          frequency: 'daily',
          pickupDate: '',
          quantity: '',
          images: []
        });
        setShowBranchSheet(false);
        setShowSuccessMessage(true);
        // Hide success message after 2 seconds
        setTimeout(() => {
          setShowSuccessMessage(false);
        }, 2000);
        // Refresh the branches list
        fetchBranches();
      } else {
        console.error("Failed to register branch");
      }
    } catch (error) {
      console.error("Error registering branch:", error);
    } finally {
      setIsSubmitting(false);
    }
  };


 
  const handleEditFrequency = async (branchId, materialType, newFrequency) => {
    try {
      await updateMaterialFrequency(branchId, materialType, newFrequency);
      // Refresh the branches list
      fetchBranches();
    } catch (error) {
      console.error("Error updating material frequency:", error);
      // Handle error (e.g., show error message to user)
    }
  };



  const handleUpdateStatus = async (branchId, materialType, newStatus) => {
    try {
      await updateMaterialStatus(branchId, materialType, newStatus);
      // Refresh branches data after update
      fetchBranches();
    } catch (error) {
      console.error("Error updating status:", error);
      // Handle error (e.g., show error message to user)
    }
  };


  const handleDeclareMaterial = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await declareMaterial(selectedBranch.id, newBranch);
      setNewBranch({
        name: '',
        location: { lat: 24.7136, lng: 46.6753 },
        locationAddress: '',
        materialType: '',
        frequency: 'daily',
        pickupDate: '',
        quantity: '',
        images: []
      });
      setShowMaterialSheet(false);
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
      fetchBranches();
    } catch (error) {
      console.error("Error declaring material:", error);
      // Optionally, show an error message to the user
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateMaterialStatus = async (branchId, materialIndex, newStatus) => {
    try {
      await updateMaterialStatus(branchId, materialIndex, newStatus);
      fetchBranches();
    } catch (error) {
      console.error("Error updating material status:", error);
    }
  };

  const onMapClick = (e) => {
    const newLocation = { lat: e.latLng.lat(), lng: e.latLng.lng() };
    setLocation(newLocation);
    setNewBranch(prev => ({
      ...prev,
      location: newLocation
    }));
    getAddressFromLatLng(newLocation.lat, newLocation.lng);
  };

  const onMarkerDragEnd = (e) => {
    const newLocation = { lat: e.latLng.lat(), lng: e.latLng.lng() };
    setLocation(newLocation);
    setNewBranch(prev => ({
      ...prev,
      location: newLocation
    }));
    getAddressFromLatLng(newLocation.lat, newLocation.lng);
  };

  const onPlacesChanged = () => {
    const places = searchBox.getPlaces();
    if (places.length === 0) return;
    const place = places[0];
    const newLocation = {
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng()
    };
    setLocation(newLocation);
    setNewBranch(prev => ({
      ...prev,
      location: newLocation
    }));
    setLocationAddress(place.formatted_address);
  };


  const getAddressFromLatLng = async (lat, lng) => {
    const geocoder = new google.maps.Geocoder();
    const latlng = { lat, lng };
    geocoder.geocode({ location: latlng }, (results, status) => {
      if (status === 'OK' && results[0]) {
        setLocationAddress(results[0].formatted_address);
        setNewBranch(prev => ({
          ...prev,
          locationAddress: results[0].formatted_address
        }));
      } else {
        console.error('Geocoder failed due to: ' + status);
      }
    });
  };


  const handleEditPickupDay = async (branchId, materialIndex, newPickupDay) => {
    try {
      await updateMaterialPickupDay(branchId, materialIndex, newPickupDay);
      fetchBranches();
    } catch (error) {
      console.error("Error updating pickup day:", error);
    }
  };

  const isRTL = language === 'ar';

  return (
    <div className="relative">
      <div className={`min-h-screen bg-gray-100 ${isRTL ? 'rtl' : 'ltr'} flex`}>
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white shadow-md p-4 relative">
            <div className="flex flex-col sm:flex-row justify-between items-center">
              {/* Mobile layout */}
              {isMobile && (
                <>
                  <div className="flex items-center w-full justify-between mb-4">
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
                    <div className="w-full mb-4">
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

            {/* Add horizontal tabs below the existing header */}
            <div className="flex border-b mt-4">
              {[
                { id: 'notifications', textKey: 'notifications', showBadge: true },
                { id: 'requests', textKey: 'requests' },
                { id: 'branches', textKey: 'branches' },
                { id: 'overview', textKey: 'overview' }
              ].map(tab => (
                <button
                  key={tab.id}
                  className={`flex-1 py-2 px-6 text-center mx-1 relative
                    ${activeTab === tab.id ? 'bg-blue-100 border-b-2 border-blue-500 text-blue-700' : 'hover:bg-gray-50'}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <span>{text[language][tab.textKey]}</span>
                  {tab.showBadge && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
       

          
          <main className="flex-1 p-6 overflow-y-auto relative">
            
            <div className="mb-6 flex justify-end">
              <button
                onClick={() => setShowBranchSheet(true)}
                className={`bg-blue-500 text-white px-2 py-3 rounded-md hover:bg-blue-600 transition duration-300 flex items-center ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                <FaPlus className={isRTL ? 'ml-2' : 'mr-2'} />
                {text[language].registerBranch}
              </button>
            </div>


                   {/* Tab content */}
                   {activeTab === 'overview' && <OverviewContent branches={branches} text={text[language]} isRTL={isRTL} />}
            {activeTab === 'branches' && <BranchesContent 
              branches={branches}
              onEditFrequency={handleEditFrequency}
              onUpdateStatus={handleUpdateStatus}
              text={text[language]}
              isRTL={isRTL}
            />}
              {activeTab === 'requests' && (
              <RequestsContent 
                subTab={requestsSubTab}
                text={text}  // Pass the entire text object
                isRTL={isRTL}
                setRequestsSubTab={setRequestsSubTab}
              />
            )}
            {activeTab === 'notifications' && <NotificationsContent text={text[language]} isRTL={isRTL} />}
          </main>
        </div>

        {/* Vertical menu */}
        {!isMobile && (
          <div className="w-20 bg-white shadow-md">
            <VerticalMenu activeTab={activeTab} setActiveTab={setActiveTab} text={text[language]} isRTL={isRTL}  unreadCount={unreadCount}/>
          </div>
        )}
   
       <AnimatePresence>
  {showBranchSheet && (
    <BottomSheet
      onClose={() => setShowBranchSheet(false)}
      isRTL={isRTL}
    >
      <form onSubmit={handleRegisterBranch}>
        <BranchSheetContent
          newBranch={newBranch}
          setNewBranch={setNewBranch}
          text={text[language]}
          isRTL={isRTL}
          isLoaded={isLoaded}
          mapOptions={mapOptions}
          onMapClick={onMapClick}
          onMarkerDragEnd={onMarkerDragEnd}
          showSearch={showSearch}
          setShowSearch={setShowSearch}
          searchBox={searchBox}
          setSearchBox={setSearchBox}
          onPlacesChanged={onPlacesChanged}
          location={location}
          locationAddress={locationAddress}
          userPhoneNumber={user?.phoneNumber} // Add this line
        />
        <div className="mt-6 flex justify-center">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`
              bg-blue-500 text-white py-3 px-6 rounded-md 
              hover:bg-blue-600 transition duration-300 
              ${language === 'ar' ? 'rtl' : 'ltr'}
              w-2/3 max-w-xs
            `}
          >
            {isSubmitting ? text[language].submitting : text[language].submit}
          </button>
        </div>
      </form>
    </BottomSheet>
          )}
        </AnimatePresence>
      </div>
      
      <AnimatePresence>
        {showConfirmation && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-md shadow-lg z-[60]"
          >
            {text[language].branchRegisteredSuccess}
          </motion.div>
        )}
        {showSuccessMessage && (
          <div className={`fixed bottom-4 ${language === 'ar' ? 'left-4' : 'right-4'} bg-green-500 text-white px-4 py-2 rounded-md z-50`}>
            {text[language].successMessage}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function VerticalMenu({ activeTab, setActiveTab, text, isRTL, unreadCount }) {
  const menuItems = [
    { id: 'overview', icon: FaChartBar, label: text.overview },
    { id: 'branches', icon: FaBuilding, label: text.branches },
    { id: 'requests', icon: FaCalendarAlt, label: text.requests },
    { id: 'notifications', icon: FaBell, label: text.notifications, showBadge: true }
  ];

  return (
    <div className="flex flex-col h-full bg-white shadow-md">
      {menuItems.map((item) => (
        <button
          key={item.id}
          className={`p-4 flex flex-col items-center justify-center relative ${
            activeTab === item.id ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
          }`}
          onClick={() => setActiveTab(item.id)}
        >
          <div className="relative">
            <item.icon size={24} className="mb-2" />
            {item.showBadge && unreadCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </div>
          <span className="text-xs text-center">{item.label}</span>
        </button>
      ))}
    </div>
  );
}


function OverviewContent({ branches, text, isRTL }) {
  const [completedPickups, setCompletedPickups] = useState(0);
  const [pendingPickups, setPendingPickups] = useState(0);

  useEffect(() => {
    const fetchPickupStats = async () => {
      try {
        const pickupsRef = collection(db, 'pickups');
        const branchIds = branches.map(branch => branch.id);
        
        const querySnapshot = await getDocs(pickupsRef);
        let completedCount = 0;
        let pendingCount = 0;

        querySnapshot.forEach((doc) => {
          const pickup = doc.data();
          
          if (pickup.branches && Array.isArray(pickup.branches)) {
            pickup.branches.forEach((branch) => {
              if (branchIds.includes(branch.branchId)) {
                console.log('Found matching branch:', branch);
                console.log('Branch status:', branch.status);
                
                if (branch.status === PICKUP_STATUSES.COMPLETED) {
                  completedCount++;
                }
                else if (branch.status === PICKUP_STATUSES.PENDING_BRANCH_APPROVAL) {
                  pendingCount++;
                }
              }
            });
          }
        });

        console.log('Final counts:', { completedCount, pendingCount });
        setCompletedPickups(completedCount);
        setPendingPickups(pendingCount);
      } catch (error) {
        console.error("Error fetching pickup stats:", error);
      }
    };

    if (branches.length > 0) {
      fetchPickupStats();
    }
  }, [branches]);

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="order-3 md:order-3" dir={isRTL ? 'ltr' : 'rtl'}>
          <StatCard 
            icon={<FaRecycle />} 
            title={text.completedPickups} 
            value={completedPickups}
          />
        </div>
        <div className="order-2 md:order-2" dir={isRTL ? 'ltr' : 'rtl'}>
          <StatCard 
            icon={<FaCalendarAlt />} 
            title={text.pendingPickups} 
            value={pendingPickups}
          />
        </div>
        <div className="order-1 md:order-1" dir={isRTL ? 'ltr' : 'rtl'}>
          <StatCard 
            icon={<FaBuilding />} 
            title={text.totalBranches} 
            value={branches.length} 
          />
        </div>
      </div>
    </div>
  );
}



// Move EmptyState outside of RequestsContent
const EmptyState = ({ subTab, text, isRTL, setRequestsSubTab }) => {
  const getEmptyStateContent = () => {
    switch(subTab) {
      case 'pending':
        return {
          icon: <FaInbox className="w-16 h-16 text-gray-400" />,
          message: text.noPendingRequests,
          nextTab: 'current',
          nextTabText: text.checkCurrentRequests
        };
      case 'current':
        return {
          icon: <FaClipboardList className="w-16 h-16 text-gray-400" />,
          message: text.noCurrentRequests,
          nextTab: 'recurring',
          nextTabText: text.checkRecurringRequests
        };
      case 'previous':
        return {
          icon: <FaHistory className="w-16 h-16 text-gray-400" />,
          message: text.noPreviousRequests,
          nextTab: 'pending',
          nextTabText: text.checkPendingRequests
        };
      case 'recurring':
        return {
          icon: <FaCalendarCheck className="w-16 h-16 text-gray-400" />,
          message: text.noRecurringRequests,
          nextTab: 'previous',
          nextTabText: text.checkPreviousRequests
        };
      default:
        return null;
    }
  };

  const content = getEmptyStateContent();

  return (
    <div className="flex flex-col items-center justify-center py-12">
      {content.icon}
      <p className="mt-4 text-lg font-medium text-gray-600">{content.message}</p>
      <button
        onClick={() => setRequestsSubTab(content.nextTab)}
        className={`mt-4 flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors ${
          isRTL ? 'flex-row-reverse' : ''
        }`}
      >
        {content.nextTabText}
        {isRTL ? <FaArrowLeft /> : <FaArrowRight />}
      </button>
    </div>
  );
};

function RequestsContent({ subTab, text: rawText, isRTL, setRequestsSubTab }) {
  console.log('rawText:', rawText);
  console.log('isRTL:', isRTL);

  const text = rawText[isRTL ? 'ar' : 'en'];
  const { user } = useAuth();
  const [pickups, setPickups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [branchNames, setBranchNames] = useState({});
  const [factoryNames, setFactoryNames] = useState({});
  const [showConfirmationSheet, setShowConfirmationSheet] = useState(false);
  const [pendingCount, setPendingCount] = useState(0); // Add this state for pending count
  const itemsPerPage = 10;
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.uid) return;
      setIsLoading(true);
      
      try {
        const [pickupsSnapshot, branchesSnapshot] = await Promise.all([
          getDocs(collection(db, 'pickups')),
          getDocs(collection(db, 'branches'))
        ]);

        // Process branch names
        const branchNamesMap = {};
        branchesSnapshot.forEach(doc => {
          branchNamesMap[doc.id] = doc.data().name;
        });
        setBranchNames(branchNamesMap);

        // Collect unique factory IDs
        const factoryIds = new Set();
        pickupsSnapshot.forEach(doc => {
          const pickup = doc.data();
          if (pickup.factoryId) factoryIds.add(pickup.factoryId);
        });

        // Fetch factory names
        const factoryDocs = await Promise.all(
          Array.from(factoryIds).map(fId => getDoc(doc(db, 'users', fId)))
        );

        const factoryNamesMap = {};
        factoryDocs.forEach(doc => {
          if (doc.exists()) {
            factoryNamesMap[doc.id] = doc.data().name;
          }
        });
        setFactoryNames(factoryNamesMap);

        // Process pickups and count pending requests
        const processedPickups = [];
        let pendingCounter = 0; // Add counter for pending requests

        pickupsSnapshot.forEach(doc => {
          const pickup = doc.data();
          
          pickup.branches?.forEach(branch => {
            if (branch.companyId === user.uid) {
              // Count pending requests regardless of current tab
              if (branch.status === 'pending_branch_approval') {
                pendingCounter++;
              }

              let shouldInclude = false;
              switch(subTab) {
                case 'pending':
                  shouldInclude = branch.status === 'pending_branch_approval';
                  break;
                case 'current':
                  shouldInclude = ['scheduled', 'in_progress'].includes(branch.status);
                  break;
                case 'previous':
                  shouldInclude = branch.status === 'completed';
                  break;
                case 'recurring':
                  shouldInclude = pickup.pickupType === 'recurring';
                  break;
              }

              if (shouldInclude) {
                processedPickups.push({
                  id: doc.id,
                  factoryId: pickup.factoryId,
                  factoryName: factoryNamesMap[pickup.factoryId],
                  timeSlot: pickup.timeSlot,
                  pickupType: pickup.pickupType,
                  createdAt: pickup.createdAt,
                  branch: {
                    ...branch,
                    branchName: branchNamesMap[branch.branchId]
                  }
                });
              }
            }
          });
        });

        setPendingCount(pendingCounter); // Set the pending count
        processedPickups.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);
        setPickups(processedPickups);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user?.uid, subTab]);

  // Rest of your existing functions...
  const handlePickupAction = async (pickupId, branchId, approved) => {
    try {
      await updatePickupApproval(pickupId, branchId, approved);
      if (approved) {
        setShowConfirmationSheet(true);
      }
      setPickups(prevPickups => 
        prevPickups.filter(pickup => 
          !(pickup.id === pickupId && pickup.branch.branchId === branchId)
        )
      );
      // Update pending count after action
      setPendingCount(prev => prev - 1);
    } catch (error) {
      console.error("Error updating pickup:", error);
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'pending_branch_approval':
        return 'bg-yellow-100 text-yellow-800';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-purple-100 text-purple-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Pagination calculations
  const totalItems = pickups.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const currentItems = pickups.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  
  return (
    <div className={`bg-white rounded-lg shadow-md p-4 md:p-6 flex flex-col min-h-[600px] ${isRTL ? 'rtl' : 'ltr'}`}>
        {/* Tabs */}
        <div className="flex mb-6 border-b overflow-x-auto" style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
        <div className={`flex gap-4 ${isRTL ? 'mr-0' : 'ml-0'}`}>
          <button
            onClick={() => setRequestsSubTab('pending')}
            className={`px-4 py-2 whitespace-nowrap relative ${
              subTab === 'pending' 
                ? 'border-b-2 border-blue-500 text-blue-600' 
                : 'text-gray-500'
            }`}
          >
            <FaBell className={`inline ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {text.pendingRequests}
            {pendingCount > 0 && (
                <span className={`
                  absolute 
                  ${isRTL ? '-right-0' : '-left-0'} 
                  -top-0
                  bg-red-500 
                  text-white 
                  text-xs 
                  font-bold
                  rounded-full 
                  min-w-[22px]
                  h-[22px]
                  flex 
                  items-center 
                  justify-center 
                  transform 
                  scale-70
                  shadow-sm
                `}>
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setRequestsSubTab('current')}
            className={`px-4 py-2 whitespace-nowrap ${subTab === 'current' 
              ? 'border-b-2 border-blue-500 text-blue-600' 
              : 'text-gray-500'}`}
          >
            <FaCalendarAlt className={`inline ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {text.currentRequests}
          </button>
          <button
            onClick={() => setRequestsSubTab('previous')}
            className={`px-4 py-2 ${subTab === 'previous' 
              ? 'border-b-2 border-blue-500 text-blue-600' 
              : 'text-gray-500'}`}
          >
            <FaHistory className={`inline ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {text.previousRequests}
          </button>
          <button
            onClick={() => setRequestsSubTab('recurring')}
            className={`px-4 py-2 ${subTab === 'recurring' 
              ? 'border-b-2 border-blue-500 text-blue-600' 
              : 'text-gray-500'}`}
          >
            <FaCalendarWeek className={`inline ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {text.recurringRequests}
          </button>
        </div>
      </div>

      <div className="flex-grow mb-6">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : pickups.length === 0 ? (
          <EmptyState 
            subTab={subTab} 
            text={text}  // Pass the processed text
            isRTL={isRTL} 
            setRequestsSubTab={setRequestsSubTab} 
          />
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-blue-50">
                  <tr>
                    <th className="px-4 py-2 text-right">{text.actions}</th>
                    <th className="px-4 py-2 text-right">{text.status}</th>
                    <th className="px-4 py-2 text-right">{text.pickupDateTime}</th>
                    <th className="px-4 py-2 text-right">{text.materialType}</th>
                    <th className="px-4 py-2 text-right">{text.branchName}</th>
                    <th className="px-4 py-2 text-right">{text.factoryName}</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.map((pickup, index) => (
                    <tr key={pickup.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <td className="px-4 py-2 text-right">
                        {pickup.branch.status === 'pending_branch_approval' && (
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => handlePickupAction(pickup.id, pickup.branch.branchId, true)}
                              className="px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600"
                            >
                              {text.accept}
                            </button>
                            <button
                              onClick={() => handlePickupAction(pickup.id, pickup.branch.branchId, false)}
                              className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600"
                            >
                              {text.reject}
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <span className={`px-2 py-1 rounded-full ${getStatusColor(pickup.branch.status)}`}>
                          {text[pickup.branch.status]}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right">
                        {pickup.timeSlot ? (
                          <div>
                            <div>{new Date(pickup.timeSlot.date).toLocaleDateString()}</div>
                            <div className="text-sm text-gray-600">
                              {text.from} {pickup.timeSlot.startTime} {text.to} {pickup.timeSlot.endTime}
                            </div>
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {translateMaterialType(pickup.branch.materialType, isRTL ? 'ar' : 'en')}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {pickup.branch.branchName || text.loading}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {pickup.factoryName || text.loading}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-4">
              {currentItems.map((pickup) => (
                <div key={pickup.id} className="bg-white p-4 rounded-lg shadow border border-gray-200">
                  <div className={`flex justify-between items-center mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span className="font-semibold">{text.factoryName}:</span>
                    <span>{pickup.factoryName || text.loading}</span>
                  </div>

                  <div className={`flex justify-between items-center mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span className="font-semibold">{text.branchName}:</span>
                    <span>{pickup.branch.branchName || text.loading}</span>
                  </div>
                  
                  <div className={`flex justify-between items-center mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span className="font-semibold">{text.materialType}:</span>
                    <span>{translateMaterialType(pickup.branch.materialType, isRTL ? 'ar' : 'en')}</span>
                  </div>

                  <div className={`flex justify-between items-center mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span className="font-semibold">{text.pickupDateTime}:</span>
                    {pickup.timeSlot ? (
                      <div className={`text-${isRTL ? 'left' : 'right'}`}>
                        <div>{new Date(pickup.timeSlot.date).toLocaleDateString()}</div>
                        <div className="text-sm text-gray-600">
                          {text.from} {pickup.timeSlot.startTime} {text.to} {pickup.timeSlot.endTime}
                        </div>
                      </div>
                    ) : '-'}
                  </div>

                  <div className={`flex justify-between items-center mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span className="font-semibold">{text.status}:</span>
                    <span className={`px-2 py-1 rounded-full ${getStatusColor(pickup.branch.status)}`}>
                      {text[pickup.branch.status]}
                    </span>
                  </div>

                  {pickup.branch.status === 'pending_branch_approval' && (
                    <div className="flex gap-2 mt-4 pt-4 border-t">
                      <button
                        onClick={() => handlePickupAction(pickup.id, pickup.branch.branchId, true)}
                        className="flex-1 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
                      >
                        {text.accept}
                      </button>
                      <button
                        onClick={() => handlePickupAction(pickup.id, pickup.branch.branchId, false)}
                        className="flex-1 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                      >
                        {text.reject}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {!isLoading && pickups.length > 0 && (
        <div className="mt-auto pt-4 border-t">
          <div className="flex justify-center items-center">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className={`px-3 py-1 bg-blue-500 text-white rounded-md mr-2 ${
                currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <FaChevronLeft />
            </button>
            <span className="px-3 py-1">
              {text.page} {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className={`px-3 py-1 bg-blue-500 text-white rounded-md ml-2 ${
                currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <FaChevronRight />
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Bottom Sheet */}
      {showConfirmationSheet && (
        <div className="fixed inset-x-0 bottom-0 bg-white shadow-lg rounded-t-xl p-4 transform transition-transform duration-300 ease-in-out">
          <div className={`text-center ${isRTL ? 'rtl' : 'ltr'}`}>
            <p className="text-lg font-semibold mb-4">{text.requestMovedToCurrentPickups}</p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => {
                  setShowConfirmationSheet(false);
                  setRequestsSubTab('current');
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                {text.viewCurrentPickups}
              </button>
              <button
                onClick={() => setShowConfirmationSheet(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                {text.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



function BranchesContent({ branches, onUpdateStatus, text, isRTL }) {
  const router = useRouter();
  // Add state for branches
  const [localBranches, setLocalBranches] = useState(branches);

  // Update local state when props change
  useEffect(() => {
    setLocalBranches(branches);
  }, [branches]);

  const onUpdateMaterialAvailability = async (branchId, materialType, isAvailable) => {
    try {
      // Optimistically update the UI first
      setLocalBranches(prevBranches => {
        return prevBranches.map(branch => {
          if (branch.id === branchId) {
            return {
              ...branch,
              materials: {
                ...branch.materials,
                [materialType]: {
                  ...branch.materials[materialType],
                  materialAvailability: isAvailable ? 'available' : 'unavailable'
                }
              }
            };
          }
          return branch;
        });
      });

      // Then update the backend
      await updateMaterialAvailability(branchId, materialType, isAvailable);
    } catch (error) {
      console.error("Error updating material availability:", error);
      // Revert the optimistic update if the backend call fails
      setLocalBranches(branches);
    }
  };

  // Use localBranches instead of branches in your render logic
  const paginatedBranches = localBranches.reduce((acc, branch) => {
    if (branch.materials && Object.keys(branch.materials).length > 0) {
      Object.entries(branch.materials).forEach(([materialType, material]) => {
        acc.push({ ...branch, material: { type: materialType, ...material } });
      });
    }
    return acc;
  }, []);

  const [currentPage, setCurrentPage] = useState(1);
  const tableContainerRef = useRef(null);
  const itemsPerPage = 10;

  useEffect(() => {
    if (tableContainerRef.current && isRTL) {
      tableContainerRef.current.scrollLeft = tableContainerRef.current.scrollWidth;
    }
  }, [isRTL]);

  const totalItems = paginatedBranches.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const currentItems = paginatedBranches.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleBranchClick = (branchId) => {
    router.push(`/dashboardCo/branch/${branchId}`);
  };

  return (
    <div className={`bg-white rounded-lg shadow-md p-4 md:p-6 flex flex-col h-full ${isRTL ? 'rtl' : 'ltr'}`}>
      <h2 className={`text-xl md:text-2xl font-semibold mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>{text.branchOverview}</h2>
      {totalItems === 0 ? (
        <div className="text-center text-gray-500 flex-grow flex items-center justify-center">{text.noBranches}</div>
      ) : (<>
        <div ref={tableContainerRef} className="flex-grow">
        {/* Desktop table with clickable rows */}
<div className="hidden md:block overflow-x-auto">
  <table className="w-full border-collapse">
    <thead className="bg-blue-50">
      <tr>
        <th className="px-4 py-2 text-right border-b-2 border-blue-200 text-xs md:text-sm">{text.status}</th>
        <th className="px-4 py-2 text-right border-b-2 border-blue-200 text-xs md:text-sm">{text.materialAvailability}</th>
        <th className="px-4 py-2 text-right border-b-2 border-blue-200 text-xs md:text-sm">{text.materialType}</th>
        <th className="px-4 py-2 text-right border-b-2 border-blue-200 text-xs md:text-sm">{text.branchName}</th>
      </tr>
    </thead>
    <tbody>
      {currentItems.map((item, index) => (
        <tr 
          key={index} 
          className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 cursor-pointer transition-colors`}
          onClick={() => handleBranchClick(item.id)}
        >
          <td className="px-4 py-2 text-right text-xs md:text-sm">
            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">{text.pending}</span>
          </td>
          <td className="px-4 py-2 text-right text-xs md:text-sm" onClick={(e) => e.stopPropagation()}>
            {item.material && (
              <select
                value={item.material.materialAvailability === 'available' ? 'inStock' : 'outOfStock'}
                onChange={(e) => onUpdateMaterialAvailability(item.id, item.material.type, e.target.value === 'inStock')}
                className={`px-2 py-1 rounded-full text-sm ${
                  item.material.materialAvailability === 'available' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-orange-100 text-orange-800'
                }`}
              >
                <option value="inStock">{text.inStock}</option>
                <option value="outOfStock">{text.outOfStock}</option>
              </select>
            )}
          </td>
          <td className="px-4 py-2 text-right text-xs md:text-sm">
            {item.material ? translateMaterialType(item.material.type, isRTL ? 'ar' : 'en') : text.noMaterial}
          </td>
          <td className="px-4 py-2 text-right text-xs md:text-sm">{item.name}</td>
        </tr>
      ))}
    </tbody>
  </table>
</div>

          {/* Mobile view with details button */}
          <div className="md:hidden">
            {currentItems.map((item, index) => (
              <div key={index} className={`p-4 mb-4 rounded-lg ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} border border-gray-200`}>
                <div className={`flex justify-between items-center mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span className="font-semibold">{text.branchName}:</span>
                  <span>{item.name}</span>
                </div>
                <div className={`flex justify-between items-center mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span className="font-semibold">{text.materialType}:</span>
                  <span>
                    {item.material ? translateMaterialType(item.material.type, isRTL ? 'ar' : 'en') : text.noMaterial}
                  </span>
                </div>
                <div className={`flex justify-between items-center mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span className="font-semibold">{text.materialAvailability}:</span>
                  {item.material && (
                    <select
                      value={item.material.materialAvailability === 'available' ? 'inStock' : 'outOfStock'}
                      onChange={(e) => onUpdateMaterialAvailability(item.id, item.material.type, e.target.value === 'inStock')}
                      className={`px-2 py-1 rounded-full text-sm ${
                        item.material.materialAvailability === 'available' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-orange-100 text-orange-800'
                      }`}
                    >
                      <option value="inStock">{text.inStock}</option>
                      <option value="outOfStock">{text.outOfStock}</option>
                    </select>
                  )}
                </div>
                <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span className="font-semibold">{text.status}:</span>
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                    {text.pending}
                  </span>
                </div>

                {/* Details Button - Added at the bottom */}
                <div className="mt-4 flex justify-center items-center pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleBranchClick(item.id)}
                    className="w-1/2 mt-auto py-2 px-4 border border-[#87CEEB]  rounded-xl hover:bg-[#87CEEB] hover:text-white transition-colors duration-300 flex items-center justify-center gap-2"
                  >
                    <span className='text-gray-700'>{isRTL ? 'التفاصيل' : 'Details'}</span>
                    <FaChevronRight className={`text-[#87CEEB] ${isRTL ? 'rotate-180' : ''}`} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-4 flex justify-center items-center">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            className={`px-3 py-1 bg-blue-500 text-white rounded-md mr-2 ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={currentPage === 1}
          ><FaChevronLeft /></button>
          <span className="px-3 py-1">{text.page} {currentPage} {"/ "} {totalPages}</span>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            className={`px-3 py-1 bg-blue-500 text-white rounded-md ml-2 ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={currentPage === totalPages}
          ><FaChevronRight /></button>
        </div>
      </>)}
    </div>
  );
}


const getStatusColor = (status) => {
  if (!status) return 'bg-blue-200 text-gray-800'; // Default color for no status
  switch (status) {
    case 'pendingPickup':
      return 'bg-yellow-200 text-yellow-800';
    case 'pickedUpToday':
      return 'bg-green-200 text-green-800';
    case 'pickedUpThisWeek':
      return 'bg-blue-200 text-blue-800';
    case 'pickedUpThisMonth':
      return 'bg-purple-200 text-purple-800';
    case 'outOfStock':
      return 'bg-red-200 text-red-800';
    default:
      return 'bg-gray-200 text-gray-800';
  }
};

function MaterialsContent({ branches, onUpdateStatus, text, isRTL }) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className={`text-2xl font-semibold mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>{text.availableMaterials}</h2>
        <ul className="space-y-4">
          {branches.flatMap((branch) =>
            (branch.materials || []).filter(m => m.status !== 'outOfStock').map((material, index) => (
              <li key={`${branch.id}-${index}`} className="bg-white rounded-lg shadow-md p-4">
                <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div>
                    <span className="font-semibold">{material.type}</span>
                    <span className={`${isRTL ? 'mr-4' : 'ml-4'} text-gray-600`}>{branch.name}</span>
                  </div>
                  <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span className={`${isRTL ? 'ml-4' : 'mr-4'}`}>{material.frequency}</span>
                    <select
                      value={material.status}
                      onChange={(e) => onUpdateStatus(branch.id, index, e.target.value)}
                      className="border rounded px-2 py-1"
                    >
                      <option value="pendingPickup">{text.pendingPickup}</option>
                      <option value="pickedUpToday">{text.pickedUpToday}</option>
                      <option value="pickedUpThisWeek">{text.pickedUpThisWeek}</option>
                      <option value="pickedUpThisMonth">{text.pickedUpThisMonth}</option>
                      <option value="outOfStock">{text.outOfStock}</option>
                    </select>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
      <div>
        <h2 className={`text-2xl font-semibold mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>{text.outOfStockMaterials}</h2>
        <ul className="space-y-4">
          {branches.flatMap((branch) =>
            (branch.materials || []).filter(m => m.status === 'outOfStock').map((material, index) => (
              <li key={`${branch.id}-${index}`} className="bg-white rounded-lg shadow-md p-4">
                <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div>
                    <span className="font-semibold">{material.type}</span>
                    <span className={`${isRTL ? 'mr-4' : 'ml-4'} text-gray-600`}>{branch.name}</span>
                  </div>
                  <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span className={`${isRTL ? 'ml-4' : 'mr-4'}`}>{material.frequency}</span>
                    <button
                      onClick={() => onUpdateStatus(branch.id, index, 'pendingPickup')}
                      className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition duration-300"
                    >
                      {text.pendingPickup}
                    </button>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}


// Replace the existing NotificationsContent component
function NotificationsContent({ text, isRTL }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  // Listen for unread notifications count
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

  return (
    <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
      <div className="flex items-center justify-between mb-0">
       
        {unreadCount > 0 && (
          <div className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
            {unreadCount} {text.new}
          </div>
        )}
      </div>
      
      <NotificationsList text={text} isRTL={isRTL} />
    </div>
  );
}

function StatCard({ icon, title, value }) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={`bg-blue-100 p-3 rounded-full text-2xl ${isRTL ? 'ml-4' : 'mr-4'}`}>
          {icon}
        </div>
        <div className={`${isRTL ? 'text-right' : 'text-left'}`}>
          <h3 className="text-gray-500 text-sm">{title}</h3>
          <p className="text-2xl font-semibold">{value}</p>
        </div>
      </div>
    </div>
  );
}

function BottomSheet({ children, onClose, isRTL }) {
  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", bounce: 0, duration: 0.4 }}
      className="fixed inset-x-0 bottom-0 bg-white rounded-t-3xl shadow-lg p-6 z-50"
      style={{ maxHeight: "80vh", overflowY: "auto" }}
    >
      <button
        onClick={onClose}
        className={`absolute top-4 ${isRTL ? 'left-4' : 'right-4'} text-gray-500 hover:text-gray-700`}
      >
        <FaTimes size={24} />
      </button>
      <div className="h-full overflow-y-auto">
        {children}
      </div>
    </motion.div>
  );
}

function BranchSheetContent({ newBranch, setNewBranch, text, isRTL, isLoaded, mapOptions, onMapClick, onMarkerDragEnd, showSearch, setShowSearch, searchBox, setSearchBox, onPlacesChanged, location, locationAddress, userPhoneNumber }) {
  const rtlSelectClass = isRTL ? 'rtl-select' : '';

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    setNewBranch(prev => ({ ...prev, images: files }));
  };

  const handleUseAccountNumber = (e) => {
    if (e.target.checked) {
      setNewBranch({ ...newBranch, phoneNumber: userPhoneNumber || '' });
    } else {
      setNewBranch({ ...newBranch, phoneNumber: '' });
    }
  };

  const handleFrequencyChange = (e) => {
    const frequency = e.target.value;
    setNewBranch(prev => ({
      ...prev,
      frequency,
      pickupDay: '',
      pickupDate: ''
    }));
  };

  return (
    <div className={`space-y-5 max-w-md mx-auto px-4 ${isRTL ? 'rtl' : 'ltr'}`}>
      <style jsx>{`
        .rtl-select {
          direction: rtl;
          text-align: right;
        }
        .rtl-select option {
          direction: rtl;
          unicode-bidi: bidi-override;
        }
        .field-separator {
          border-top: 1px solid #87CEEB;
          margin: 0.5rem 0;
        }
      `}</style>
      <h3 className={`text-xl font-semibold mb-6 ${isRTL ? 'text-right' : 'text-left'}`}>{text.registerBranch}</h3>
      
      {/* Branch Name */}
      <div className="space-y-2">
        <label className={`block text-sm font-medium text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>
          {text.branchName}
        </label>
        <input
          type="text"
          value={newBranch.name}
          onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })}
          required
          placeholder={text.branchNameDescription}
          className={`w-full border rounded px-3 py-2 ${isRTL ? 'text-right' : 'text-left'}`}
        />
      </div>

      <div className="field-separator" />

      {/* Material Type */}
      <div className="space-y-2">
        <label className={`block text-sm font-medium text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>
          {text.materialType}
        </label>
        <select
          value={newBranch.materialType}
          onChange={(e) => setNewBranch({ ...newBranch, materialType: e.target.value })}
          required
          className={`w-full border rounded px-3 py-2 ${isRTL ? 'text-right' : 'text-left'} ${rtlSelectClass}`}
        >
          <option value="">{text.materialTypeDescription}</option>
          <option value="plastic">{text.plastic}</option>
          <option value="paper">{text.paper}</option>
          <option value="paperAndCardboard">{text.paperAndCardboard}</option>
          <option value="glass">{text.glass}</option>
        </select>
      </div>

      <div className="field-separator" />

      {/* Frequency */}
      <div className="space-y-2">
        <label className={`block text-sm font-medium text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>
          {text.materialPickupFrequencyTitle}
        </label>
        <select
          value={newBranch.frequency}
          onChange={handleFrequencyChange}
          required
          className={`w-full border rounded px-3 py-2 ${isRTL ? 'text-right' : 'text-left'} ${rtlSelectClass}`}
        >
          <option value="">{text.frequencyDescription}</option>
          <option value="daily">{text.daily}</option>
          <option value="weekly">{text.weekly}</option>
          <option value="monthly">{text.monthly}</option>
          <option value="one_time">{text.oneTime}</option>
        </select>
      </div>

      {newBranch.frequency === 'one_time' && (
        <>
          <div className="field-separator" />
          <div className="space-y-2">
            <label className={`block text-sm font-medium text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>
              {text.pickupDate}
            </label>
            <div className="relative">
              <input
                type="date"
                value={newBranch.pickupDate}
                onChange={(e) => setNewBranch({ ...newBranch, pickupDate: e.target.value })}
                required
                className={`w-full border rounded px-3 py-2 ${isRTL ? 'text-right pr-10' : 'text-left pl-10'} appearance-none`}
                style={{ height: '40px' }}
              />
              <FaCalendarAlt className={`absolute top-3 ${isRTL ? 'left-3' : 'right-3'} text-gray-400`} />
            </div>
          </div>
        </>
      )}

      <div className="field-separator" />

       {/* Phone Number */}
              <div className="space-y-2">
                <label className={`block text-sm font-medium text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {text.branchPhoneNumber}
                </label>
                <input
                  type="tel"
                  value={newBranch.phoneNumber || ''}
                  onChange={(e) => setNewBranch({ ...newBranch, phoneNumber: e.target.value })}
                  required
                  placeholder={text.branchPhoneNumberDescription}
                  className={`w-full border rounded px-3 py-2 ${isRTL ? 'text-right' : 'text-left'}`}
                />
                <div className="flex items-center mt-2">
                  <input
                    type="checkbox"
                    id="useAccountNumber"
                    onChange={handleUseAccountNumber}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="useAccountNumber" className={`ml-2 block text-sm text-gray-900 ${isRTL ? 'mr-2' : 'ml-2'}`}>
                    {text.useAccountNumber}
                  </label>
                </div>
              </div>

      <div className="field-separator" />

      {/* Quantity */}
      <div className="space-y-2">
            <label className={`block text-sm font-medium text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>
              {text.quantity}
            </label>
            <input
              type="number"
              value={newBranch.quantity}
              onChange={(e) => setNewBranch({ ...newBranch, quantity: e.target.value })}
              placeholder={text.quantityDescription}
              className={`w-full border rounded px-3 py-2 ${isRTL ? 'text-right' : 'text-left'}`}
            />
          </div>

          <div className="field-separator" />



      {/* Location */}
      <div className="space-y-2">
        <label className={`block text-sm font-medium text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>
          {text.location}
        </label>
        <div className={`mb-2 text-sm text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>
          {text.clickOrDragMarker}
          <FaMousePointer className={`inline ${isRTL ? 'mr-1' : 'ml-1'}`} />
        </div>
        <div className={`mb-2 text-md text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>
          {text.or}
        </div>
        <button
          type="button"
          onClick={() => setShowSearch(!showSearch)}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
        >
          {showSearch ? text.hideSearch : text.searchLocation}
        </button>
        {showSearch && (
          <StandaloneSearchBox
            onLoad={ref => setSearchBox(ref)}
            onPlacesChanged={onPlacesChanged}
          >
            <div className="mt-2 relative">
              <input
                type="text"
                placeholder={text.searchPlaceholder}
                className={`shadow appearance-none border-2 border-blue-400 rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${isRTL ? 'text-right pr-10 pl-3' : 'text-left pl-10 pr-3'}`}
              />
              <FaSearch className={`absolute top-3 ${isRTL ? 'left-3' : 'right-3'} text-gray-400`} />
            </div>
          </StandaloneSearchBox>
        )}
      </div>
      {isLoaded && (
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '300px', marginTop: '1rem' }}
          center={location}
          zoom={10}
          onClick={onMapClick}
          options={mapOptions}
        >
          <Marker
            position={location}
            draggable={true}
            onDragEnd={onMarkerDragEnd}
          />
        </GoogleMap>
      )}
      {locationAddress && (
        <div className={`mt-2 text-sm text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>
          {text.selectedLocation}: {locationAddress}
          <FaMapMarkerAlt className={`inline ${isRTL ? 'mr-1' : 'ml-1'}`} />
        </div>
      )}

      <div className="field-separator" />


      {/* Images */}
      <div className="space-y-2">
        <label className={`block text-sm font-medium text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>
          {text.images}
        </label>
        <div className="flex items-center justify-center w-full">
          <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <svg className="w-10 h-10 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
              <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">{text.clickToUpload}</span> {text.orDragAndDrop}</p>
              <p className="text-xs text-gray-500">{text.imageFormats}</p>
            </div>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
            />
          </label>
        </div>
        {newBranch.images.length > 0 && (
          <div className="mt-2">
            <p className="text-sm text-gray-500">{newBranch.images.length} {text.imagesSelected}</p>
          </div>
        )}
      </div>
    </div>
  );
}


function MaterialSheetContent({ newBranch, setNewBranch, onSubmit, onClose, text, isRTL }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(e);
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3 className="text-xl font-semibold mb-4">{text.addMaterial}</h3>
      <input
        type="text"
        value={newBranch.materialType}
        onChange={(e) => setNewBranch({ ...newBranch, materialType: e.target.value })}
        placeholder={text.materialType}
        className="w-full border rounded px-3 py-2 mb-4"
      />
      <select
        value={newBranch.frequency}
        onChange={(e) => setNewBranch({ ...newBranch, frequency: e.target.value })}
        className="w-full border rounded px-3 py-2 mb-4"
      >
        <option value="daily">{text.daily}</option>
        <option value="weekly">{text.weekly}</option>
        <option value="monthly">{text.monthly}</option>
        <option value="one_time">{text.oneTime}</option>
      </select>
      <div className="flex justify-between">
        <button
          type="button"
          onClick={onClose}
          className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition duration-300"
        >
          {text.close}
        </button>
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition duration-300"
        >
          {text.submit}
        </button>
      </div>
    </form>
  );
}