'use client'

import { useEffect } from 'react';
import localFont from "next/font/local";
import "./globals.css";
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { GoogleAnalytics } from '@next/third-parties/google'
import { LanguageProvider, useLanguage } from './LanguageContext';
import { AuthProvider } from './contexts/AuthContext';

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

function RootLayoutContent({ children }) {
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
      <GoogleAnalytics gaId="G-XXXXXXXXXX" />
    </>
  );
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#ffffff" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}>
        <LanguageProvider>
          <AuthProvider>
            <RootLayoutContent>{children}</RootLayoutContent>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}