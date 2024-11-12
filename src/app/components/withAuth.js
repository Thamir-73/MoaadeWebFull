'use client'

import { useEffect, useState } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { getUserData } from '@/app/utils/firebase';
import SignIn from './SignIn';
import LoadingSkeleton from './LoadingSkeleton';

export default function withAuth(Component) {
  return function ProtectedRoute(props) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
      const checkUserAndRedirect = async () => {
        if (user) {
          try {
            const userData = await getUserData(user.uid);
            
            // If first time user, always redirect to complete profile
            if (!userData || userData.isFirstTime) {
              window.location.replace('/complete-profile');
              return;
            }

            // Check if user is on the wrong dashboard
            const currentPath = window.location.pathname;
            const isOnFactoryDash = currentPath.includes('dashboardfa');
            const isOnCompanyDash = currentPath.includes('dashboardco');

            if (userData.isFactory === 'yes' && isOnCompanyDash) {
              window.location.replace('/dashboardfa');
              return;
            }
            
            if (userData.isFactory !== 'yes' && isOnFactoryDash) {
              window.location.replace('/dashboardco');
              return;
            }

            // Only set authorized if user is on the correct dashboard
            setAuthorized(true);
          } catch (error) {
            console.error('Error checking user type:', error);
          }
        }
        setLoading(false);
      };

      checkUserAndRedirect();
    }, [user]);

    if (loading || (user && !authorized)) {
      return <LoadingSkeleton />;
    }

    if (!user) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <SignIn />
        </div>
      );
    }

    return <Component {...props} />;
  };
}