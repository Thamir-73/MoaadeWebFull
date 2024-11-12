'use client'

import { useEffect, useState } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { GoogleAnalytics } from '@next/third-parties/google'
import { useLanguage } from './LanguageContext';
import LoadingSkeleton from './components/LoadingSkeleton'; // Create this component

export default function ClientRootLayout({ children }) {
  const { language } = useLanguage();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.removeAttribute('dir');
    
    // Set loading to false after hydration
    setIsLoading(false);
  }, [language]);

  return (
    <>
      <Navbar />
      <main className="min-h-screen">
        {isLoading ? (
          <LoadingSkeleton />
        ) : (
          children
        )}
      </main>
      <Footer />
      <GoogleAnalytics gaId="G-DL2PWKWRYH" />
    </>
  );
}