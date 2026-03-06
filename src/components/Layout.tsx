import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import BottomNav from './BottomNav';
import { useAuth } from '../context/AuthContext';

const Layout = () => {
  const { user } = useAuth();
  const location = useLocation();
  const isAuthPage = ['/login', '/register'].includes(location.pathname);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 transition-colors duration-200">
      <div className="max-w-md mx-auto bg-white dark:bg-gray-800 min-h-screen shadow-lg relative transition-colors duration-200">
        <Outlet />
        {user && !isAuthPage && <BottomNav />}
      </div>
    </div>
  );
};

export default Layout;
