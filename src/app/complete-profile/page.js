'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import { useLanguage } from '@/app/LanguageContext';
import { updateProfile } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateUserProfile, storage, getUserData, auth, db} from '../utils/firebase';
import Image from 'next/image';
import { FaBuilding, FaUserAlt, FaUpload, FaCodeBranch, FaMapMarkerAlt, FaSearch, FaMousePointer, FaPhone, FaRecycle } from 'react-icons/fa';
import { GoogleMap, Marker, StandaloneSearchBox, useLoadScript } from '@react-google-maps/api';

export default function CompleteProfile() {
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
  const [location, setLocation] = useState({ lat: 24.7136, lng: 46.6753 }); // Default to Riyadh
  const [locationAddress, setLocationAddress] = useState('');
  const [searchBox, setSearchBox] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isEmailUser, setIsEmailUser] = useState(false);
  const [showSuccessSheet, setShowSuccessSheet] = useState(false);
  const [materialType, setMaterialType] = useState('');
  const [otherMaterial, setOtherMaterial] = useState('');

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    libraries: ['places'],
  });

  const mapOptions = {
    disableDefaultUI: true,
    zoomControl: false,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && user.providerData[0].providerId === 'password') {
      setIsEmailUser(true);
    }
  }, [user]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePicture(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const onMapClick = (e) => {
    setLocation({ lat: e.latLng.lat(), lng: e.latLng.lng() });
    getAddressFromLatLng(e.latLng.lat(), e.latLng.lng());
  };

  const onMarkerDragEnd = (e) => {
    setLocation({ lat: e.latLng.lat(), lng: e.latLng.lng() });
    getAddressFromLatLng(e.latLng.lat(), e.latLng.lng());
  };

  const onPlacesChanged = () => {
    const places = searchBox.getPlaces();
    if (places.length === 0) return;
    const place = places[0];
    setLocation({
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng()
    });
    setLocationAddress(place.formatted_address);
  };

  const getAddressFromLatLng = async (lat, lng) => {
    const geocoder = new google.maps.Geocoder();
    const latlng = { lat, lng };
    geocoder.geocode({ location: latlng }, (results, status) => {
      if (status === 'OK' && results[0]) {
        setLocationAddress(results[0].formatted_address);
      } else {
        console.error('Geocoder failed due to: ' + status);
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    console.log('Submitting form...');
  
    try {
      let photoURL = user.photoURL;
  
      if (profilePicture) {
        const storageRef = ref(storage, `profile_pictures/${user.uid}`);
        await uploadBytes(storageRef, profilePicture);
        photoURL = await getDownloadURL(storageRef);
      }
  
      await updateProfile(user, { displayName: name, photoURL });
  
      const userData = {
        name,
        isFactory: isFactory === true ? 'yes' : 'no',
        branches: isFactory ? null : branches,
        isFirstTime: false,
        photoURL,
        createdAt: new Date().toISOString(),
        location,
        locationAddress,
        materialType: isFactory ? (materialType === 'other' ? otherMaterial : materialType) : null,
      };
  
      // Handle phone number for all users
      if (isEmailUser && phoneNumber) {
        // Format the phone number to E.164 format for email users
        const formattedPhoneNumber = phoneNumber.startsWith('0') 
          ? `+966${phoneNumber.slice(1)}` 
          : `+966${phoneNumber}`;
        userData.phoneNumber = formattedPhoneNumber;
      } else if (user.phoneNumber) {
        // For users who signed up with phone, use the phone number from their account
        userData.phoneNumber = user.phoneNumber;
      }
  
      // Add email for email users
      if (isEmailUser && user.email) {
        userData.email = user.email;
      }
  
      console.log('User data to be updated:', userData);
  
      await updateUserProfile(user, userData);
  
      const updatedUserData = await getUserData(user.uid);
      console.log('Updated user data:', updatedUserData);
  
      if (typeof setUserName === 'function') {
        setUserName(updatedUserData?.name || null);
      } else {
        console.log('setUserName is not available. User name updated in Firebase but not in local state.');
      }
  
      console.log('Profile updated successfully');
      setSuccessMessage(language === 'ar' ? 'تم تحديث المعلومات بنجاح' : 'Information updated successfully');
      setShowSuccessSheet(true);
  
      await new Promise(resolve => setTimeout(resolve, 2000));
      if (isFactory) {
        window.location.href = '/dashboardfa';
      } else {
        window.location.href = '/dashboardco';
      }
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const text = {
    ar: {
      title: 'أكمل ملفك الشخصي',
      nameLabel: isFactory ? 'اسم المصنع' : 'اسم الشركة',
      namePlaceholder: isFactory ? 'أدخل اسم المصنع' : 'أدخل اسم الشركة',
      typeLabel: 'نوع الحساب',
      factory: 'مصنع',
      company: 'شركة',
      branchesLabel: 'عدد الفروع',
      branchesPlaceholder: 'أدخل عدد الفروع',
      uploadPhoto: 'رفع صورة الملف الشخصي',
      submit: 'إرسال',
      changeImage: 'تغيير الصورة',
      image: 'صورة',
      location: 'الموقع',
      clickOrDragMarker: 'يمكنك النقر على الخريطة أو سحب العلامة لتحديد الموقع',
      or: 'أو',
      searchLocation: 'ابحث عن موقع',
      hideSearch: 'إخفاء البحث',
      searchPlaceholder: 'ابحث عن موقع',
      selectedLocation: 'الموقع المحدد',
      phoneNumber: 'رقم الهاتف',
      phoneNumberPlaceholder: 'أدخل رقم الهاتف',
      materialTypeLabel: ':نوع المواد المعاد تدويرها في المصنع',
      plastics: 'بلاستيك',
      glass: 'زجاج',
      paper: 'ورق',
      paperAndCardboard: 'ورق وكرتون',
      other: 'أخرى',
      otherMaterialLabel: 'نوع المواد الأخرى',
      otherMaterialPlaceholder: 'أدخل نوع المواد الأخرى',
    },
    en: {
      title: 'Complete Your Profile',
      nameLabel: isFactory ? 'Factory Name' : 'Company Name',
      namePlaceholder: isFactory ? 'Enter factory name' : 'Enter company name',
      typeLabel: 'Account Type',
      factory: 'Factory',
      company: 'Company',
      branchesLabel: 'Number of Branches',
      branchesPlaceholder: 'Enter number of branches',
      uploadPhoto: 'Upload Profile Picture',
      submit: 'Submit',
      changeImage: 'Change Image',
      image: 'Image',
      location: 'Location',
      clickOrDragMarker: 'Click on the map or drag the marker to set the location',
      or: 'or',
      searchLocation: 'Search for a location',
      hideSearch: 'Hide search',
      searchPlaceholder: 'Search for a location',
      selectedLocation: 'Selected location',
      phoneNumber: 'Phone Number',
      phoneNumberPlaceholder: 'Enter phone number',
      materialTypeLabel: 'Type of Recycled Material',
      plastics: 'Plastics',
      glass: 'Glass',
      paper: 'Paper',
      paperAndCardboard: 'Paper & Cardboard',
      other: 'Other',
      otherMaterialLabel: 'Other Material Type',
      otherMaterialPlaceholder: 'Enter other material type',
    },
  };

  if (loading || !user) {
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
    <div className={`min-h-screen bg-gray-100 flex flex-col justify-center py-10 sm:px-6 lg:px-8 ${language === 'ar' ? 'rtl' : 'ltr'}`}>
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-0 text-center text-3xl font-extrabold text-gray-900">
          {text[language].title}
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md md:max-w-2xl lg:max-w3xl">
      <div className="bg-white py-3 px-6 shadow sm:rounded-lg lg:px-4">
          {successMessage && (
            <div className="mb-4 p-2 bg-green-100 text-green-700 rounded text-center">
              {successMessage}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
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
              <div className="mt-2 space-y-2">
                <div className="flex items-center justify-end">
                  <label htmlFor="factory" className="block text-sm font-medium text-gray-700 ml-3">
                    {text[language].factory}
                  </label>
                  <input
                    id="factory"
                    name="accountType"
                    type="radio"
                    checked={isFactory === true}
                    onChange={() => setIsFactory(true)}
                    className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                  />
                </div>
                <div className="flex items-center justify-end">
                  <label htmlFor="company" className="block text-sm font-medium text-gray-700 ml-3">
                    {text[language].company}
                  </label>
                  <input
                    id="company"
                    name="accountType"
                    type="radio"
                    checked={isFactory === false}
                    onChange={() => setIsFactory(false)}
                    className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                  />
                </div>
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
                  placeholder={text[language].namePlaceholder}
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
            <div className="mt-2 space-y-2">
              {['plastics', 'glass', 'paper', 'paperAndCardboard', 'other'].map((type) => (
                <div key={type} className="flex items-center justify-end">
                  <label htmlFor={type} className="block text-sm font-medium text-gray-700 ml-3">
                    {text[language][type]}
                  </label>
                  <input
                    id={type}
                    name="materialType"
                    type="radio"
                    checked={materialType === type}
                    onChange={() => setMaterialType(type)}
                    className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
                


        {isFactory && materialType === 'other' && (
          <div>
            <label htmlFor="otherMaterial" className="block text-sm font-medium text-gray-700 text-right">
              {text[language].otherMaterialLabel}
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <FaRecycle className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="otherMaterial"
                name="otherMaterial"
                type="text"
                value={otherMaterial}
                onChange={(e) => setOtherMaterial(e.target.value)}
                className="focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-2 border-blue-400 rounded-md h-10 pr-10"
                placeholder={text[language].otherMaterialPlaceholder}
                dir="rtl"
              />
            </div>
          </div>
        )}

            {isFactory === false && (
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
                    placeholder={text[language].branchesPlaceholder}
                    dir="rtl"
                  />
                </div>
              </div>
            )}

<hr className="my-6 border-t border-gray-300" />


            <div>
              <label className="block text-sm font-medium text-gray-700 text-right">
                {text[language].location}
              </label>
              <div className="mt-2">
                <div className="mb-2 text-sm text-gray-600 text-right">
                  {text[language].clickOrDragMarker}
                  <FaMousePointer className="inline mr-1" />
                </div>
                <div className="mb-2 text-md text-gray-600 text-right">
                  {text[language].or}
                </div>
                <button
                  type="button"
                  onClick={() => setShowSearch(!showSearch)}
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
                >
                  {showSearch ? text[language].hideSearch : text[language].searchLocation}
                </button>
                {showSearch && (
                  <StandaloneSearchBox
                    onLoad={ref => setSearchBox(ref)}
                    onPlacesChanged={onPlacesChanged}
                  >
                    <div className="mt-2 relative">
                      <input
                        type="text"
                        placeholder={text[language].searchPlaceholder}
                        className="shadow appearance-none border-2 border-blue-400 rounded-lg w-full py-2 pr-10 pl-3 text-gray-700 leading-tight focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        dir="rtl"
                      />
                      <FaSearch className="absolute right-3 top-3 text-gray-400" />
                    </div>
                  </StandaloneSearchBox>
                )}
              </div>
              
              {isLoaded && (
                <GoogleMap
                  mapContainerStyle={{ width: '100%', height: '300px', marginTop: '1rem' }}
                  center={location}
                  zoom={10}
                  onClick={onMapClick}
                  options={mapOptions}
                >
                  <Marker
                    position={location}
                    draggable={true}
                    onDragEnd={onMarkerDragEnd}
                  />
                </GoogleMap>
              )}
              {locationAddress && (
                <div className="mt-2 text-sm text-gray-600 text-right">
                  {text[language].selectedLocation}: {locationAddress}
                  <FaMapMarkerAlt className="inline ml-1" />
                </div>
              )}
            </div>

            {isEmailUser && (
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
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-2 border-blue-400 rounded-md h-10 pr-10"
                    placeholder={text[language].phoneNumberPlaceholder}
                    dir="rtl"
                  />
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 h-10"
              >
                {isSubmitting ? 'جاري الإرسال...' : text[language].submit}
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
                  <p className="ml-3 font-medium text-white truncate">
                    <span className="md:hidden">{successMessage}</span>
                    <span className="hidden md:inline">{successMessage}</span>
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