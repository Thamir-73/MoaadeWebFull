import React from 'react';
import { motion } from 'framer-motion';
import { FaCheck } from 'react-icons/fa';
import { useLanguage } from '../LanguageContext';

const treatments = {
  en: [
    { name: "Laser Hair Removal", duration: "30-60 min", benefits: ["Permanent reduction", "Smooth skin", "Quick sessions"] },
    { name: "Skin Rejuvenation", duration: "45-75 min", benefits: ["Improved texture", "Even tone", "Reduced fine lines"] },
    { name: "Botox Injections", duration: "15-30 min", benefits: ["Wrinkle reduction", "Quick results", "Minimal downtime"] },
  ],
  ar: [
    { name: "إزالة الشعر بالليزر", duration: "30-60 دقيقة", benefits: ["تقليل دائم", "بشرة ناعمة", "جلسات سريعة"] },
    { name: "تجديد البشرة", duration: "45-75 دقيقة", benefits: ["تحسين الملمس", "لون متساوٍ", "تقليل الخطوط الدقيقة"] },
    { name: "حقن البوتوكس", duration: "15-30 دقيقة", benefits: ["تقليل التجاعيد", "نتائج سريعة", "فترة نقاهة قصيرة"] },
  ]
};

const TreatmentCard = ({ treatment, index }) => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.2 }}
      className={`bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow ${isRTL ? 'rtl' : 'ltr'} text-center md:text-left`}
    >
      <h3 className="text-xl font-semibold mb-2 text-amber-600 dark:text-amber-400">{treatment.name}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        {isRTL ? `${treatment.duration} :المدة` : `Duration: ${treatment.duration}`}
      </p>
      <ul className="space-y-2">
        {treatment.benefits.map((benefit, idx) => (
          <li key={idx} className="flex items-center justify-center md:justify-start text-sm text-gray-700 dark:text-gray-300">
            {isRTL ? (
              <>
                <span className="flex-grow text-right md:text-right">{benefit}</span>
                <FaCheck className="ml-2 text-green-500 flex-shrink-0" />
              </>
            ) : (
              <>
                <FaCheck className="mr-2 text-green-500 flex-shrink-0" />
                <span className="flex-grow text-left md:text-left">{benefit}</span>
              </>
            )}
          </li>
        ))}
      </ul>
    </motion.div>
  );
};

const TreatmentShowcase = () => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const title = {
    en: "Our Featured Treatments",
    ar: "علاجاتنا المميزة"
  };

  return (
    <div className={`w-full max-w-4xl mx-auto ${isRTL ? 'rtl' : 'ltr'}`}>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {treatments[language].map((treatment, index) => (
          <TreatmentCard key={index} treatment={treatment} index={index} />
        ))}
      </div>
    </div>
  );
};

export default TreatmentShowcase;