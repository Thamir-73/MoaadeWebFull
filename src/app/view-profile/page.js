'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import { useLanguage } from '@/app/LanguageContext';
import { updateProfile, updateEmail, updatePhoneNumber, PhoneAuthProvider, linkWithCredential, EmailAuthProvider } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateUserProfile, storage, getUserData } from '../utils/firebase';
import Image from 'next/image';
import { auth } from '../utils/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { FaBuilding, FaUserAlt, FaUpload, FaCodeBranch, FaPhone, FaEnvelope, FaLock, FaArrowLeft } from 'react-icons/fa';

export default function UserProfile() {
  const { user, loading, setUserName } = useAuth();
  const { language } = useLanguage();
  const router = useRouter();

  const [name, setName] = useState('');
  const [isFactory, setIsFactory] = useState(null);
  const [branches, setBranches] = useState('');
  const [profilePicture, setProfilePicture] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [isEmailUser, setIsEmailUser] = useState(false);
  const [showSuccessSheet, setShowSuccessSheet] = useState(false);
  const [materialType, setMaterialType] = useState('');
  const [otherMaterial, setOtherMaterial] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const loadUserData = async () => {
      if (user) {
        try {
          await fetchUserData();
        } catch (error) {
          console.error('Error fetching user data:', error);
          setError('Failed to load user data. Please try again.');
        }
      }
    };
  
    if (!loading) {
      if (!user) {
        router.push('/');
      } else {
        loadUserData();
      }
    }
  }, [user, loading, router]);

  const fetchUserData = async () => {
    try {
      const userData = await getUserData(user.uid);
      if (userData) {
        setName(userData.name || '');
        setIsFactory(userData.isFactory === 'yes');
        setBranches(userData.branches || '');
        setImagePreview(userData.photoURL || null);
        setPhoneNumber(userData.phoneNumber || user.phoneNumber || '');
        setEmail(userData.email || user.email || '');
        setIsEmailUser(user.providerData[0].providerId === 'password');
        setMaterialType(userData.materialType || '');
        setOtherMaterial(userData.otherMaterial || '');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      setError('Failed to load user data. Please try again.');
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePicture(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    
    try {
      let updatedFields = {};
  
      if (profilePicture) {
        const storageRef = ref(storage, `profile_pictures/${user.uid}`);
        await uploadBytes(storageRef, profilePicture);
        const photoURL = await getDownloadURL(storageRef);
        updatedFields.photoURL = photoURL;
      }
  
      if (name !== user.displayName) updatedFields.name = name;
      if (isFactory !== (user.isFactory === 'yes')) updatedFields.isFactory = isFactory ? 'yes' : 'no';
      if (!isFactory && branches !== user.branches) updatedFields.branches = branches;
      if (isFactory && materialType !== user.materialType) updatedFields.materialType = materialType === 'other' ? otherMaterial : materialType;
      if (email !== user.email) updatedFields.email = email;
  
      if (Object.keys(updatedFields).length > 0) {
        await updateUserProfile(user, updatedFields);
  
        if (updatedFields.name || updatedFields.photoURL) {
          await updateProfile(user, { 
            displayName: updatedFields.name || user.displayName, 
            photoURL: updatedFields.photoURL || user.photoURL 
          });
        }
  
        setSuccessMessage(language === 'ar' ? 'تم تحديث المعلومات بنجاح' : 'Information updated successfully');
        setShowSuccessSheet(true);
        setTimeout(() => {
          setShowSuccessSheet(false);
          fetchUserData(); // Refresh user data after update
        }, 3000);
      } else {
        setSuccessMessage(language === 'ar' ? 'لم يتم إجراء أي تغييرات' : 'No changes were made');
        setShowSuccessSheet(true);
        setTimeout(() => setShowSuccessSheet(false), 3000);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setError(language === 'ar' ? 'حدث خطأ أثناء تحديث المعلومات' : 'Error updating information');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordReset = async () => {
    try {
      await sendPasswordResetEmail(auth, user.email);
      setSuccessMessage(language === 'ar' ? 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني' : 'Password reset link sent to your email');
      setShowSuccessSheet(true);
      setTimeout(() => {
        setShowSuccessSheet(false);
      }, 4000); // 4 seconds
    } catch (error) {
      console.error('Error sending password reset email:', error);
      setError(language === 'ar' ? 'حدث خطأ أثناء إرسال رابط إعادة تعيين كلمة المرور' : 'Error sending password reset link');
      setShowSuccessSheet(true);
      setTimeout(() => {
        setShowSuccessSheet(false);
      }, 4000); // 4 seconds
    }
  };

  const text = {
    ar: {
      title: 'الملف الشخصي',
      nameLabel: isFactory ? 'اسم المصنع' : 'اسم الشركة',
      typeLabel: 'نوع الحساب',
      factory: 'مصنع',
      company: 'شركة',
      branchesLabel: 'عدد الفروع',
      uploadPhoto: 'تغيير الصورة',
      phoneNumber: 'رقم الهاتف',
      email: 'البريد الإلكتروني',
      materialTypeLabel: 'نوع المواد المعاد تدويرها',
      plastics: 'بلاستيك',
      glass: 'زجاج',
      paper: 'ورق',
      paperAndCardboard: 'ورق وكرتون',
      other: 'أخرى',
      otherMaterialLabel: 'نوع المواد الأخرى',
      updateProfile: 'تحديث الملف الشخصي',
      updating: 'جاري التحديث...',
      resetPassword: 'إعادة تعيين كلمة المرور',
      back: 'رجوع',
    },
    en: {
      title: 'Profile',
      nameLabel: isFactory ? 'Factory Name' : 'Company Name',
      typeLabel: 'Account Type',
      factory: 'Factory',
      company: 'Company',
      branchesLabel: 'Number of Branches',
      uploadPhoto: 'Change Photo',
      phoneNumber: 'Phone Number',
      email: 'Email',
      materialTypeLabel: 'Type of Recycled Material',
      plastics: 'Plastics',
      glass: 'Glass',
      paper: 'Paper',
      paperAndCardboard: 'Paper & Cardboard',
      other: 'Other',
      otherMaterialLabel: 'Other Material Type',
      updateProfile: 'Update Profile',
      updating: 'Updating...',
      resetPassword: 'Reset Password',
      back: 'Back',
    },
  };

  if (loading || (user && !name)) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <div className="animate-pulse bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <div className="h-32 w-32 bg-gray-300 rounded-full mx-auto mb-4"></div>
          <div className="h-8 bg-gray-300 rounded w-3/4 mx-auto mb-4"></div>
          <div className="h-4 bg-gray-300 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-300 rounded w-5/6 mb-2"></div>
          <div className="h-4 bg-gray-300 rounded w-4/6 mb-4"></div>
          <div className="h-10 bg-gray-300 rounded w-full mb-4"></div>
          <div className="h-10 bg-gray-300 rounded w-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-100 flex flex-col py-6 sm:px-6 lg:px-8 ${language === 'ar' ? 'rtl' : 'ltr'}`}>
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <button
          onClick={() => router.back()}
          className="mb-2 flex items-center text-indigo-600 hover:text-indigo-500"
        >
          <FaArrowLeft className="mr-2" />
          {text[language].back}
        </button>
        <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900">
          {text[language].title}
        </h2>
      </div>

      <div className="mt-5 sm:mx-auto sm:w-full sm:max-w-md md:max-w-2xl lg:max-w3xl">
      <div className="bg-white py-3 px-6 shadow sm:rounded-lg lg:px-4">
          {error && (
            <div className="mb-4 p-2 bg-red-100 text-red-700 rounded text-center">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex justify-center mb-6">
              <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-indigo-500 hover:border-indigo-600 transition-colors">
                {imagePreview ? (
                  <Image src={imagePreview} alt="Profile" layout="fill" objectFit="cover" />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <FaUserAlt className="text-gray-400 text-4xl" />
                  </div>
                )}
                <label htmlFor="file-upload" className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                  <FaUpload className="text-white text-2xl" />
                </label>
                <input
                  id="file-upload"
                  name="file-upload"
                  type="file"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 text-right">
                {text[language].typeLabel}
              </label>
              <div className="mt-2 text-right">
                {isFactory ? text[language].factory : text[language].company}
              </div>
            </div>

            <hr className="my-6 border-t border-gray-300" />

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 text-right">
                {text[language].nameLabel}
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <FaBuilding className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-2 border-blue-400 rounded-md h-10 pr-10"
                  dir="rtl"
                />
              </div>
            </div>

            <hr className="my-6 border-t border-gray-300" />

            {isFactory && (
              <div>
                <label className="block text-sm font-medium text-gray-700 text-right">
                  {text[language].materialTypeLabel}
                </label>
                <div className="mt-2 text-right">
                  {materialType === 'other' ? otherMaterial : text[language][materialType]}
                </div>
              </div>
            )}

            {!isFactory && (
              <div>
                <label htmlFor="branches" className="block text-sm font-medium text-gray-700 text-right">
                  {text[language].branchesLabel}
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <FaCodeBranch className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="branches"
                    name="branches"
                    type="number"
                    value={branches}
                    onChange={(e) => setBranches(e.target.value)}
                    className="focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-2 border-blue-400 rounded-md h-10 pr-10"
                    dir="rtl"
                  />
                </div>
              </div>
            )}

            <hr className="my-6 border-t border-gray-300" />

            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 text-right">
                {text[language].phoneNumber}
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <FaPhone className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="phoneNumber"
                  name="phoneNumber"
                  type="tel"
                  value={phoneNumber}
                  readOnly
                  className="bg-gray-100 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-2 border-gray-300 rounded-md h-10 pr-10 cursor-not-allowed"
                  dir="rtl"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 text-right">
                {text[language].email}
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <FaEnvelope className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-2 border-blue-400 rounded-md h-10 pr-10"
                  dir="rtl"
                />
              </div>
            </div>

            {isEmailUser && (
              <>
                <hr className="my-6 border-t border-gray-300" />
                <div>
                  <button
                    type="button"
                    onClick={handlePasswordReset}
                    className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 h-10"
                  >
                    <FaLock className="mr-2" />
                    {text[language].resetPassword}
                  </button>
                </div>
              </>
            )}

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 h-10"
              >
                {isSubmitting ? text[language].updating : text[language].updateProfile}
              </button>
            </div>
          </form>
        </div>
      </div>

      {showSuccessSheet && (
  <div className="fixed bottom-0 inset-x-0 pb-2 sm:pb-5 z-50">
    <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
      <div className="p-2 rounded-lg bg-green-600 shadow-lg sm:p-3">
        <div className="flex items-center justify-between flex-wrap">
          <div className="w-0 flex-1 flex items-center">
            <span className="flex p-2 rounded-lg bg-green-800">
              <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </span>
            <p className="ml-3 font-medium text-white">
              {successMessage}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
)}
    </div>
  );
}