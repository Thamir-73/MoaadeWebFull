'use client'

import { useEffect, useState } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import SignIn from './SignIn';
import LoadingSkeleton from './LoadingSkeleton';

export default function withAuth(Component) {
  return function ProtectedRoute(props) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      // Short timeout to prevent flash of loading state
      const timer = setTimeout(() => {
        setLoading(false);
      }, 500);

      return () => clearTimeout(timer);
    }, []);

    if (loading) {
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