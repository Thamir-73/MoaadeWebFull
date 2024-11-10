import { useState } from 'react';
import { FaCalendarAlt, FaClock, FaTimes } from 'react-icons/fa';

export default function BottomSheet({
  selectedBranches,
  onAddBranches,
  onClose,
  text,
  isRTL,
  isPendingPickup = false
}) {
  const [selectedDate, setSelectedDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  // Convert 12-hour to 24-hour format
  const convertTo24Hour = (time12h) => {
    if (!time12h) return '';
    
    // If already in 24-hour format, return as is
    if (time12h.includes('AM') || time12h.includes('PM')) {
      const [time, modifier] = time12h.split(' ');
      let [hours, minutes] = time.split(':');
      hours = parseInt(hours);
      
      if (modifier === 'PM' && hours < 12) hours = hours + 12;
      if (modifier === 'AM' && hours === 12) hours = 0;
      
      return `${hours.toString().padStart(2, '0')}:${minutes}`;
    }
    return time12h;
  };

  // Handle time changes with conversion
  const handleStartTimeChange = (e) => {
    const time24 = convertTo24Hour(e.target.value);
    setStartTime(time24);
  };

  const handleEndTimeChange = (e) => {
    const time24 = convertTo24Hour(e.target.value);
    setEndTime(time24);
  };

  const handleScheduleLater = () => {
    console.log("Schedule Later clicked");
    onAddBranches(null);
  };
  
  const handleScheduleNow = (timeSlot) => {
    console.log("Schedule Now clicked with timeSlot:", timeSlot);
    onAddBranches(timeSlot);
  };

  return (
    <div className="relative bg-white p-6 rounded-lg w-full max-w-md" dir={isRTL ? 'rtl' : 'ltr'}>
      <button 
        onClick={onClose}
        className={`absolute top-2 ${isRTL ? 'left-2' : 'right-2'} text-gray-700 hover:text-gray-900 p-2 rounded-full bg-gray-200 hover:bg-gray-300`}
      >
        <FaTimes size={20} />
      </button>

      <h2 className="text-lg font-bold mb-4 mt-6">{text.addPreferredTimeTitle}</h2>
      <p className="mb-4 text-gray-600">
        {text.selectedBranchesCount}: {selectedBranches.length}
      </p>

      {/* Date Selection */}
      <div className="mb-6">
        <label className="block font-semibold mb-2 text-gray-700">
          {text.preferredPickupDate}
        </label>
        <div className="relative">
          <div className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-3' : 'left-3'} 
            text-blue-500 pointer-events-none z-10`}>
            <FaCalendarAlt size={20} />
          </div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className={`border rounded-lg w-full py-3 
              ${isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'}
              bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500
              placeholder-gray-400 cursor-pointer hover:bg-gray-50
              text-gray-700`}
            placeholder={text.selectDate}
          />
        </div>
      </div>

      {/* Time Selection */}
      <div className="mb-6">
        <label className="block font-semibold mb-2 text-gray-700">
          {text.preferredTimeInterval}
        </label>
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          <div className="relative flex-1">
            <label className="block text-sm text-gray-600 mb-1">
              {text.from}
            </label>
            <input
              type="time"
              value={startTime}
              onChange={handleStartTimeChange}
              className={`border rounded-lg w-full py-3 
                ${isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'}
                bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500
                placeholder-gray-400 cursor-pointer hover:bg-gray-50
                text-gray-700`}
            />
          </div>

          <div className="relative flex-1">
            <label className="block text-sm text-gray-600 mb-1">
              {text.to}
            </label>
            <input
              type="time"
              value={endTime}
              onChange={handleEndTimeChange}
              className={`border rounded-lg w-full py-3 
                ${isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'}
                bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500
                placeholder-gray-400 cursor-pointer hover:bg-gray-50
                text-gray-700`}
            />
          </div>
        </div>
      </div>

      {/* Modified action buttons */}
      <div className={`flex justify-between mt-6 space-x-3 rtl:space-x-reverse`}>
        {!isPendingPickup && (
          <button
            onClick={handleScheduleLater}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 px-6 py-3 rounded-lg
              font-medium transition-colors"
          >
            {text.scheduleLater}
          </button>
        )}
        <button
          onClick={() => handleScheduleNow({ date: selectedDate, startTime, endTime })}
          className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors
            ${(!selectedDate || !startTime || !endTime) 
              ? 'bg-blue-300 text-white cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
          disabled={!selectedDate || !startTime || !endTime}
        >
          {isPendingPickup ? text.setInitialTime : text.addToRoute}
        </button>
      </div>
    </div>
  );
}
