import React, { useState, useEffect } from 'react';

function ImagePreview() {
  const images = [
    '/helib1.jpg',
    '/helib2.jpeg',
    '/helib3.jpg'
  ];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [imagesLoaded, setImagesLoaded] = useState([false, false, false]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 3000);

    return () => clearInterval(timer);
  }, []);

  const handleImageLoad = (index) => {
    setImagesLoaded(prev => {
      const newState = [...prev];
      newState[index] = true;
      return newState;
    });
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto h-64 md:h-96">
      {images.map((src, index) => (
        <div 
          key={index} 
          className={`absolute top-0 left-0 w-full h-full transition-opacity duration-500 ${
            index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
          }`}
        >
          {!imagesLoaded[index] && (
            <div className="absolute inset-0 bg-gray-200 animate-pulse rounded-lg"></div>
          )}
          <img 
            src={src} 
            alt={`Company preview ${index + 1}`} 
            className={`object-cover w-full h-full rounded-lg transition-opacity duration-500 ${
              imagesLoaded[index] ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => handleImageLoad(index)}
          />
        </div>
      ))}
    </div>
  );
}

export default ImagePreview;