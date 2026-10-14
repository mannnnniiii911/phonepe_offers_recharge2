import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import { PhonePeLogo } from '../../components/PhonePeLogo';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAdminAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#140A26] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-[#6426AD] flex items-center justify-center p-2 mb-4 animate-bounce">
          <PhonePeLogo className="text-white" size={24} />
        </div>
        <div className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mb-2" />
        <span className="text-xs text-purple-200 font-semibold tracking-wide">
          Verifying administrative credentials...
        </span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
};
