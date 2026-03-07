import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, LogOut, CheckCircle, AlertCircle } from 'lucide-react';

const PinLock = ({ children }: { children: React.ReactNode }) => {
  const { logout } = useAuth();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [savedPin, setSavedPin] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'enter' | 'set' | 'confirm'>('enter');
  const [error, setError] = useState('');

  useEffect(() => {
    const storedPin = localStorage.getItem('app_pin');
    if (storedPin) {
      setSavedPin(storedPin);
      setStep('enter');
    } else {
      setStep('set');
    }
  }, []);

  const handleNumberClick = (num: string) => {
    if (error) setError('');
    
    if (step === 'enter') {
      if (pin.length < 4) {
        const newPin = pin + num;
        setPin(newPin);
        if (newPin.length === 4) {
          if (newPin === savedPin) {
            setIsUnlocked(true);
          } else {
            setError('စကားဝှက် မှားယွင်းနေပါသည်။');
            setTimeout(() => setPin(''), 500);
          }
        }
      }
    } else if (step === 'set') {
      if (pin.length < 4) {
        const newPin = pin + num;
        setPin(newPin);
        if (newPin.length === 4) {
          setTimeout(() => {
            setStep('confirm');
            setConfirmPin(newPin);
            setPin('');
          }, 200);
        }
      }
    } else if (step === 'confirm') {
      if (pin.length < 4) {
        const newPin = pin + num;
        setPin(newPin);
        if (newPin.length === 4) {
          if (newPin === confirmPin) {
            localStorage.setItem('app_pin', newPin);
            setSavedPin(newPin);
            setIsUnlocked(true);
          } else {
            setError('စကားဝှက် မတူညီပါ။ ပြန်လည်သတ်မှတ်ပါ။');
            setTimeout(() => {
              setStep('set');
              setPin('');
              setConfirmPin('');
            }, 1000);
          }
        }
      }
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setError('');
  };

  const handleLogout = async () => {
    await logout();
    // Also clear PIN if they logout completely? Or keep it for this device?
    // Usually, if they logout, the PIN is kept for the device, but it's safer to clear it.
    localStorage.removeItem('app_pin');
  };

  if (isUnlocked) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 px-4 transition-colors duration-200">
      <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 flex flex-col items-center">
        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 mb-6">
          <Lock size={32} />
        </div>
        
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2 text-center">
          {step === 'enter' ? 'စကားဝှက် ရိုက်ထည့်ပါ' : step === 'set' ? 'စကားဝှက် အသစ်သတ်မှတ်ပါ' : 'စကားဝှက် အတည်ပြုပါ'}
        </h2>
        
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 text-center">
          {step === 'enter' ? 'အက်ပ်ထဲသို့ ဝင်ရောက်ရန် ဂဏန်း ၄ လုံး ရိုက်ထည့်ပါ' : step === 'set' ? 'နောက်တစ်ကြိမ် အလွယ်တကူဝင်ရန် ဂဏန်း ၄ လုံး သတ်မှတ်ပါ' : 'စောစောက ဂဏန်း ၄ လုံးကို ထပ်မံရိုက်ထည့်ပါ'}
        </p>

        {error && (
          <div className="flex items-center text-red-500 text-sm mb-4 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
            <AlertCircle size={16} className="mr-2" />
            {error}
          </div>
        )}

        <div className="flex space-x-4 mb-8">
          {[0, 1, 2, 3].map((i) => (
            <div 
              key={i} 
              className={`w-4 h-4 rounded-full transition-all duration-200 ${
                i < pin.length 
                  ? 'bg-blue-600 dark:bg-blue-400 scale-110' 
                  : 'bg-gray-200 dark:bg-gray-700'
              }`}
            />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-4 w-full max-w-[240px] mb-8">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleNumberClick(num.toString())}
              className="w-16 h-16 rounded-full bg-gray-50 dark:bg-gray-700 text-xl font-semibold text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600 active:bg-gray-200 dark:active:bg-gray-500 transition flex items-center justify-center mx-auto"
            >
              {num}
            </button>
          ))}
          <div className="w-16 h-16"></div>
          <button
            onClick={() => handleNumberClick('0')}
            className="w-16 h-16 rounded-full bg-gray-50 dark:bg-gray-700 text-xl font-semibold text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600 active:bg-gray-200 dark:active:bg-gray-500 transition flex items-center justify-center mx-auto"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            className="w-16 h-16 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600 transition flex items-center justify-center mx-auto"
          >
            ဖျက်မည်
          </button>
        </div>

        <button 
          onClick={handleLogout}
          className="flex items-center text-sm text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition"
        >
          <LogOut size={16} className="mr-2" />
          အကောင့်ထွက်မည်
        </button>
      </div>
    </div>
  );
};

export default PinLock;
