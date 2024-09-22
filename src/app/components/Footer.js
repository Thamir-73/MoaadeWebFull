import React from 'react';
import Image from 'next/image';
import { FaFacebook, FaInstagram, FaTwitter, FaYoutube, FaCopyright } from 'react-icons/fa';

const Footer = () => {
  return (
    <footer className="mt-auto pt-4 pb-4 bg-white dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex justify-center items-center mb-6">
          <Image src="/heliblo.png" alt="Client Logo" width={50} height={50} className="mix-blend-multiply dark:mix-blend-normal dark:opacity-80" />
          <span className="ml-2 text-xl font-bold text-gray-800 dark:text-gray-200">الهلب</span>
        </div>
        <div className="flex justify-center space-x-3 mb-6">
          <a href="#" className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
            <FaFacebook className="h-6 w-6" />
          </a>
          <a href="#" className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
            <FaInstagram className="h-6 w-6" />
          </a>
          <a href="#" className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
            <FaTwitter className="h-6 w-6" />
          </a>
          <a href="#" className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
            <FaYoutube className="h-6 w-6" />
          </a>
        </div>
        <div className="text-center text-gray-500 dark:text-gray-400 flex items-center justify-center">
          <FaCopyright className="mr-2" />
          <span>2024 الهلب. جميع الحقوق محفوظة</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;