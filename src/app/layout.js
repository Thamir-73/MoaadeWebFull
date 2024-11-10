import localFont from "next/font/local";
import ServiceWorkerRegistration from './components/ServiceWorkerRegistration';
import "./globals.css";
import { LanguageProvider } from './LanguageContext';
import dynamic from 'next/dynamic';
import { AuthProvider } from './contexts/AuthContext';

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

const ClientRootLayout = dynamic(() => import('./ClientRootLayout'), { ssr: false });

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