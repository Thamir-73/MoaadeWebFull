'use client';

import { useState, useEffect, useRef } from 'react';
import { RecaptchaVerifier, signInWithPhoneNumber, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, updateUserProfile, getUserData } from '../utils/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../LanguageContext';
import OTPInput from './OTPInput.js';
import { useRouter } from 'next/navigation';

export default function SignIn({ onClose, onSignInSuccess }) {
  const { user, signOut } = useAuth();
  const { language } = useLanguage();
  const [showEmailSignIn, setShowEmailSignIn] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isProcessingSend, setIsProcessingSend] = useState(false);
  const [isProcessingVerify, setIsProcessingVerify] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const recaptchaVerifier = useRef(null);
  const router = useRouter();

 

  const text = {
    ar: {
      phoneNumber: 'رقم الهاتف',
      sendCode: 'إرسال الرمز',
      title: 'تسجيل دخول أو إنشاء حساب',
      verificationCode: 'رمز التحقق',
      verify: 'تحقق',
      signInWithEmail: 'تسجيل الدخول بالبريد الإلكتروني',
      email: 'البريد الإلكتروني',
      password: 'كلمة المرور',
      signIn: 'تسجيل الدخول',
      createAccount: 'إنشاء حساب جديد',
      backToPhone: 'العودة إلى تسجيل الدخول برقم الهاتف',
      signOutSuccess: 'تم تسجيل الخروج بنجاح',
      signInSuccess: 'تم تسجيل الدخول بنجاح',
      noAccountFound: 'لم يتم العثور على حساب مرتبط بهذا البريد الإلكتروني. يرجى إنشاء حساب جديد.',
    },
    en: {
      phoneNumber: 'Phone Number',
      sendCode: 'Send Code',
      title: 'Sign In or Create Account',
      verificationCode: 'Verification Code',
      verify: 'Verify',
      signInWithEmail: 'Sign in with Email',
      email: 'Email',
      password: 'Password',
      signIn: 'Sign In',
      createAccount: 'Create New Account',
      backToPhone: 'Back to Phone Sign In',
      signOutSuccess: 'Signed out successfully',
      signInSuccess: 'Signed in successfully',
      noAccountFound: 'No account found linked to this email. Please sign up.',
    }
  };


  const handleSignIn = async (e) => {
    e.preventDefault();
  
    try {
      const result = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier.current);
      await updateUserProfile(result.user, { isFirstTime: true });
      
      const userData = await getUserData(result.user.uid);
      
      if (userData?.isFirstTime) {
        router.push('/complete-profile');
      } else {
        if (userData?.isFactory === 'yes') {
          router.push('/dashboardfa');
        } else {
          router.push('/dashboardco');
        }
      }
    } catch (error) {
      console.error('Error during sign-in:', error);
    }
  };

  useEffect(() => {
    if (user) {
      setSuccessMessage(text[language].signInSuccess);
      setTimeout(() => {
        onSignInSuccess();
        onClose();
      }, 2000);
    }
  }, [user, language, onClose, onSignInSuccess]);

  

  useEffect(() => {
    if (!recaptchaVerifier.current && auth) {
      recaptchaVerifier.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {
          console.log('reCAPTCHA solved');
        },
        'expired-callback': () => {
          console.log('reCAPTCHA expired');
          setErrorMessage('reCAPTCHA expired. Please try again.');
        }
      });
    }
  }, [auth]);

  
  const handleEmailSignIn = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const userData = await getUserData(result.user.uid);
      console.log('Email sign-in user data:', userData);
      
      // Close the modal
      onClose();
      
      if (!userData || userData.isFirstTime) {
        console.log('New/first-time email user - routing to complete profile');
        window.location.href = '/complete-profile';
      } else {
        console.log('Existing email user - routing to dashboard');
        console.log('isFactory value:', userData.isFactory);
        if (userData.isFactory === 'yes') {
          window.location.href = '/dashboardfa';
        } else {
          window.location.href = '/dashboardco';
        }
      }
    } catch (error) {
      console.error('Email sign-in error:', error);
      if (error.code === 'auth/user-not-found') {
        setErrorMessage(text[language].noAccountFound);
      } else {
        setErrorMessage(error.message);
      }
    }
  };
  
  const handleEmailSignUp = async () => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log('New email user created:', userCredential.user.uid);
      
      // Set isFirstTime for new users
      await updateUserProfile(userCredential.user, { isFirstTime: true });
      
      // Close the modal
      onClose();
      
      // Route to complete profile
      window.location.href = '/complete-profile';
    } catch (error) {
      console.error('Error during email sign-up:', error);
      setErrorMessage(error.message);
    }
  };

 

  const handleSignOut = async () => {
    try {
      await signOut();
      setSuccessMessage(text[language].signOutSuccess);
      setTimeout(() => {
        setSuccessMessage('');
      }, 2000);
    } catch (error) {
      setErrorMessage(error.message);
    }
  };

  const formatPhoneNumber = (number) => {
    const digits = number.replace(/\D/g, '');
    return digits.startsWith('966') ? `+${digits}` : `+966${digits}`;
  };

  const handleSendCode = async () => {
    if (!auth) {
      console.error('Auth is not initialized');
      setErrorMessage('Authentication service is not available. Please try again later.');
      return;
    }

    setErrorMessage('');
    setIsProcessingSend(true);
    const formattedPhoneNumber = formatPhoneNumber(phoneNumber);
    console.log('Sending code to:', formattedPhoneNumber);

    try {
      const confirmationResult = await signInWithPhoneNumber(auth, formattedPhoneNumber, recaptchaVerifier.current);
      console.log('Confirmation result:', confirmationResult);
      setConfirmationResult(confirmationResult);
    } catch (error) {
      console.error('Error sending code:', error);
      setErrorMessage(`Error sending verification code: ${error.message}`);
    } finally {
      setIsProcessingSend(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!confirmationResult) {
      setErrorMessage('Please send the verification code first.');
      return;
    }
    setIsProcessingVerify(true);
    setErrorMessage('');
    
    try {
      console.log('Starting verification process...');
      const result = await confirmationResult.confirm(verificationCode);
      console.log('Verification successful, user:', result.user.uid);
      
      // Get user data
      const userData = await getUserData(result.user.uid);
      console.log('Retrieved user data:', userData);
  
      // REMOVE THIS LINE - we don't want to update isFirstTime for existing users
      // await updateUserProfile(result.user, { isFirstTime: true });
      
      // Close the modal
      onClose();
      
      if (!userData) {
        // Only set isFirstTime for new users
        await updateUserProfile(result.user, { isFirstTime: true });
        console.log('New user - routing to complete profile');
        window.location.href = '/complete-profile';
      } else {
        console.log('Existing user - routing to dashboard');
        console.log('isFactory value:', userData.isFactory);
        
        // Force navigation based on isFactory status
        if (userData.isFactory === 'yes') {
          window.location.href = '/dashboardfa';
        } else {
          window.location.href = '/dashboardco';
        }
      }
    } catch (error) {
      console.error('Detailed error during verification:', error);
      setErrorMessage(`Verification error: ${error.message}`);
    } finally {
      setIsProcessingVerify(false);
    }
  };

  const ButtonLoader = () => (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );

  const handleVerificationCodeChange = (code) => {
    setVerificationCode(code);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl relative w-full max-w-md m-4">
        <button 
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
        <h2 className={`text-lg text-gray-600 font-semibold mb-4 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
        {text[language].title}
      </h2>
        {successMessage && (
          <div className="mb-4 p-2 bg-green-100 text-green-700 rounded flex items-center">
            <span className="mr-2">✓</span>
            {successMessage}
          </div>
        )}
        {errorMessage && (
          <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
            {errorMessage}
          </div>
        )}
        {user ? (
          <button 
            onClick={handleSignOut}
            className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          >
            {text[language].signOut}
          </button>
        ) : (
          <>
            {!showEmailSignIn ? (
              <>
                {!confirmationResult ? (
                  <>
                    <div className="mb-4">
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder={text[language].phoneNumber}
                        className="w-full p-2 border rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                        dir={language === 'ar' ? 'rtl' : 'ltr'}
                      />
                    </div>
                    <button 
                      onClick={handleSendCode}
                      className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors flex items-center justify-center"
                      disabled={isProcessingSend}
                    >
                      {isProcessingSend ? (
                        <>
                          <ButtonLoader />
                        </>
                      ) : (
                        text[language].sendCode
                      )}
                    </button>
                  </>
                ) : (
                  <>
                    <p className="mb-2 text-center">{text[language].verificationCode}</p>
                    <OTPInput
                      length={6}
                      onChange={handleVerificationCodeChange}
                    />
                    <button 
                      onClick={handleVerifyCode}
                      className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors flex items-center justify-center mt-4"
                      disabled={isProcessingVerify || verificationCode.length !== 6}
                    >
                      {isProcessingVerify ? (
                        <>
                          <ButtonLoader />
                        </>
                      ) : (
                        text[language].verify
                      )}
                    </button>
                  </>
                )}
                <button 
                  onClick={() => setShowEmailSignIn(true)}
                  className="mt-4 text-sm text-blue-500 hover:text-blue-700 w-full text-center"
                >
                  {text[language].signInWithEmail}
                </button>
              </>
            ) : (
              <>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={text[language].email}
                  className="w-full p-2 mb-4 border rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                  dir={language === 'ar' ? 'rtl' : 'ltr'}
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={text[language].password}
                  className="w-full p-2 mb-4 border rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                  dir={language === 'ar' ? 'rtl' : 'ltr'}
                />
                <button 
                  onClick={handleEmailSignIn}
                  className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors mb-2"
                >
                  {text[language].signIn}
                </button>
                <button 
                  onClick={handleEmailSignUp}
                  className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                >
                  {text[language].createAccount}
                </button>
                <button 
                  onClick={() => setShowEmailSignIn(false)}
                  className="mt-4 text-sm text-blue-500 hover:text-blue-700 w-full text-center"
                >
                  {text[language].backToPhone}
                </button>
              </>
            )}
          </>
        )}
        <div id="recaptcha-container"></div>
      </div>
    </div>
  );
}