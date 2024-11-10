import React, { useState, useRef, useEffect } from 'react';

const OTPInput = ({ length = 6, onChange }) => {
  const [otp, setOtp] = useState(new Array(length).fill(''));
  const inputRefs = useRef([]);

  useEffect(() => {
    // Focus the first input field and show keyboard on mobile
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
      inputRefs.current[0].click(); // This triggers the on-screen keyboard on most mobile devices
    }
  }, []);

  const handleChange = (element, index) => {
    if (isNaN(element.value)) return false;

    const newOtp = [...otp];
    newOtp[index] = element.value;
    setOtp(newOtp);

    // Focus next input
    if (element.value !== '' && index < length - 1) {
      inputRefs.current[index + 1].focus();
    }

    onChange(newOtp.join(''));
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  return (
    <div className="flex justify-between mb-4">
      {otp.map((data, index) => (
        <input
          key={index}
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength="1"
          ref={(ref) => (inputRefs.current[index] = ref)}
          value={data}
          onChange={(e) => handleChange(e.target, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          className="w-12 h-12 text-center text-xl border rounded-md mx-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      ))}
    </div>
  );
};

export default OTPInput;