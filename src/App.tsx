import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { XCircle } from 'lucide-react';
import Layout from './components/Layout';
import Login from './pages/Login';
import Home from './pages/Home';
import Betting from './pages/Betting';
import History from './pages/History';
import Wallet from './pages/Wallet';
import Profile from './pages/Profile';
import DealerChat from './pages/DealerChat';

import PinLock from './components/PinLock';
import GlobalPlayerSync from './components/GlobalPlayerSync';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="flex justify-center items-center h-screen dark:bg-gray-900 dark:text-white">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  
  if (user.status === 'blocked') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-3xl shadow-2xl p-8 text-center border border-gray-100 dark:border-gray-700">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle size={40} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">အကောင့် ပိတ်ခံထားရပါသည်</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8">
            သင့်အကောင့်သည် စည်းကမ်းချက်များ ချိုးဖောက်မှုကြောင့် ခေတ္တပိတ်ထားခြင်း ခံရပါသည်။ အသေးစိတ်သိရှိလိုပါက အကူအညီရယူပါ။
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition mb-4"
          >
            ပြန်လည်စစ်ဆေးမည်
          </button>
          <button 
            onClick={() => {
              localStorage.removeItem('token');
              window.location.href = '/login';
            }}
            className="w-full py-4 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-2xl font-bold shadow-sm hover:bg-gray-300 dark:hover:bg-gray-600 transition"
          >
            အကောင့်ထွက်မည်
          </button>
        </div>
      </div>
    );
  }

  return (
    <PinLock>
      <GlobalPlayerSync />
      {children}
    </PinLock>
  );
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/betting" element={<Betting />} />
        <Route path="/history" element={<History />} />
        <Route path="/wallet" element={<Wallet />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/dealer-chat" element={<DealerChat />} />
      </Route>
    </Routes>
  );
};

export default function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}
