import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';

const countryCodes = [
  { code: '+95', country: 'Myanmar' },
  { code: '+66', country: 'Thailand' },
  { code: '+86', country: 'China' },
  { code: '+856', country: 'Laos' },
  { code: '+65', country: 'Singapore' },
  { code: '+60', country: 'Malaysia' },
  { code: '+81', country: 'Japan' },
  { code: '+82', country: 'South Korea' },
  { code: '+91', country: 'India' },
  { code: '+84', country: 'Vietnam' },
  { code: '+855', country: 'Cambodia' },
  { code: '+62', country: 'Indonesia' },
  { code: '+63', country: 'Philippines' },
  { code: '+1', country: 'USA' },
];

const Login = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [countryCode, setCountryCode] = useState('+95');
  const [phoneBody, setPhoneBody] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, register, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    
    // Combine country code and phone body
    // Remove all non-digit characters first
    const digitsOnly = phoneBody.replace(/\D/g, '');
    // Remove leading zero from phone body if present
    const cleanPhoneBody = digitsOnly.replace(/^0+/, '');
    const fullPhone = `${countryCode}${cleanPhoneBody}`;

    try {
      if (isRegister) {
        await register(fullPhone, password, username);
      } else {
        await login(fullPhone, password);
      }
      navigate('/');
    } catch (err: any) {
      const msg = err.message || 'Authentication failed';
      if (msg.includes('Invalid credentials')) {
        setError('စကားဝှက် မှားယွင်းနေပါသည်။');
      } else if (msg.includes('User not found')) {
        setError('အကောင့်မရှိပါ။ ကျေးဇူးပြု၍ အကောင့်သစ်ဖွင့်ပါ။');
      } else if (msg.includes('Phone number already registered')) {
        setError('ဤဖုန်းနံပါတ်ဖြင့် အကောင့်ရှိပြီးသားဖြစ်ပါသည်။');
      } else if (msg.includes('Username already taken')) {
        setError('ဤအမည်ဖြင့် အကောင့်ရှိပြီးသားဖြစ်ပါသည်။ အခြားအမည်တစ်ခု ရွေးချယ်ပါ။');
      } else {
        setError('စနစ်ချို့ယွင်းချက် ဖြစ်ပေါ်နေပါသည်။ ပြန်လည်ကြိုးစားပါ။');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 bg-gray-50 dark:bg-gray-900 transition-colors duration-200 relative">
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 p-2 rounded-full bg-white dark:bg-gray-800 text-gray-800 dark:text-white shadow-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition"
      >
        {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
      </button>

      <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 transition-colors duration-200">
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-800 dark:text-white">
          {isRegister ? 'အကောင့်သစ်ဖွင့်ရန်' : 'အကောင့်ဝင်ရန်'}
        </h2>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm dark:bg-red-900/30 dark:border-red-800 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ဖုန်းနံပါတ်</label>
            <div className="flex">
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="px-2 py-2 border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm max-w-[100px]"
              >
                {countryCodes.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.country} ({c.code})
                  </option>
                ))}
              </select>
              <input
                type="tel"
                value={phoneBody}
                onChange={(e) => setPhoneBody(e.target.value)}
                className="w-full px-3 py-2 border border-l-0 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-r-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="9xxxxxxxxx"
                required
              />
            </div>
          </div>

          {isRegister && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">အမည် (Optional)</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="သင့်အမည်"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">စကားဝှက်</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
              required
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              * SMS ကုဒ်ပို့မည်မဟုတ်ပါ။ မိမိသတ်မှတ်ခဲ့သော စကားဝှက်ဖြင့်သာ ဝင်ရောက်ပါ။
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition duration-200 font-medium ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isSubmitting ? 'လုပ်ဆောင်နေပါသည်...' : (isRegister ? 'အကောင့်ဖွင့်မည်' : 'ဝင်မည်')}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            {isRegister ? 'အကောင့်ရှိပြီးသားလား? ဝင်ရန်' : "အကောင့်မရှိဘူးလား? အကောင့်သစ်ဖွင့်ရန်"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
