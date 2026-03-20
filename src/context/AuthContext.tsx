import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { database, auth } from '../lib/firebase';
import { ref, onValue } from 'firebase/database';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  FacebookAuthProvider, 
  OAuthProvider 
} from 'firebase/auth';
import { API_BASE_URL } from '../constants';

interface User {
  id: number;
  phone: string;
  username: string;
  balance: number;
  status?: 'active' | 'blocked';
}

interface AuthContextType {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  login: (phone: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithFacebook: () => Promise<void>;
  loginWithApple: () => Promise<void>;
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

  const refreshUser = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
        credentials: 'include',
      });
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

  useEffect(() => {
    if (!user?.id) return;
    const userRef = ref(database, `users/${user.id}`);
    const unsubscribe = onValue(userRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setUser(prev => {
          if (!prev) return null;
          const newBalance = data.balance !== undefined ? Number(data.balance) : prev.balance;
          if (prev.balance === newBalance && prev.status === data.status) return prev;
          return { ...prev, balance: newBalance, status: data.status || prev.status };
        });
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
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password, device_id, install_time }),
      credentials: 'include',
    });
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Login failed');
    }
    await refreshUser();
    navigate('/');
  };

  const socialLogin = async (firebaseUser: any) => {
    const { device_id, install_time } = getDeviceInfo();
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/social-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firebase_uid: firebaseUser.uid,
          email: firebaseUser.email,
          username: firebaseUser.displayName,
          phone: firebaseUser.phoneNumber,
          device_id,
          install_time
        }),
        credentials: 'include',
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Social login failed');
      }
      await refreshUser();
      navigate('/');
    } catch (error: any) {
      console.error('Social login backend error:', error);
      throw error;
    }
  };

  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await socialLogin(result.user);
    } catch (error: any) {
      throw error;
    }
  };

  const loginWithFacebook = async () => {
    try {
      const provider = new FacebookAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await socialLogin(result.user);
    } catch (error: any) {
      throw error;
    }
  };

  const loginWithApple = async () => {
    try {
      const provider = new OAuthProvider('apple.com');
      const result = await signInWithPopup(auth, provider);
      await socialLogin(result.user);
    } catch (error: any) {
      throw error;
    }
  };

  const register = async (phone: string, password: string, username?: string) => {
    const { device_id, install_time } = getDeviceInfo();
    const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password, username, device_id, install_time }),
      credentials: 'include',
    });
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Registration failed');
    }
    await refreshUser();
    navigate('/');
  };

  const logout = async () => {
    await fetch(`${API_BASE_URL}/api/auth/logout`, { method: 'POST', credentials: 'include' });
    setUser(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, loginWithGoogle, loginWithFacebook, loginWithApple, register, logout, refreshUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
