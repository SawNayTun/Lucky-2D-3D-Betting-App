import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { LogOut, User, Moon, Sun, Edit2, Check, X } from 'lucide-react';

const Profile = () => {
  const { user, logout, updateProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user?.username || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!editName.trim()) return;
    setIsSaving(true);
    try {
      await updateProfile(editName.trim());
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update profile', error);
      alert('အမည်ပြောင်းလဲခြင်း မအောင်မြင်ပါ။');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditName(user?.username || '');
    setIsEditing(false);
  };

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">အကောင့်</h1>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center space-x-4">
        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0">
          <User size={32} />
        </div>
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="အမည်သစ်ရိုက်ထည့်ပါ"
                autoFocus
              />
              <button 
                onClick={handleSave} 
                disabled={isSaving || !editName.trim()}
                className="p-1.5 bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-900/50 disabled:opacity-50"
              >
                <Check size={18} />
              </button>
              <button 
                onClick={handleCancel}
                disabled={isSaving}
                className="p-1.5 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="truncate pr-2">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white truncate">{user?.username || 'User'}</h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm truncate">{user?.phone}</p>
              </div>
              <button 
                onClick={() => {
                  setEditName(user?.username || '');
                  setIsEditing(true);
                }}
                className="p-2 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
              >
                <Edit2 size={18} />
              </button>
            </div>
          )}
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
