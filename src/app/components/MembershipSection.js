import React, { useEffect, useRef, useState } from 'react';
import Marquee from '@/components/magicui/marquee';
import { MagicCard } from '@/components/magicui/magic-card';

const MembershipSection = ({ language }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, []);

  const text = {
    ar: {
      title: 'خدماتنا',
      services: [
        { title: 'إزالة الشعر بالليزر', description: 'تقنية متطورة لإزالة الشعر بشكل دائم وفعال.' },
        { title: 'علاج حب الشباب', description: 'حلول متكاملة لعلاج حب الشباب وتحسين مظهر البشرة.' },
        { title: 'تجديد البشرة', description: 'تقنيات حديثة لتجديد البشرة وإعادة نضارتها وحيويتها.' },
        { title: 'حقن البوتوكس', description: 'علاجات متخصصة لتقليل التجاعيد ومنع ظهورها.' },
      ]
    },
    en: {
      title: 'Our Services',
      services: [
        { title: 'Laser Hair Removal', description: 'Advanced technology for permanent and effective hair removal.' },
        { title: 'Acne Treatment', description: 'Comprehensive solutions for treating acne and improving skin appearance.' },
        { title: 'Skin Rejuvenation', description: 'Modern techniques to rejuvenate the skin and restore its vitality.' },
        { title: 'Botox Injections', description: 'Specialized treatments to reduce and prevent wrinkles.' },
      ]
    }
  };

  const isRTL = language === 'ar';

  return (
    <div 
      ref={ref}
      className={`mt-10 transition-opacity duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
    >
      <div className={`bg-white bg-opacity-90 dark:bg-gray-800 dark:bg-opacity-90 p-6 md:p-8 rounded-lg shadow-md mb-12 relative overflow-hidden border border-amber-200 dark:border-amber-700 ${isRTL ? 'rtl' : 'ltr'}`}>
        <h2 className={`text-3xl md:text-4xl font-bold text-amber-700 dark:text-amber-300 mb-8 text-center`}>
          {text[language].title}
        </h2>
        <Marquee className="py-4" pauseOnHover={true}>
          {text[language].services.map((service, index) => (
            <MagicCard 
              key={index} 
              className="w-64 h-80 mx-4 flex-shrink-0 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-gray-700 dark:to-gray-600"
            >
              <div className="p-6 flex flex-col h-full justify-between">
                <h3 className="text-xl font-semibold text-amber-600 dark:text-amber-300 mb-4">{service.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">{service.description}</p>
              </div>
            </MagicCard>
          ))}
        </Marquee>
      </div>
      <style jsx>{`
        @media (max-width: 640px) {
          .w-64 {
            width: 80vw;
          }
          .h-80 {
            height: 60vw;
          }
        }
      `}</style>
    </div>
  );
};

export default MembershipSection;