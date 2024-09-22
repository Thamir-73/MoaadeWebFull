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
        { title: 'إدارة النفايات الصناعية', description: 'حلول متكاملة لإدارة وتدوير النفايات الصناعية بكفاءة عالية.' },
        { title: 'جمع النفايات التجارية', description: 'خدمات منتظمة لجمع ونقل النفايات من المنشآت التجارية.' },
        { title: 'إعادة تدوير المواد', description: 'تقنيات متطورة لإعادة تدوير مختلف أنواع المواد والنفايات.' },
        { title: 'استشارات بيئية', description: 'خدمات استشارية لتحسين ممارسات إدارة النفايات وتقليل الأثر البيئي.' },
      ]
    },
    en: {
      title: 'Our Services',
      services: [
        { title: 'Industrial Waste Management', description: 'Comprehensive solutions for efficient industrial waste management and recycling.' },
        { title: 'Commercial Waste Collection', description: 'Regular services for collecting and transporting waste from commercial establishments.' },
        { title: 'Material Recycling', description: 'Advanced techniques for recycling various types of materials and waste.' },
        { title: 'Environmental Consulting', description: 'Consulting services to improve waste management practices and reduce environmental impact.' },
      ]
    }
  };

  const isRTL = language === 'ar';

  return (
    <div 
      ref={ref}
      className={`mt-10 transition-opacity duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
    >
      <div className={`bg-white bg-opacity-90 dark:bg-gray-800 dark:bg-opacity-90 p-6 md:p-8 rounded-lg shadow-md mb-12 relative overflow-hidden border border-[#008751] dark:border-[#00a861] ${isRTL ? 'rtl' : 'ltr'}`}>
        <h2 className={`text-3xl md:text-4xl font-bold text-[#008751] dark:text-[#00a861] mb-8 text-center`}>
          {text[language].title}
        </h2>
        <Marquee className="py-4" pauseOnHover={true}>
          {text[language].services.map((service, index) => (
            <MagicCard 
              key={index} 
              className="w-64 h-80 mx-4 flex-shrink-0 bg-gradient-to-br from-gray-50 to-white dark:from-gray-700 dark:to-gray-600"
            >
              <div className="p-6 flex flex-col h-full justify-between">
                <h3 className="text-xl font-semibold text-[#008751] dark:text-[#00a861] mb-4">{service.title}</h3>
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