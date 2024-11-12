import { useRef, useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { FaBuilding, FaIndustry, FaCheck, FaTimes } from 'react-icons/fa';
import { useLanguage } from '@/app/LanguageContext';
import Link from 'next/link';
import { useAuth } from '@/app/contexts/AuthContext';
import { getUserData } from '@/app/utils/firebase';
import { useState } from 'react';
import SignIn from '../components/SignIn';

const BenefitsSection = () => {
  const { language } = useLanguage();
  const [showSignIn, setShowSignIn] = useState(false);
  const { user } = useAuth();

  const content = {
    en: {
        companies: {
            title: "For Companies",
            benefits: [
              "Turn waste into a source of profit",
              "Reduce dependence on waste management companies",
              "Improve company image"
            ],
            problemsSolved: [
              "Reduce waste disposal costs",
              "Regulatory compliance issues",
              "Negative environmental impact"
            ],
            buttonText: "Benefit from your waste",
            buttonLink: "https://form.jotform.com/242764816214458"
          },
          factories: {
            title: "For Factories",
            benefits: [
              "Sustainable source of materials",
              "Reduce dependence on material suppliers",
              "Streamline raw material procurement process"
            ],
            problemsSolved: [
              "Irregular supply of raw materials",
              "Limited supplier options",
              "Operate your factory at full capacity, sustainably"
            ],
            buttonText: "Get materials for your factory",
            buttonLink: "https://form.jotform.com/242763632347460"
          },
          benefitsTitle: "Benefits",
          problemsSolvedTitle: "Problems We Solve"
        },
    ar: {
      companies: {
        title: "للشركات",
        benefits: [
          "جعل النفايات مصدر ربح",
          "تقليل الاعتماد على شركات ادارة النفايات",
          "تحسين صورة الشركة"
        ],
        problemsSolved: [
          "تقليل تكاليف التخلص من النفايات",
          "مشاكل الامتثال التنظيمي",
          "التأثير السلبي على البيئة"
        ],
        buttonText: "استفيد من نفاياتك",
        buttonLink: "https://form.jotform.com/242764816214458"
      },
      factories: {
        title: "للمصانع",
        benefits: [
          "مصدر مستدام للمواد",
          "تقليل الاعتماد على المصانع لتوفير المواد",
          "تبسيط عملية وجود المواد الخام"
        ],
        problemsSolved: [
          "عدم انتظام توريد المواد الخام",
          "محدودية خيارات الموردين",
          "تشغيل مصنعك بكامل الطاقة الانتاجية، بشكل مستدام"
        ],
        buttonText: "احصل على مواد لمصنعك",
        buttonLink: "https://form.jotform.com/242763632347460"
    
      },
      benefitsTitle: "الفوائد",
      problemsSolvedTitle: "المشاكل التي نحلها"
    }
  };

  const currentContent = content[language];
  const isRTL = language === 'ar';

  const handleButtonClick = async (isFactory) => {
    if (!user) {
      setShowSignIn(true);
    } else {
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

  const BenefitCard = ({ icon, title, benefits, problemsSolved, benefitsTitle, problemsSolvedTitle, buttonText, buttonLink, isRTL, isFactory }) => {
    return (
      <div className="flex-1 bg-gray-600 rounded-lg p-6 shadow-lg flex flex-col">
        <FadeInWhenVisible>
          <div className={`flex items-center mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            {icon}
            <h2 className={`text-2xl font-bold ${isRTL ? 'mr-2' : 'ml-2'} text-white`}>{title}</h2>
          </div>
        </FadeInWhenVisible>
        <div className="mb-6 flex-grow">
          <FadeInWhenVisible>
            <h3 className={`text-lg font-semibold mb-2 text-[#87CEEB] ${isRTL ? 'text-right' : 'text-left'}`}>{benefitsTitle}</h3>
          </FadeInWhenVisible>
          <ul className={isRTL ? 'text-right' : 'text-left'}>
            {benefits.map((benefit, index) => (
              <FadeInWhenVisible key={index}>
                <li className={`flex items-center text-white mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <FaCheck className={`text-green-500 ${isRTL ? 'ml-2' : 'mr-2'} flex-shrink-0`} />
                  <span className={`${isRTL ? 'text-right' : 'text-left'} flex-grow`}>{benefit}</span>
                </li>
              </FadeInWhenVisible>
            ))}
          </ul>
        </div>
        <div className="mb-6 flex-grow">
          <FadeInWhenVisible>
            <h3 className={`text-lg font-semibold mb-2 text-[#87CEEB] ${isRTL ? 'text-right' : 'text-left'}`}>{problemsSolvedTitle}</h3>
          </FadeInWhenVisible>
          <ul className={isRTL ? 'text-right' : 'text-left'}>
            {problemsSolved.map((problem, index) => (
              <FadeInWhenVisible key={index}>
                <li className={`flex items-center text-white mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <FaTimes className={`text-red-500 ${isRTL ? 'ml-2' : 'mr-2'} flex-shrink-0`} />
                  <span className={`${isRTL ? 'text-right' : 'text-left'} flex-grow`}>{problem}</span>
                </li>
              </FadeInWhenVisible>
            ))}
          </ul>
        </div>
        <FadeInWhenVisible>
          <button 
            className="w-full mt-auto py-2 px-4 border border-[#87CEEB] text-[#87CEEB] rounded hover:bg-[#87CEEB] hover:text-white transition-colors duration-300" 
            onClick={() => handleButtonClick(isFactory)}
          >
            {buttonText}
          </button>
        </FadeInWhenVisible>
      </div>
    );
  };

  return (
    <>
      <div className={`bg-gradient-to-b from-[#E6F4FC] to-gray-50 flex flex-col md:flex-row justify-center items-stretch gap-8 p-8 ${isRTL ? 'rtl' : 'ltr'}`}>
        <div className="flex-1 h-full">
          <BenefitCard 
            icon={<FaBuilding className="text-4xl" />}
            title={currentContent.companies.title}
            benefits={currentContent.companies.benefits}
            problemsSolved={currentContent.companies.problemsSolved}
            benefitsTitle={currentContent.benefitsTitle}
            problemsSolvedTitle={currentContent.problemsSolvedTitle}
            buttonText={currentContent.companies.buttonText}
            buttonLink={currentContent.companies.buttonLink}
            isRTL={isRTL}
            isFactory={false}
          />
        </div>
        <div className="flex-1 h-full">
          <BenefitCard 
            icon={<FaIndustry className="text-4xl" />}
            title={currentContent.factories.title}
            benefits={currentContent.factories.benefits}
            problemsSolved={currentContent.factories.problemsSolved}
            benefitsTitle={currentContent.benefitsTitle}
            problemsSolvedTitle={currentContent.problemsSolvedTitle}
            buttonText={currentContent.factories.buttonText}
            buttonLink={currentContent.factories.buttonLink}
            isRTL={isRTL}
            isFactory={true}
          />
        </div>
      </div>

      {!user && showSignIn && (
        <SignIn 
          onClose={() => setShowSignIn(false)}
          onSignInSuccess={() => setShowSignIn(false)}
        />
      )}
    </>
  );
};

const FadeInWhenVisible = ({ children }) => {
  const controls = useAnimation();
  const ref = useRef();
  

  useEffect(() => {
    const currentRef = ref.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          controls.start("visible");
        }
      },
      { threshold: 0.1 }
    );

    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [controls]);

  return (
    <motion.div
      ref={ref}
      animate={controls}
      initial="hidden"
      transition={{ duration: 0.5 }}
      variants={{
        visible: { opacity: 1, y: 0 },
        hidden: { opacity: 0, y: 20 }
      }}
    >
      {children}
    </motion.div>
  );
};

export default BenefitsSection;