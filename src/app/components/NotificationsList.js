'use client';
import { useInView } from 'react-intersection-observer';
import { useState, useEffect, useCallback } from 'react';
import { collection, query, orderBy, limit, startAfter, getDocs, onSnapshot, doc } from 'firebase/firestore';
import { db, markNotificationsAsRead, markNotificationClicked, requestNotificationPermission, NOTIFICATION_TYPES } from '../utils/firebase';
import { useAuth } from '@/app/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { IoNotifications, IoCheckmarkCircle } from 'react-icons/io5';
import { FaClock, FaCheckCircle, FaTruck, FaCheckDouble, FaTimesCircle, FaBell } from 'react-icons/fa';
import { translateMaterialType } from '../utils/helpers';

// Add translations object
const translations = {
    ar: {
      // Notification types
      new_pickup_request: 'طلب استلام جديد',
      pickup_approved: 'تمت الموافقة على الطلب',
      pickup_started: 'بدأ الاستلام',
      pickup_completed: 'تم اكتمال الاستلام',
      pickup_cancelled: 'تم إلغاء الطلب',
      factory_pickup_scheduled: 'تم جدولة عملية جمع جديدة',
      factory_pickup_in_progress: 'بدأت عملية الجمع',
      factory_pickup_completed: 'تم إكمال عملية الجمع',
      
      // UI elements
      notifications: 'الإشعارات',
      enableNotifications: 'تفعيل الإشعارات',
      markAllRead: 'تعيين الكل كمقروء',
      noNotifications: 'لا توجد إشعارات',
      
      // Messages
      newPickupFor: 'طلب استلام جديد للفروع:',
      branch: 'فرع',
      date: 'التاريخ',
      time: 'الوقت',
      
      // Notification messages
      factory_pickup_scheduled_msg: 'تم جدولة عملية جمع لفرع: ',
      factory_pickup_in_progress_msg: 'بدأت عملية الجمع لفرع: ',
      factory_pickup_completed_msg: 'تم إكمال عملية الجمع لفرع: ',
      notificationsBlocked: 'تم حظر الإشعارات في المتصفح',
      enableInstructions: 'لتمكين الإشعارات، يرجى اتباع الخطوات التالية:',
      notificationSteps: {
        step3: '"قم بتغيير إعدادت المتصفح للاشعارات، من "حظر" إلى "سماح'
      }
    },
    en: {
      // Same structure as Arabic but with English translations
      new_pickup_request: 'New Pickup Request',
      pickup_approved: 'Pickup Request Approved',
      pickup_started: 'Pickup Started',
      pickup_completed: 'Pickup Completed',
      pickup_cancelled: 'Pickup Cancelled',
      factory_pickup_scheduled: 'New pickup has been scheduled',
      factory_pickup_in_progress: 'Pickup has started',
      factory_pickup_completed: 'Pickup has been completed',
      
      notifications: 'Notifications',
      enableNotifications: 'Enable Notifications',
      markAllRead: 'Mark All as Read',
      noNotifications: 'No notifications',
      
      newPickupFor: 'New pickup request for branches:',
      branch: 'Branch',
      date: 'Date',
      time: 'Time',
      
      factory_pickup_scheduled_msg: 'Pickup scheduled for branch: ',
      factory_pickup_in_progress_msg: 'Pickup started for branch: ',
      factory_pickup_completed_msg: 'Pickup completed for branch: ',
      notificationsBlocked: 'Notifications are blocked in your browser',
      enableInstructions: 'To enable notifications, please follow these steps:',
      notificationSteps: {
        step3: 'Change notifications settings in browser from "Block" to "Allow"'
      }
    }
  };
  

  // Update other functions to use the consolidated translations
  const getNotificationTitle = (type, language) => {
    return translations[language]?.[type] || type;
  };

// Add these translations at the top of the file
const notificationText = {
  ar: {
    notifications: 'الإشعارات',
    enableNotifications: 'تفعيل الإشعارات',
    markAllRead: 'تعيين الكل كمقروء',
    noNotifications: 'لا توجد إشعارات',
    branch: 'فرع',
    new_pickup_request: 'طلب استلام جديد',
    pickup_approved: 'تمت الموافقة على الطلب',
    pickup_started: 'بدأ الاستلام',
    pickup_completed: 'تم اكتمال الاستلام',
    pickup_cancelled: 'تم إلغاء الطلب',
     date: 'التاريخ',
        time: 'الوقت'
  },
  en: {
    notifications: 'Notifications',
    enableNotifications: 'Enable Notifications',
    markAllRead: 'Mark All as Read',
    noNotifications: 'No notifications',
    branch: 'Branch',
    new_pickup_request: 'New Pickup Request',
    pickup_approved: 'Pickup Request Approved',
    pickup_started: 'Pickup Started',
    pickup_completed: 'Pickup Completed',
    pickup_cancelled: 'Pickup Cancelled',
  }
};

// Update getNotificationMessage to use the consolidated translations
const getNotificationMessage = (notification, isRTL) => {
    const lang = isRTL ? 'ar' : 'en';
    
    // If it's a factory notification
    if (notification.type.startsWith('factory_')) {
      const timeSlot = notification.timeSlot;
      let message = `${translations[lang][`${notification.type}_msg`]}${notification.branchName}`;
      
      // Add date and time if available
      if (timeSlot) {
        message += `\n${translations[lang].date}: ${timeSlot.date}`;
        message += `\n${translations[lang].time}: ${timeSlot.startTime} - ${timeSlot.endTime}`;
      }
      
      return message;
    }
    
    // If it's a pickup request with branches
    if (notification.branches) {
      const branchNames = notification.branches.map(b => b.branchName).join('، ');
      return `${translations[lang].newPickupFor} ${branchNames}`;
    }
    
    return notification.message;
  };
  


export default function NotificationsList({ isRTL }) {
    const { user } = useAuth();
    const router = useRouter();
    const [displayedNotifications, setDisplayedNotifications] = useState([]);
    const [allNotifications, setAllNotifications] = useState([]); // Add this line
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const NOTIFICATIONS_PER_PAGE = 20;
  
    const { ref, inView } = useInView({
      threshold: 0,
    });

 // Initial load of notifications
useEffect(() => {
    if (!user?.uid) return;
  
    const notificationsRef = doc(db, 'notifications', user.uid);
    
    const unsubscribe = onSnapshot(notificationsRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setNotificationsEnabled(data.notificationsEnabled || false);
        
        // Get notifications array and sort by createdAt
        const notificationsArray = data.notifications || [];
        const sortedNotifications = notificationsArray.sort((a, b) => 
          new Date(b.createdAt) - new Date(a.createdAt)
        );
        
        // Implement pagination on the client side
        const initialNotifications = sortedNotifications.slice(0, NOTIFICATIONS_PER_PAGE);
        setDisplayedNotifications(initialNotifications);
        setHasMore(sortedNotifications.length > NOTIFICATIONS_PER_PAGE);
        setAllNotifications(sortedNotifications); // Store all notifications for pagination
        setLoading(false);
      } else {
        setDisplayedNotifications([]);
        setHasMore(false);
        setAllNotifications([]);
        setLoading(false);
      }
    });
  
    return () => unsubscribe();
  }, [user?.uid]);
  
  // Load more when scrolling
  useEffect(() => {
    if (inView && hasMore && !loadingMore) {
      setLoadingMore(true);
      const currentLength = displayedNotifications.length;
      const nextBatch = allNotifications.slice(
        currentLength,
        currentLength + NOTIFICATIONS_PER_PAGE
      );
      
      if (nextBatch.length > 0) {
        setDisplayedNotifications(prev => [...prev, ...nextBatch]);
        setHasMore(currentLength + nextBatch.length < allNotifications.length);
      }
      setLoadingMore(false);
    }
  }, [inView, hasMore, allNotifications]);

    
      // Handle notification click
      const handleNotificationClick = useCallback(async (notification) => {
        if (!notification.clicked) {
          await markNotificationClicked(user.uid, notification.id);
        }
        if (notification.actionUrl) {
          router.push(notification.actionUrl);
        }
      }, [user?.uid, router]);
    
      // Handle enable notifications
      const handleEnableNotifications = async () => {
        const enabled = await requestNotificationPermission(user.uid);
        setNotificationsEnabled(enabled);
      };
    
   // Mark all as read
const handleMarkAllRead = async () => {
  const unreadIds = displayedNotifications
    .filter(n => !n.read)
    .map(n => n.id);
  if (unreadIds.length > 0) {
    await markNotificationsAsRead(user.uid, unreadIds);
  }
};
      

  const getStatusIcon = (type) => {
    switch(type) {
      case NOTIFICATION_TYPES.NEW_PICKUP_REQUEST:
        return <FaClock className="text-yellow-500" />;
      case NOTIFICATION_TYPES.PICKUP_APPROVED:
        return <FaCheckCircle className="text-green-500" />;
      case NOTIFICATION_TYPES.PICKUP_STARTED:
        return <FaTruck className="text-orange-500" />;
      case NOTIFICATION_TYPES.PICKUP_COMPLETED:
        return <FaCheckDouble className="text-green-500" />;
      case NOTIFICATION_TYPES.PICKUP_CANCELLED:
        return <FaTimesCircle className="text-red-500" />;
      case NOTIFICATION_TYPES.FACTORY_PICKUP_SCHEDULED:
        return <FaCheckCircle className="text-green-500" />;
      case NOTIFICATION_TYPES.FACTORY_PICKUP_IN_PROGRESS:
        return <FaTruck className="text-orange-500" />;
      case NOTIFICATION_TYPES.FACTORY_PICKUP_COMPLETED:
        return <FaCheckDouble className="text-green-500" />;
      default:
        return <IoNotifications className="text-gray-500" />;
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-40">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
    </div>;
  }

  return (
    <div className="space-y-4">
      <div className={`flex justify-between items-center mb-6 flex-wrap gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <h2 className="text-xl font-semibold">
          {translations[isRTL ? 'ar' : 'en'].notifications}
        </h2>
        <div className="flex gap-2 flex-wrap">
          {!notificationsEnabled && (
            <button
              onClick={handleEnableNotifications}
              className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              {translations[isRTL ? 'ar' : 'en'].enableNotifications}
            </button>
          )}
          {displayedNotifications.some(n => !n.read) && (
            <button
              onClick={handleMarkAllRead}
              className="px-3 py-1.5 text-sm text-blue-500 hover:text-blue-600"
            >
              {translations[isRTL ? 'ar' : 'en'].markAllRead}
            </button>
          )}
        </div>
      </div>

  
      {displayedNotifications.length === 0 ? (
  <div className="text-center py-8">
    <IoNotifications className="mx-auto text-4xl mb-4 text-gray-400" />
    <p className="text-gray-500 mb-4">{translations[isRTL ? 'ar' : 'en'].noNotifications}</p>
    
    {!notificationsEnabled && typeof Notification !== 'undefined' && Notification.permission !== 'granted' && (
      <>
        {Notification.permission === 'denied' ? (
          <div className="max-w-md mx-auto text-center">
            <p className="text-gray-600 mb-3">
              {translations[isRTL ? 'ar' : 'en'].notificationsBlocked}
            </p>
            <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600">
              <p className="mb-2">{translations[isRTL ? 'ar' : 'en'].enableInstructions}</p>
              <ol className={`text-${isRTL ? 'right' : 'left'} space-y-1`}>
                <li>{translations[isRTL ? 'ar' : 'en'].notificationSteps.step3}</li>
              </ol>
            </div>
          </div>
        ) : (
          <button
            onClick={handleEnableNotifications}
            className="mx-auto px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2 justify-center"
          >
            <FaBell />
            {translations[isRTL ? 'ar' : 'en'].enableNotifications}
          </button>
        )}
      </>
    )}
  </div>
) : (
        <>
          <div className="space-y-3">
            {displayedNotifications.map((notification) => (
              <div 
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`p-4 rounded-lg border cursor-pointer transition-all
                  ${notification.read ? 'bg-gray-50' : 'bg-white border-blue-200 shadow-sm'}
                  ${isRTL ? 'rtl' : 'ltr'}
                  hover:shadow-md`}
              >
                <div className={`flex justify-between items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    {getStatusIcon(notification.type)}
                    <h3 className={`font-semibold ${notification.read ? 'text-gray-600' : 'text-black'}`}>
                      {getNotificationTitle(notification.type, isRTL ? 'ar' : 'en')}
                    </h3>
                  </div>
                  {notification.read && (
                    <IoCheckmarkCircle className="text-green-500 flex-shrink-0" />
                  )}
                </div>
                <p className={`mt-2 text-sm ${notification.read ? 'text-gray-500' : 'text-gray-600'} 
                  ${isRTL ? 'text-right' : 'text-left'} direction-${isRTL ? 'rtl' : 'ltr'} whitespace-pre-line`}
                  >
                  {getNotificationMessage(notification, isRTL)}
               </p>
                {notification.branches && notification.branches.length > 0 && (
                  <div className={`mt-2 space-y-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {notification.branches.map((branch, index) => (
                      <div key={branch.branchId} 
                           className={`text-sm text-gray-500 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                      >
                        <span>•</span>
                        <span>{notificationText[isRTL ? 'ar' : 'en'].branch} {index + 1}:</span>
                        <span>{translateMaterialType(branch.materialType, isRTL ? 'ar' : 'en')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          
         {/* Infinite scroll trigger */}
         {hasMore && (
            <div 
              ref={ref}
              className="flex justify-center py-4"
            >
              {loadingMore && (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}