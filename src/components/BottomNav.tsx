import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Wallet, History, User, MessageSquare } from 'lucide-react';
import clsx from 'clsx';

const BottomNav = () => {
  const location = useLocation();

  const navItems = [
    { icon: Home, label: 'ပင်မ', path: '/' },
    { icon: Wallet, label: 'ပိုက်ဆံအိတ်', path: '/wallet' },
    { icon: MessageSquare, label: 'ဒိုင်တင်မယ်', path: '/dealer-chat' },
    { icon: History, label: 'မှတ်တမ်း', path: '/history' },
    { icon: User, label: 'အကောင့်', path: '/profile' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 pb-safe transition-colors duration-200">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={clsx(
                'flex flex-col items-center justify-center w-full h-full space-y-1',
                isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              )}
            >
              <item.icon size={24} />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;
