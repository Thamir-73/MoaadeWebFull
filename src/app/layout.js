import localFont from "next/font/local";
import ServiceWorkerRegistration from './components/ServiceWorkerRegistration';
import "./globals.css";
import { LanguageProvider } from './LanguageContext';
import dynamic from 'next/dynamic';
import { AuthProvider } from './contexts/AuthContext';


// Preload critical fonts
const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
  preload: true,
  display: 'swap'
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
  preload: true,
  display: 'swap'
});

export const metadata = {
  title: "معاد",
  description: "مُعاد هي منصة مبتكرة تربط بين الشركات والمصانع لتبسيط عملية إعادة تدوير النفايات.",
  openGraph: {
    title: "معاد",
    description: "مُعاد هي منصة مبتكرة تربط بين الشركات والمصانع لتبسيط عملية إعادة تدوير النفايات.",
    url: "https://www.moaade.netlify.app",
    siteName: "معاد",
    images: [
      {
        url: "https://www.moaade.netlify.app/moaadlog.png",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "معاد",
    description: "",
    images: ["https://www.moaade.netlify.app/moaadlog.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
      { url: "/favicon-64x64.png", sizes: "64x64", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/site.webmanifest",
};



// Use React.lazy for ClientRootLayout
const ClientRootLayout = dynamic(() => import('./ClientRootLayout'), {
  ssr: false,
  loading: () => (
    <div className="animate-pulse">
      <div className="h-64 bg-gray-200 rounded-md mb-4" />
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
        <div className="h-4 bg-gray-200 rounded w-5/6" />
      </div>
    </div>
  )
});

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        
        <meta name="theme-color" content="#ffffff" />
   {/* Add critical CSS inline */}
   <style dangerouslySetInnerHTML={{
          __html: `
            .animate-pulse {
              animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
            }
            @keyframes pulse {
              0%, 100% { opacity: 1 }
              50% { opacity: .5 }
            }
            .skeleton {
              background: linear-gradient(
                90deg,
                rgba(0,0,0,0.06) 25%,
                rgba(0,0,0,0.15) 37%,
                rgba(0,0,0,0.06) 63%
              );
              background-size: 400% 100%;
              animation: skeleton-loading 1.4s ease infinite;
            }
            @keyframes skeleton-loading {
              0% { background-position: 100% 50% }
              100% { background-position: 0 50% }
            }
          `
        }} />

      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}>
        <LanguageProvider>
        <AuthProvider>
        <ServiceWorkerRegistration />
          <ClientRootLayout>
            {children}
          </ClientRootLayout>
        </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}