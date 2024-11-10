import React from 'react';
import Marquee from '@/components/ui/marquee';
import Link from 'next/link';
import { useLanguage } from '@/app/LanguageContext';
import { GiMirrorMirror } from "react-icons/gi";
import { FaBottleWater } from "react-icons/fa6";
import { TfiPackage } from "react-icons/tfi";
import { FaBoxOpen } from "react-icons/fa";
import { motion } from 'framer-motion';
import { useAuth } from '@/app/contexts/AuthContext';
import { getUserData } from '@/app/utils/firebase';
import { useState } from 'react';
import SignIn from '../components/SignIn';

const recyclableMaterials = [
  {
    name: { en: "Glass", ar: "زجاج" },
    icon: GiMirrorMirror,
  },
  {
    name: { en: "Plastic", ar: "بلاستيك" },
    icon: FaBottleWater,
  },
  {
    name: { en: "Paper", ar: "ورق" },
    icon: TfiPackage,
  },
  {
    name: { en: "Cartons", ar: "كرتون" },
    icon: FaBoxOpen,
  }
];

const MaterialLogoSlider = () => {
  const { language } = useLanguage();
  const [showSignIn, setShowSignIn] = useState(false);
  const { user } = useAuth();



  const repeatedMaterials = [...recyclableMaterials, ...recyclableMaterials, ...recyclableMaterials];

  const ctaText = {
    en: {
      companies: "I'm a Company",
      factories: "I'm a Factory",
      materials: "Show All Materials"
    },
    ar: {
      companies: "أنا شركة",
      factories: "أنا مصنع",
      materials: "عرض جميع المواد"
    }
  };

   // Add new handler for button clicks
   const handleButtonClick = async () => {
    if (!user) {
      // If user is not signed in, show sign in component
      setShowSignIn(true);
    } else {
      // If user is signed in, get their data and redirect
      try {
        const userData = await getUserData(user.uid);
        if (userData) {
          if (userData.isFactory === 'yes') {
            window.location.href = '/dashboardfa';
          } else {
            window.location.href = '/dashboardco';
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    }
  };

  return (
    <div className="bg-gradient-to-t from-gray-50 via-[#E6F4FB] to-[#ffffff] py-12 w-screen relative left-1/2 right-1/2 ml-[-50vw] mr-[-50vw]">
      <div className="container mx-auto px-4">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-4xl md:text-5xl lg:text-6xl font-bold text-center mb-8"
        >
          {language === 'ar' ? 'المواد القابلة لإعادة التدوير' : 'Recyclable Materials'}
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-xl text-center mb-12 max-w-3xl mx-auto"
        >
          {language === 'ar' 
            ? 'نساعد في إعادة تدوير مجموعة متنوعة من المواد للحفاظ على بيئتنا'
            : 'We help recycle a variety of materials to preserve our environment.'}
        </motion.p>
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <Marquee className="py-8" pauseOnHover={true} reverse={true} speed={20}>
            {repeatedMaterials.map((material, index) => (
              <div key={index} className="mx-12 flex flex-col items-center justify-center h-40 cursor-pointer">
                <material.icon className="text-6xl mb-4" />
                <p className="text-center text-lg font-semibold">
                  {material.name[language]}
                </p>
                <p className="text-center text-sm">
                  {material.name[language === 'en' ? 'ar' : 'en']}
                </p>
              </div>
            ))}
          </Marquee>
        </motion.div>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-center mt-12 space-y-4"
        >
          
          
          <div className="flex justify-center space-x-4 mt-4">
              <button className="border-2 border-[#87CEEB] text-gray-600 px-6 py-3 rounded-full text-lg font-semibold hover:bg-[#87CEEB] hover:text-white transition-colors duration-300"
               onClick={handleButtonClick}
              >
                {ctaText[language].companies}
              </button>
         
              <button className="border-2 border-[#87CEEB] text-gray-600 px-6 py-3 rounded-full text-lg font-semibold hover:bg-[#87CEEB] hover:text-white transition-colors duration-300"
                 onClick={handleButtonClick}>
                {ctaText[language].factories}
              </button>

          </div>
        </motion.div>
      </div>
       {/* Show SignIn component only if user is not signed in and showSignIn is true */}
       {!user && showSignIn && (
        <SignIn 
          onClose={() => setShowSignIn(false)}
          onSignInSuccess={() => setShowSignIn(false)}
        />
      )}
    </div>
  );
};

export default MaterialLogoSlider;