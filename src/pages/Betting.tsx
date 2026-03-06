import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle } from 'lucide-react';

const Betting = () => {
  const { user, refreshUser } = useAuth();
  const [number, setNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!number || !amount) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    if (number.length !== 2 || isNaN(Number(number))) {
      setError('Please enter a valid 2-digit number (00-99)');
      setLoading(false);
      return;
    }

    if (Number(amount) < 100) {
      setError('Minimum bet amount is 100 Ks');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/bets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number, amount: Number(amount) }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Bet failed');
      }

      setSuccess(`Successfully placed bet on ${number} for ${amount} Ks!`);
      setNumber('');
      setAmount('');
      refreshUser(); // Update balance
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">2D ထိုးမည်</h1>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex justify-between items-center mb-6">
          <span className="text-gray-500 dark:text-gray-400 text-sm">လက်ကျန်ငွေ</span>
          <span className="text-xl font-bold text-blue-600 dark:text-blue-400">{user?.balance?.toLocaleString()} ကျပ်</span>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm flex items-center mb-4">
            <AlertCircle size={16} className="mr-2" />
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 p-3 rounded-lg text-sm flex items-center mb-4">
            <CheckCircle size={16} className="mr-2" />
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ဂဏန်း (00-99)</label>
            <input
              type="text"
              maxLength={2}
              value={number}
              onChange={(e) => setNumber(e.target.value.replace(/\D/g, ''))}
              className="w-full px-4 py-3 text-lg font-mono border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              placeholder="ဂဏန်းရိုက်ထည့်ပါ"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ပမာဏ (ကျပ်)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-3 text-lg font-mono border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              placeholder="အနည်းဆုံး ၁၀၀"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition duration-200 ${
              loading ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {loading ? 'လုပ်ဆောင်နေသည်...' : 'ထိုးမည်'}
          </button>
        </form>
      </div>

      <div className="text-center text-xs text-gray-400 mt-4">
        ဂဏန်းမထိုးခင် သေချာစစ်ဆေးပါ။ ထိုးပြီးလျှင် ပြန်ဖျက်၍မရပါ။
      </div>
    </div>
  );
};

export default Betting;
