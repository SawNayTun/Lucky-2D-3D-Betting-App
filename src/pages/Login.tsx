import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const countryCodes = [
  { code: '+95', country: 'Myanmar', flag: '🇲🇲' },
  { code: '+66', country: 'Thailand', flag: '🇹🇭' },
  { code: '+86', country: 'China', flag: '🇨🇳' },
  { code: '+856', country: 'Laos', flag: '🇱🇦' },
  { code: '+65', country: 'Singapore', flag: '🇸🇬' },
  { code: '+60', country: 'Malaysia', flag: '🇲🇾' },
  { code: '+81', country: 'Japan', flag: '🇯🇵' },
  { code: '+82', country: 'South Korea', flag: '🇰🇷' },
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+84', country: 'Vietnam', flag: '🇻🇳' },
  { code: '+855', country: 'Cambodia', flag: '🇰🇭' },
  { code: '+62', country: 'Indonesia', flag: '🇮🇩' },
  { code: '+63', country: 'Philippines', flag: '🇵🇭' },
  { code: '+1', country: 'USA', flag: '🇺🇸' },
];

const Login = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [countryCode, setCountryCode] = useState('+95');
  const [phoneBody, setPhoneBody] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const { login, register, user } = useAuth();
  const { setTheme } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    setTheme('dark');
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setTheme]);

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    
    const digitsOnly = phoneBody.replace(/\D/g, '');
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
      const msg = err.message || '';
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
        setError('အင်တာနက်ချိတ်ဆက်မှု မရရှိနိုင်ပါ။ ကျေးဇူးပြု၍ အင်တာနက်ပြန်ဖွင့်ပါ။');
      } else if (msg.includes('Invalid credentials')) {
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

  const currentCountry = countryCodes.find(c => c.code === countryCode);

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0b0f1a] font-sans overflow-hidden p-0 md:p-4">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Main Container */}
      <div className="relative w-full h-screen md:h-auto md:max-w-4xl md:min-h-[600px] bg-[#1a1f2e] md:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col">
        
        {/* Forms Layer */}
        <div className="relative flex-1 w-full h-full flex flex-col md:flex-row">
          
          {/* Sign In Form */}
          <motion.div 
            className="absolute inset-0 md:w-1/2 flex items-center justify-center p-6 md:p-12 z-10 bg-[#1a1f2e] md:bg-transparent"
            animate={{ 
              x: isRegister ? (isMobile ? '100%' : '100%') : '0%',
              opacity: isRegister ? 0 : 1,
              pointerEvents: isRegister ? 'none' : 'auto'
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div className="w-full max-w-sm">
              <div className="text-center mb-6 md:mb-8">
                <h1 className="text-3xl md:text-4xl font-bold text-blue-400 mb-2">အနာဂတ်ကမ္ဘာ</h1>
                <h2 className="text-lg md:text-xl font-bold text-white/90">အကောင့်ဝင်ရန်</h2>
              </div>
              <div className="flex justify-center gap-3 mb-6">
                {['G', 'F', 'A'].map(icon => (
                  <div key={icon} className="w-10 h-10 border border-white/10 rounded-xl flex items-center justify-center cursor-pointer hover:bg-white/5 transition-colors text-white font-bold">{icon}</div>
                ))}
              </div>
              <span className="text-xs text-gray-500 text-center block mb-6">သို့မဟုတ် ဖုန်းနံပါတ်ဖြင့် ဝင်ရောက်ပါ</span>
              {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-2xl mb-6 text-xs text-center">{error}</div>}
              <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
                <div className="space-y-2">
                  <div className="flex bg-[#0f1423] border border-white/10 rounded-2xl overflow-hidden focus-within:border-blue-500/50 transition-colors">
                    <div className="relative border-r border-white/10">
                      <select value={countryCode} onChange={(e) => setCountryCode(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer z-10">
                        {countryCodes.map((c) => (<option key={c.code} value={c.code}>{c.code}</option>))}
                      </select>
                      <div className="h-12 px-4 flex items-center gap-2 min-w-[80px]">
                        <span className="text-sm font-medium text-gray-300">{countryCode}</span>
                        <ChevronDown size={12} className="text-gray-500" />
                      </div>
                    </div>
                    <input type="tel" value={phoneBody} onChange={(e) => setPhoneBody(e.target.value)} className="flex-1 h-12 px-4 bg-transparent focus:outline-none text-white placeholder:text-gray-600 text-sm" placeholder="ဖုန်းနံပါတ်" required />
                  </div>
                </div>
                <div className="bg-[#0f1423] border border-white/10 rounded-2xl focus-within:border-blue-500/50 transition-colors">
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full h-12 px-4 bg-transparent focus:outline-none text-white placeholder:text-gray-600 text-sm" placeholder="စကားဝှက်" required />
                </div>
                <button type="button" className="text-xs text-gray-500 hover:text-blue-400 text-center w-full block">စကားဝှက် မေ့နေပါသလား?</button>
                <motion.button whileTap={{ scale: 0.98 }} type="submit" disabled={isSubmitting} className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm shadow-lg flex items-center justify-center transition-all">
                  {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'ဝင်မည်'}
                </motion.button>
              </form>
              
              {/* Mobile Toggle */}
              <div className="mt-8 text-center md:hidden">
                <p className="text-sm text-gray-400 mb-2">အကောင့်မရှိသေးဘူးလား?</p>
                <button onClick={() => { setIsRegister(true); setError(''); }} className="text-blue-400 font-bold">အကောင့်သစ်ဖွင့်ရန်</button>
              </div>
            </div>
          </motion.div>

          {/* Sign Up Form */}
          <motion.div 
            className="absolute inset-0 md:w-1/2 flex items-center justify-center p-6 md:p-12 z-10 bg-[#1a1f2e] md:bg-transparent"
            initial={{ opacity: 0 }}
            animate={{ 
              x: isRegister ? '0%' : (isMobile ? '-100%' : '-100%'),
              opacity: isRegister ? 1 : 0,
              pointerEvents: isRegister ? 'auto' : 'none'
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{ left: isMobile ? '0%' : '50%' }}
          >
            <div className="w-full max-w-sm">
              <div className="text-center mb-6 md:mb-8">
                <h1 className="text-3xl md:text-4xl font-bold text-blue-400 mb-2">အနာဂတ်ကမ္ဘာ</h1>
                <h2 className="text-lg md:text-xl font-bold text-white/90">အကောင့်သစ်ဖွင့်ရန်</h2>
              </div>
              <div className="flex justify-center gap-3 mb-6">
                {['G', 'F', 'A'].map(icon => (
                  <div key={icon} className="w-10 h-10 border border-white/10 rounded-xl flex items-center justify-center cursor-pointer hover:bg-white/5 transition-colors text-white font-bold">{icon}</div>
                ))}
              </div>
              <span className="text-xs text-gray-500 text-center block mb-6">သို့မဟုတ် အချက်အလက်များဖြည့်၍ အကောင့်ဖွင့်ပါ</span>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex bg-[#0f1423] border border-white/10 rounded-2xl overflow-hidden focus-within:border-blue-500/50 transition-colors">
                  <div className="relative border-r border-white/10">
                    <select value={countryCode} onChange={(e) => setCountryCode(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer z-10">
                      {countryCodes.map((c) => (<option key={c.code} value={c.code}>{c.code}</option>))}
                    </select>
                    <div className="h-12 px-4 flex items-center gap-2 min-w-[80px]">
                      <span className="text-sm font-medium text-gray-300">{countryCode}</span>
                      <ChevronDown size={12} className="text-gray-500" />
                    </div>
                  </div>
                  <input type="tel" value={phoneBody} onChange={(e) => setPhoneBody(e.target.value)} className="flex-1 h-12 px-4 bg-transparent focus:outline-none text-white placeholder:text-gray-600 text-sm" placeholder="ဖုန်းနံပါတ်" required />
                </div>
                <div className="bg-[#0f1423] border border-white/10 rounded-2xl focus-within:border-blue-500/50 transition-colors">
                  <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full h-12 px-4 bg-transparent focus:outline-none text-white placeholder:text-gray-600 text-sm" placeholder="အမည်" />
                </div>
                <div className="bg-[#0f1423] border border-white/10 rounded-2xl focus-within:border-blue-500/50 transition-colors">
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full h-12 px-4 bg-transparent focus:outline-none text-white placeholder:text-gray-600 text-sm" placeholder="စကားဝှက်" required />
                </div>
                <motion.button whileTap={{ scale: 0.98 }} type="submit" disabled={isSubmitting} className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm shadow-lg flex items-center justify-center transition-all">
                  {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'ဖွင့်မည်'}
                </motion.button>
              </form>
              
              {/* Mobile Toggle */}
              <div className="mt-8 text-center md:hidden">
                <p className="text-sm text-gray-400 mb-2">အကောင့်ရှိပြီးသားလား?</p>
                <button onClick={() => { setIsRegister(false); setError(''); }} className="text-blue-400 font-bold">အကောင့်ဝင်ရန်</button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Overlay Container (Desktop Only) */}
        <motion.div 
          className="absolute top-0 left-0 w-1/2 h-full bg-blue-600 z-50 overflow-hidden hidden md:block"
          animate={{ 
            x: isRegister ? '0%' : '100%',
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <motion.div 
            className="relative -left-full h-full w-[200%] text-white"
            animate={{ x: isRegister ? '50%' : '0%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div className="absolute top-0 left-0 w-1/2 h-full flex flex-col items-center justify-center p-12 text-center">
              <h2 className="text-4xl font-bold mb-6">ပြန်လည်ကြိုဆိုပါတယ်!</h2>
              <p className="mb-8 text-blue-100 leading-relaxed">ဆိုဒ်ရဲ့ ဝန်ဆောင်မှုအားလုံးကို အသုံးပြုနိုင်ဖို့ အကောင့်ဝင်လိုက်ပါ။</p>
              <button onClick={() => { setIsRegister(false); setError(''); }} className="px-12 py-3 border-2 border-white rounded-2xl font-bold hover:bg-white hover:text-blue-600 transition-all uppercase tracking-wider text-sm">အကောင့်ဝင်ရန်</button>
            </div>
            <div className="absolute top-0 right-0 w-1/2 h-full flex flex-col items-center justify-center p-12 text-center">
              <h2 className="text-4xl font-bold mb-6">မင်္ဂလာပါ သူငယ်ချင်း!</h2>
              <p className="mb-8 text-blue-100 leading-relaxed">ဆိုဒ်ရဲ့ ဝန်ဆောင်မှုအားလုံးကို အသုံးပြုနိုင်ဖို့ အကောင့်ဖွင့်လိုက်ပါ။</p>
              <button onClick={() => { setIsRegister(true); setError(''); }} className="px-12 py-3 border-2 border-white rounded-2xl font-bold hover:bg-white hover:text-blue-600 transition-all uppercase tracking-wider text-sm">အကောင့်သစ်ဖွင့်ရန်</button>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
