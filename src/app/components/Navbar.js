'use client';
import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useLanguage } from '../LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import SignIn from './SignIn';
import { FaUserCircle } from 'react-icons/fa';
import { Pointer } from 'lucide-react';


export default function Navbar() {
  const { language, setLanguage } = useLanguage();
  const { user, userName, signOut, refreshUserData } = useAuth();
  const [showSignIn, setShowSignIn] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [message, setMessage] = useState('');
  const menuRef = useRef(null);

  const text = {
    ar: {
      account: 'حسابي',
      signIn: 'تسجيل الدخول',
      signOut: 'تسجيل الخروج',
      signInSuccess: 'تم تسجيل الدخول بنجاح',
      signOutSuccess: 'تم تسجيل الخروج بنجاح',
      accountDetails: 'تفاصيل الحساب',
    },
    en: {
      account: 'Account',
      signIn: 'Sign In',
      signOut: 'Sign Out',
      signInSuccess: 'Signed in successfully',
      signOutSuccess: 'Signed out successfully',
      accountDetails: 'Account Details',
    }
  };



  useEffect(() => {
    if (user && !userName) {
      refreshUserData();
    }
  }, [user, userName]);



  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuRef]);

  const handleSignInClick = () => {
    setShowSignIn(true);
  };

  const handleSignInClose = () => {
    setShowSignIn(false);
  };

  const handleSignInSuccess = () => {
    setShowSignIn(false);
    setMessage(text[language].signInSuccess);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setMessage(text[language].signOutSuccess);
      setTimeout(() => setMessage(''), 3000);
      setShowUserMenu(false);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };


  
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
    <div className="relative z-50"> {/* Add z-50 here */}
      <nav className="bg-white bg-opacity-70 backdrop-blur-md text-blue-600 border-b border-[#87CEEB] shadow-sm">
      <div className="container px-4 py-4 flex justify-between items-center">
          <div className="flex items-center cursor-pointer" onClick={() => window.location.href = '/'}>
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
           {user ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center px-2 py-1 text-sm sm:px-3 sm:py-1 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors"
              >
                <FaUserCircle className="mr-1 sm:mr-2" />
                <span className="inline">{userName || user.email}</span>
              </button>
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg z-50 overflow-visible">
                  <div className={`py-3 px-4 relative ${language === 'ar' ? 'rtl' : 'ltr'}`}>
                  <h3 className={`text-sm font-semibold text-gray-700 mb-2 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                      {text[language].account}
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">{user.email}</p>
                    <button
                      onClick={() => {window.location.href = "/view-profile"}}
                      className="w-full flex items-center justify-center px-4 py-2 text-sm rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors mb-2"
                    >
                      <span>{text[language].accountDetails}</span>
                    </button>
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center justify-center px-4 py-2 text-sm rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
                    >
                      <span>{text[language].signOut}</span>
                    </button>
                    <div className="absolute -top-2 right-4 w-4 h-4 bg-white transform rotate-45 border-t border-l border-gray-200"></div>
                  </div>
                </div>
              )}
            </div>
          ) : (
              <button
                onClick={handleSignInClick}
                className="flex items-center px-2 py-1 text-sm sm:px-3 sm:py-1 rounded-full bg-green-500 text-white hover:bg-green-600 transition-colors"
              >
                <FaUserCircle className="mr-1 sm:mr-2" />
                <span className="inline">{text[language].signIn}</span>
              </button>
            )}
          </div>
        </div>
      </nav>
      {message && (
        <div className="fixed top-16 right-4 bg-green-100 border-l-4 border-green-500 text-green-700 p-2 rounded shadow-md z-50 max-w-sm" role="alert">
          <p className="font-bold">✓ {message}</p>
        </div>
      )}
      {showSignIn && (
        <div className="fixed top-16 right-4 z-50">
          <SignIn onClose={handleSignInClose} onSignInSuccess={handleSignInSuccess} />
        </div>
      )}
    </div>
  );
}