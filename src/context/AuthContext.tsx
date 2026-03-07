import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { database, auth } from '../lib/firebase';
import { ref, onValue } from 'firebase/database';

interface User {
  id: number;
  phone: string;
  username: string;
  balance: number;
}

interface AuthContextType {
  user: User | null;
  login: (phone: string, password: string) => Promise<void>;
  register: (phone: string, password: string, username?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const refreshUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        setUser(null);
      }
    } catch (error) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  // Real-time balance sync from Firebase
  useEffect(() => {
    if (!user?.id) return;

    const balanceRef = ref(database, `users/${user.id}/balance`);
    const unsubscribe = onValue(balanceRef, (snapshot) => {
      const newBalance = snapshot.val();
      if (newBalance !== null && newBalance !== undefined) {
        setUser(prev => prev ? { ...prev, balance: Number(newBalance) } : null);
      }
    });

    return () => unsubscribe();
  }, [user?.id]);

  const getDeviceInfo = () => {
    let deviceId = localStorage.getItem('device_id');
    let installTime = localStorage.getItem('install_time');
    
    if (!deviceId) {
      deviceId = 'dev_' + Date.now() + Math.random().toString(36).substr(2, 9);
      installTime = new Date().toISOString();
      localStorage.setItem('device_id', deviceId);
      localStorage.setItem('install_time', installTime);
    }
    
    return { device_id: deviceId, install_time: installTime };
  };

  const login = async (phone: string, password: string) => {
    const { device_id, install_time } = getDeviceInfo();
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password, device_id, install_time }),
    });
    
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Login failed');
    }
    
    await refreshUser();
    navigate('/');
  };

  const register = async (phone: string, password: string, username?: string) => {
    const { device_id, install_time } = getDeviceInfo();
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password, username, device_id, install_time }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Registration failed');
    }

    await refreshUser();
    navigate('/');
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    localStorage.removeItem('app_pin');
    setUser(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, refreshUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
