import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Sun, Moon } from 'lucide-react';

const Login = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, register, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      if (isRegister) {
        await register(phone, password, username);
      } else {
        await login(phone, password);
      }
      navigate('/');
    } catch (err: any) {
      console.error('Login/Register error:', err);
      // More descriptive error handling
      const msg = err.message || '';
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
        setError('အင်တာနက်ချိတ်ဆက်မှု မရရှိနိုင်ပါ။ ကျေးဇူးပြု၍ အင်တာနက်ပြန်ဖွင့်ပါ။');
      } else {
        setError(msg || 'စနစ်ချို့ယွင်းချက် ဖြစ်ပေါ်နေပါသည်။ ပြန်လည်ကြိုးစားပါ။');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-300 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <button 
        onClick={toggleTheme}
        className={`absolute top-4 right-4 p-2 rounded-full ${theme === 'dark' ? 'bg-gray-800 text-yellow-400' : 'bg-white text-gray-600 shadow-sm'}`}
      >
        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`w-full max-w-md p-8 rounded-3xl shadow-xl border transition-colors duration-300 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}
      >
        <h1 className={`text-2xl font-bold mb-6 text-center ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          {isRegister ? 'အကောင့်သစ်ဖွင့်ရန်' : 'အကောင့်ဝင်ရန်'}
        </h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>ဖုန်းနံပါတ်</label>
            <input 
              type="tel" 
              value={phone} 
              onChange={(e) => setPhone(e.target.value)} 
              className={`w-full px-4 py-3 rounded-xl border outline-none transition-colors ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white focus:ring-2 focus:ring-blue-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:ring-2 focus:ring-blue-500'}`}
              placeholder="09xxxxxxxxx"
              required 
            />
          </div>
          
          {isRegister && (
            <div>
              <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>အမည်</label>
              <input 
                type="text" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                className={`w-full px-4 py-3 rounded-xl border outline-none transition-colors ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white focus:ring-2 focus:ring-blue-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:ring-2 focus:ring-blue-500'}`}
                placeholder="အမည်"
                required 
              />
            </div>
          )}
          
          <div>
            <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>စကားဝှက်</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className={`w-full px-4 py-3 rounded-xl border outline-none transition-colors ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white focus:ring-2 focus:ring-blue-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:ring-2 focus:ring-blue-500'}`}
              placeholder="••••••"
              required 
            />
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
          >
            {isSubmitting ? 'လုပ်ဆောင်နေသည်...' : (isRegister ? 'အကောင့်ဖွင့်မည်' : 'အကောင့်ဝင်မည်')}
          </button>
        </form>

        <button 
          onClick={() => setIsRegister(!isRegister)}
          className={`w-full mt-4 text-sm text-center transition-colors ${theme === 'dark' ? 'text-gray-400 hover:text-blue-400' : 'text-gray-600 hover:text-blue-600'}`}
        >
          {isRegister ? 'အကောင့်ရှိပြီးသားလား? အကောင့်ဝင်ရန်' : 'အကောင့်မရှိသေးဘူးလား? အကောင့်သစ်ဖွင့်ရန်'}
        </button>
      </motion.div>
    </div>
  );
};

export default Login;
