import React from 'react';
import Image from 'next/image';

const AnimatedRecycleIcon = () => {
  return (
    <div className="relative w-full aspect-square max-w-[300px] mx-auto overflow-visible">
      <div className="absolute inset-0 animate-float">
        <Image
          src="/recycle-icon1.png"
          alt="Recycling Icon"
          fill
          sizes="(max-width: 300px) 100vw, 300px"
          style={{ objectFit: 'contain' }}
          className="animate-pulse-slow"
        />
      </div>
      <div className="absolute inset-0 animate-rotate-slow opacity-50">
        <div className="w-full h-full border-4 border-[#87CEEB] rounded-full"></div>
      </div>
    </div>
  );
};

export default AnimatedRecycleIcon;