import { useRef, useState, useEffect } from 'react';
import { FaPlay, FaPause, FaExpand, FaCompress } from 'react-icons/fa';

const TrainersPreview = ({ language }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const videoRef = useRef(null);
  const containerRef = useRef(null);

  const text = {
    en: {
      title: 'Our World-Class Doctors',
      description: 'Experience the expertise of our certified padel instructors, dedicated to elevating your game.',
      cta: 'See Our Trainers',
    },
    ar: {
      title: 'اطباءنا ذو مستوى عالمي',
      description: 'استفد من خبرة الاطباء المعتمدين لدينا. ملتزمين بجودة العناية.',
      cta: 'تعرف على اطباء',
    },
  };

  useEffect(() => {
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), 500); // Delay reveal
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isVisible && !isMobile) {
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.play().then(() => {
            setIsPlaying(true);
            setHasInteracted(true);
          }).catch(error => {
            console.error("Autoplay was prevented:", error);
            setIsPlaying(false);
          });
        }
      }, 3000); // 3 seconds delay
    }
  }, [isVisible, isMobile]);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play().then(() => {
          setIsPlaying(true);
          setHasInteracted(true);
        }).catch(error => {
          console.error("Play was prevented:", error);
          setIsPlaying(false);
        });
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const handleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const isRTL = language === 'ar';

  return (
    <div 
      ref={containerRef}
      className={`bg-white bg-opacity-70 dark:bg-gray-800 dark:bg-opacity-70 p-6 md:p-12 rounded-2xl shadow-2xl mb-12 relative overflow-hidden border border-blue-200 dark:border-blue-700 ${isRTL ? 'rtl' : 'ltr'} transition-opacity duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
    >
      <div className="flex flex-col md:flex-row items-center justify-between md:space-x-8">
        <div className="w-full md:w-1/2 mb-8 md:mb-0">
          <h2 className={`text-2xl md:text-3xl font-bold text-amber-700 dark:text-amber-300 mb-6 ${isRTL ? 'text-right' : 'text-left'}`}>
            {text[language].title}
          </h2>
          <p className={`text-sm md:text-base text-gray-600 dark:text-gray-300 mb-8 ${isRTL ? 'text-right' : 'text-left'}`}>
            {text[language].description}
          </p>
          {!isMobile && (
            <div className={`flex ${isRTL ? 'justify-end' : 'justify-start'}`}>
              <button className="border border-[#1C3F94] text-[#1C3F94] px-6 py-3 text-lg md:text-xl rounded-full font-semibold shadow-lg hover:shadow-xl transition duration-300 items-center justify-center">
                {text[language].cta}
              </button>
            </div>
          )}
        </div>
        <div className="w-full md:w-1/2 relative">
          <div className="relative w-full" style={{ paddingBottom: '56.25%' }}> {/* 16:9 aspect ratio */}
            {!isLoaded && (
              <div className="absolute inset-0 bg-gray-200 animate-pulse rounded-lg flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
            <video
              ref={videoRef}
              className="absolute top-0 left-0 w-full h-full object-cover rounded-lg"
              src="/"
              loop
              muted
              playsInline
              onLoadedData={() => setIsLoaded(true)}
              onClick={isMobile ? handlePlayPause : undefined}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                onClick={handlePlayPause}
                className={`bg-white bg-opacity-50 hover:bg-opacity-75 text-[#1C3F94] rounded-full p-4 transition duration-300 ${isPlaying && !isMobile ? 'opacity-0' : 'opacity-100'}`}
              >
                {isPlaying ? <FaPause size={24} /> : <FaPlay size={24} />}
              </button>
              {!hasInteracted && (
                <div className="absolute w-20 h-20 bg-white bg-opacity-50 rounded-full animate-ping"></div>
              )}
            </div>
            <button
              onClick={handleExpand}
              className="absolute bottom-2 right-2 bg-white bg-opacity-50 hover:bg-opacity-75 text-[#1C3F94] rounded-full p-2 transition duration-300"
            >
              <FaExpand size={16} />
            </button>
          </div>
        </div>
      </div>

      {isMobile && (
        <div className="flex justify-center mt-6">
          <button className="border border-[#1C3F94] w-1/2 lg:w-1/6 text-[#1C3F94] px-6 py-3 text-lg md:text-xl rounded-full font-semibold shadow-lg hover:shadow-xl transition duration-300 flex items-center justify-center">
            {text[language].cta}
          </button>
        </div>
      )}



      <div className="absolute -top-20 -left-20 w-40 h-40 bg-blue-500 opacity-20 rounded-full blur-2xl animate-pulse"></div>
      <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-green-500 opacity-20 rounded-full blur-2xl animate-pulse delay-1000"></div>
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-yellow-500 opacity-20 rounded-full blur-2xl animate-pulse delay-500"></div>
      <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-red-500 opacity-20 rounded-full blur-2xl animate-pulse delay-1500"></div>
      
      {isExpanded && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
          <video
            ref={videoRef}
            className="max-w-full max-h-full object-contain"
            src="/"
            loop
            muted
            playsInline
            controls
          />
          <button
            onClick={handleExpand}
            className="absolute top-4 right-4 bg-white text-black p-2 rounded-full"
          >
            <FaCompress size={24} />
          </button>
        </div>
      )}
    </div>
  );
};

export default TrainersPreview;