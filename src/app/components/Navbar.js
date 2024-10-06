'use client';
import { useState } from 'react';
import Image from 'next/image';
import { useLanguage } from '../LanguageContext';




export default function Navbar() {
  const { language, setLanguage } = useLanguage();


  
  const FlagIcon = ({ country }) => {
    if (country === 'gb') {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30" width="24" height="12">
          <clipPath id="s">
            <path d="M0,0 v30 h60 v-30 z"/>
          </clipPath>
          <clipPath id="t">
            <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z"/>
          </clipPath>
          <g clipPath="url(#s)">
            <path d="M0,0 v30 h60 v-30 z" fill="#012169"/>
            <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6"/>
            <path d="M0,0 L60,30 M60,0 L0,30" clipPath="url(#t)" stroke="#C8102E" strokeWidth="4"/>
            <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10"/>
            <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6"/>
          </g>
        </svg>
      );
    } else if (country === 'sa') {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 16" width="24" height="16">
          <rect width="24" height="16" fill="#007A3D"/>
          <text x="12" y="8" fontFamily="Arial" fontSize="6" fill="white" textAnchor="middle" dominantBaseline="middle">عربي</text>
        </svg>
      );
    }
    return null;
  };

  return (
    <div className="relative">
      <nav className="bg-white bg-opacity-70 backdrop-blur-md text-blue-600 border-b border-[#87CEEB] shadow-sm">
        <div className="container px-4 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <Image
              src="/moaadlog.png"
              alt="Moaad Logo"
              width={40}
              height={40}
              className="object-contain"
            />
            <h2 className="font-bold ml-0 text-gray-700 text-xl">مُعاد</h2>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <button 
              onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
              className="p-1 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors"
              aria-label={language === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
            >
              <FlagIcon country={language === 'ar' ? 'gb' : 'sa'} />
            </button>
           
          </div>
        </div>
      </nav>
   
    </div>
  );
}