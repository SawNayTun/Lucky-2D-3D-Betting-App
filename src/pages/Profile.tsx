import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { LogOut, User, Moon, Sun } from 'lucide-react';

const Profile = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">အကောင့်</h1>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center space-x-4">
        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400">
          <User size={32} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{user?.username || 'User'}</h2>
          <p className="text-gray-500 dark:text-gray-400">{user?.phone}</p>
        </div>
      </div>

      <div className="space-y-3">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition"
        >
          <div className="flex items-center space-x-3">
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            <span>{theme === 'light' ? 'ညကြည့်စနစ် (Dark Mode)' : 'နေ့ကြည့်စနစ် (Light Mode)'}</span>
          </div>
        </button>

        <button
          onClick={logout}
          className="w-full flex items-center justify-center space-x-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 py-3 rounded-xl font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition"
        >
          <LogOut size={20} />
          <span>အကောင့်ထွက်မည်</span>
        </button>
      </div>
    </div>
  );
};

export default Profile;
