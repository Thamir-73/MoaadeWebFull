import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/app/LanguageContext';
import { FaIndustry, FaStore } from 'react-icons/fa';

const ReviewCard = ({ review, onComplete }) => {
  const { language } = useLanguage();
  const textRef = useRef(null);
  const [animationDuration, setAnimationDuration] = useState(10);
  const isRTL = language === 'ar';

  useEffect(() => {
    if (textRef.current) {
      const textHeight = textRef.current.scrollHeight;
      const containerHeight = textRef.current.clientHeight;
      const overflowHeight = textHeight - containerHeight;
      if (overflowHeight > 0) {
        const newDuration = Math.max(5, Math.min(20, Math.ceil(overflowHeight / 20)));
        setAnimationDuration(newDuration);
      } else {
        setTimeout(onComplete, 3000);
      }
    }
  }, [review, language, onComplete]);

  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, animationDuration * 1000);

    return () => clearTimeout(timer);
  }, [animationDuration, onComplete]);

  const Icon = review.type === 'factory' ? FaIndustry : FaStore;

  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.5 }}
      className={`bg-white rounded-lg shadow-lg p-6 relative overflow-hidden w-full max-w-[600px] h-[300px] flex flex-col ${isRTL ? 'rtl' : 'ltr'}`}
    >
      <div className={`absolute top-4 ${isRTL ? 'left-4' : 'right-4'} z-10`}>
        <Icon className="text-3xl text-gray-600" />
      </div>
      <div className="text-gray-700 text-3xl mb-4 flex-grow overflow-hidden pt-12">
        <div 
          ref={textRef}
          className="animate-scrollText"
          style={{ 
            animationDuration: `${animationDuration}s`,
            direction: isRTL ? 'rtl' : 'ltr'
          }}
        >
          "{review.text[language]}"
        </div>
      </div>
      <div className={isRTL ? 'text-right' : 'text-left'}>
        <p className="text-gray-500 font-semibold">{review.author}</p>
        <p className="text-gray-400 text-sm">{review.date}</p>
        <p className="text-gray-400 text-sm">{review.rating} ⭐</p>
      </div>
    </motion.div>
  );
};

const ReviewCarousel = ({ reviews }) => {
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [visibleDots, setVisibleDots] = useState(5);
  const [isVisible, setIsVisible] = useState(false);
  const contentRef = useRef(null);

  const handleComplete = () => {
    if (isVisible) {
      setCurrentReviewIndex((prevIndex) => 
        prevIndex === reviews.length - 1 ? 0 : prevIndex + 1
      );
    }
  };

  const handleDotClick = (index) => {
    setCurrentReviewIndex(index);
  };

  useEffect(() => {
    const handleResize = () => {
      setVisibleDots(window.innerWidth < 640 ? 3 : 5);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      {
        root: null,
        rootMargin: '-20% 0px',
        threshold: 0.4,
      }
    );

    if (contentRef.current) {
      observer.observe(contentRef.current);
    }

    return () => {
      if (contentRef.current) {
        observer.unobserve(contentRef.current);
      }
    };
  }, []);

  const startDotIndex = Math.max(0, Math.min(currentReviewIndex - Math.floor(visibleDots / 2), reviews.length - visibleDots));

  return (
    <div className="w-full bg-gradient-to-t from-[#E6F4FC] to-gray-50 py-16">
      <div className="container mx-auto px-4">
        <div ref={contentRef} className="flex flex-col items-center" style={{ minHeight: '300px' }}>
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 50 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex justify-center items-center mb-8">
              <AnimatePresence mode="wait">
                {isVisible && (
                  <ReviewCard 
                    key={currentReviewIndex} 
                    review={reviews[currentReviewIndex]} 
                    onComplete={handleComplete}
                  />
                )}
              </AnimatePresence>
            </div>
            <div className="flex justify-center mt-4 items-center">
              {currentReviewIndex > 0 && (
                <button onClick={() => handleDotClick(currentReviewIndex - 1)} className="mx-1">
                  &lt;
                </button>
              )}
              {reviews.slice(startDotIndex, startDotIndex + visibleDots).map((_, index) => (
                <button
                  key={startDotIndex + index}
                  onClick={() => handleDotClick(startDotIndex + index)}
                  className={`w-2 h-2 rounded-full mx-1 ${
                    startDotIndex + index === currentReviewIndex ? 'bg-gray-800' : 'bg-gray-400'
                  }`}
                />
              ))}
              {currentReviewIndex < reviews.length - 1 && (
                <button onClick={() => handleDotClick(currentReviewIndex + 1)} className="mx-1">
                  &gt;
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ReviewCarousel;