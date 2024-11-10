'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, db, updateUserProfile, getUserData } from '../utils/firebase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userName, setUserName] = useState(null);
  const [loading, setLoading] = useState(true);


  const refreshUserData = async () => {
    if (user) {
      const userData = await getUserData(user.uid);
      setUserName(userData?.name || null);
    }
  };


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const userData = await getUserData(user.uid);
        setUserName(userData?.name || null);
      } else {
        setUserName(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signOut = () => {
    return firebaseSignOut(auth);
  };

  const value = {
    user,
    userName,
    signOut,
    refreshUserData,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}