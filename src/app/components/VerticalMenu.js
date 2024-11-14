import { FaMap, FaClock, FaTruck,FaBell, FaCreditCard } from 'react-icons/fa';

export default function VerticalMenu({ activeTab, setActiveTab, text, isRTL, unreadCount }) {
  const menuItems = [
    { id: 'map', icon: FaMap, label: text.mapListView },
    { id: 'pending', icon: FaClock, label: text.pendingPickups },
    { id: 'scheduled', icon: FaTruck, label: text.scheduledPickups },
    { 
      id: 'notifications', 
      icon: FaBell, 
      label: text.notifications,
      badge: unreadCount > 0 ? unreadCount : null 
    },
    { id: 'payments', icon: FaCreditCard, label: text.paymentMethods } // Add this line
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
          <item.icon size={24} className="mb-2" />
          <span className="text-xs text-center">{item.label}</span>
          {item.badge && (
            <span className="absolute top-2 right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {item.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}