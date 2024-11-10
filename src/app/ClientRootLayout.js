'use client'

import { useEffect } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { GoogleAnalytics } from '@next/third-parties/google'
import { useLanguage } from './LanguageContext';

export default function ClientRootLayout({ children }) {
  const { language } = useLanguage();

  useEffect(() => {
    document.documentElement.lang = language;
    // Remove the dir attribute to prevent automatic flipping
    document.documentElement.removeAttribute('dir');
  }, [language]);

  return (
    <>
      <Navbar />
      <main className="">
        {children}
      </main>
      <Footer />
      <GoogleAnalytics gaId="G-DL2PWKWRYH" />
    </>
  );
}