import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Globe, Copy, Check } from 'lucide-react';

const Login = () => {
  const [tokenInput, setTokenInput] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  useEffect(() => {
    let id = localStorage.getItem('device_id');
    if (!id) {
      id = crypto.randomUUID ? crypto.randomUUID() : 'dev_' + Date.now() + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('device_id', id);
      localStorage.setItem('install_time', new Date().toISOString());
    }
    setDeviceId(id);
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(deviceId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) {
      setError('Login Token ထည့်ပါ');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      // For prototype, we use deviceId as the username/phone and the token as the password
      await login(deviceId, tokenInput.trim());
      navigate('/');
    } catch (err: any) {
      console.error('Login error:', err);
      const msg = err.message || '';
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
        setError('အင်တာနက်ချိတ်ဆက်မှု မရရှိနိုင်ပါ။ ကျေးဇူးပြု၍ အင်တာနက်ပြန်ဖွင့်ပါ။');
      } else {
        setError(msg || 'Token မှားယွင်းနေပါသည်။ ပြန်လည်ကြိုးစားပါ။');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-[100dvh] bg-black flex flex-col items-center justify-center p-6 text-white">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm bg-slate-900 border border-slate-800 border-t-4 border-t-amber-500 p-8 rounded-3xl text-center shadow-2xl"
      >
        <Globe className="mx-auto mb-4 text-amber-400" size={48} />
        <h1 className="text-xl font-black mb-6 text-white">Future World</h1>
        
        <div className="mb-6 text-left">
          <label className="block text-xs text-slate-400 mb-2 font-bold uppercase tracking-wider">Device ID</label>
          <div 
            onClick={handleCopy}
            className="flex items-center justify-between bg-slate-950 border border-slate-800 p-3 rounded-xl cursor-pointer hover:border-amber-500/50 transition-colors group"
          >
            <span className="font-mono text-xs text-slate-300 truncate mr-2">{deviceId}</span>
            {copied ? <Check size={16} className="text-emerald-400 flex-shrink-0" /> : <Copy size={16} className="text-slate-500 group-hover:text-amber-400 flex-shrink-0 transition-colors" />}
          </div>
          <p className="text-[10px] text-slate-500 mt-2">အထက်ပါ Device ID ကို ကော်ပီကူးပြီး ဒိုင်ထံသို့ ပေးပို့ပါ</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea 
            placeholder="Login Token ရိုက်ထည့်ပါ"
            className="w-full bg-slate-800 border border-slate-700 p-3 rounded-xl text-center text-white outline-none font-mono text-xs focus:border-amber-500 transition-colors h-24 resize-none placeholder:text-slate-500 placeholder:font-sans placeholder:text-sm"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            required
          ></textarea>

          {error && <p className="text-rose-500 text-xs mt-2">{error}</p>}

          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full bg-amber-600 p-4 rounded-xl font-black disabled:bg-slate-700 hover:bg-amber-500 transition-colors mt-2"
          >
            {isSubmitting ? 'စစ်ဆေးနေပါသည်...' : 'အကောင့်ဝင်မည်'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default Login;
