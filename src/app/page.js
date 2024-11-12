'use client'

import { useRef, useEffect } from 'react';
import { useState } from 'react';
import SignIn from './components/SignIn';
import Particles from '@/components/magicui/particles';
import { motion, useInView, useAnimation } from 'framer-motion';
import WordRotate from '@/components/magicui/word-rotate';
import IntegrationComponent from './components/IntegrationComponent';
import BlurIn from '@/components/magicui/blur-in';
import { FaRecycle, FaTruck, FaArrowLeft } from 'react-icons/fa';
import { useLanguage } from '@/app/LanguageContext';
import AnimatedRecycleIcon from './components/AnimatedRecycleIcon';
import MaterialLogoSlider from './components/MaterialLogoSlider';
import ReviewCarousel from './components/ReviewCarousel';
import BenefitsSection from './components/BenefitsSection';
import { useAuth } from '@/app/contexts/AuthContext';
import { getUserData } from '@/app/utils/firebase';



const reviews = [
  {
    author: "مصنع الرهيف ",
    date: "2023-10-01",
    rating: 5,
    type: "factory", // or "company"
    text: {
      en: "Great service! The recycling process was smooth and efficient.",
      ar: "منصة رائعة! كانت عملية توفر المواد القابلة لإعادة التدوير سلسة وفعالة."
    }
  },
  {
    author: "John Doe",
    date: "2023-05-15",
    rating: 5,
    type: "factory", // or "company"
    text: {
      en: "Great service! The recycling process was smooth and efficient.",
      ar: "خدمة رائعة! كانت عملية إعادة التدوير سلسة وفعالة."
    }
  },
  // Add more reviews here...
];


export default function Home() {
  const { language, setLanguage } = useLanguage();
  const contentRef = useRef(null);
  const isInView = useInView(contentRef, { once: true, amount: 0.1 });
  const controls = useAnimation();
  const [showSignIn, setShowSignIn] = useState(false);
  const { user } = useAuth();



  useEffect(() => {
    if (isInView) {
      controls.start({ opacity: 1, y: 0, transition: { delay: 0.5, duration: 0.5 } });
    }
  }, [isInView, controls]);

  const text = {
      ar: {
      title: ['،لا ترميها', 'أعد تدويرها'],
      subtitle: '.أعد تدوير نفاياتك وحولها لمصدر دخل، و أوصلها بالمصانع',
    },
    en: {
      title: ["Don't throw it away,", 'Recycle it'],
      subtitle: 'Recycle your waste, turn it into a source of income, and connect it with factories.',
    },
  };

  const isRTL = language === 'ar';

  const buttonsRef = useRef(null);
  const isButtonsInView = useInView(buttonsRef, { 
    once: true, 
    amount: 'all', // This ensures the entire element is in view
    margin: '0px 0px -50px 0px' // This adds a small buffer below the element
  });

  const buttonTexts = {
    ar: {
      button1: ['شركة لديك نفايات قابلة لإعادة التدوير؟', 'اضغط هنا'],
      button2: ['مصنع تحتاج مواد اعادة تدوير؟', 'اضغط هنا'],
    },
    en: {
      button1: ['Have recyclable materials?', 'Click here'],
      button2: ['Factory needing recyclable materials?', 'Click here']
    }
  };

  const buttonDurations = {
    button1: [3000, 2000],
    button2: [3000, 2000]
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
    <div className={`min-h-screen bg-gradient-to-b from-gray-200 via-[#B0E0E6] to-[#87CEEB] ${isRTL ? 'rtl' : 'ltr'} relative`}>
      <main className="relative overflow-x-hidden z-0">
      <div className="w-full py-8 md:py-12 px-4 md:px-12 bg-gradient-to-b from-[#ffffff] to-[#E6F4FC] relative z-10">
        <motion.div 
          ref={contentRef}
          className="max-w-3xl mx-auto mb-8 md:mb-12 flex flex-col items-center relative overflow-hidden"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Particles
            className="absolute inset-0 z-0"
            quantity={50}
            staticity={80}
            color="#87CEEB"
          />
          
          <div className="flex flex-col justify-center z-20 mb-3 w-full text-center">
              <BlurIn
                word={
                  <div className="w-full mb-8">  
                    <h1 className="text-4xl md:text-5xl lg:text-6xl mb-6 leading-tight md:leading-snug lg:leading-normal font-bold text-center">
                      {text[language].title.map((line, index) => (
                        <div key={index} className={`${index === 1 ? 'text-[#87CEEB]' : 'text-gray-700'}`}>
                          {line}
                        </div>
                      ))}
                    </h1>
                    <p className="text-lg md:text-xl lg:text-2xl mb-8 text-gray-600 text-center">
                      {text[language].subtitle}
                    </p> <div className="w-full max-w-full justify-center items-center mt-0">
              <AnimatedRecycleIcon />
            </div>
            <div className="flex flex-col items-center justify-center mt-6 px-4 w-full z-20">
          <div className="w-full max-w-4xl mx-auto">
                      <motion.div 
                          ref={buttonsRef}
                          initial={{ opacity: 0, y: 20 }}
                          animate={controls}
                          className="flex flex-col sm:flex-row justify-center items-center gap-4 mt-8"
                        >
                          <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleButtonClick}
              className="border-2 border-[#87CEEB] w-1/1 sm:w-auto px-4 sm:px-9 py-3 text-sm sm:text-lg md:text-xl rounded-2xl font-semibold shadow-sm hover:shadow-md transition duration-300 flex items-center justify-center"
            >
              <WordRotate
                words={buttonTexts[language].button1}
                durations={buttonDurations.button1}
                className="text-center whitespace-nowrap text-gray-500 overflow-hidden text-ellipsis"
                start={isButtonsInView}
              />
              <FaRecycle className={`ml-2 text-xl text-[#87CEEB] flex-shrink-0`} />
            </motion.button>

            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleButtonClick}
              className="border-2 border-[#87CEEB] text-gray-500 w-1/1 sm:w-auto px-4 sm:px-9 py-3 text-sm sm:text-lg md:text-xl rounded-2xl font-semibold shadow-sm hover:shadow-md transition duration-300 flex items-center justify-center"
            >
              <WordRotate
                words={buttonTexts[language].button2}
                durations={buttonDurations.button2}
                className="text-center whitespace-nowrap overflow-hidden text-ellipsis"
                start={isButtonsInView}
              />
              <FaTruck className={`ml-2 text-xl flex-shrink-0`} />
            </motion.button>
            </motion.div>
          </div>
        </div>
                  </div>
                }
                className="w-full"
              />
            </div>

            
          </motion.div>
        </div>
        <hr className="border-t font-bold border-[#B0E0f6]" />
        <IntegrationComponent />
        <hr className="border-t font-bold border-[#B0E0f6]" />
      

        <MaterialLogoSlider />

        <hr className="border-t font-bold border-[#B0E0f6]" />
        <ReviewCarousel reviews={reviews} />
        {/* Rest of your components */}
        <hr className="border-t font-bold border-[#B0E0f6]" />
        <BenefitsSection />

      </main>

        {/* Show SignIn component only if user is not signed in and showSignIn is true */}
        {!user && showSignIn && (
        <SignIn 
          onClose={() => setShowSignIn(false)}
          onSignInSuccess={() => setShowSignIn(false)}
        />
      )}

    </div>
  );
}

