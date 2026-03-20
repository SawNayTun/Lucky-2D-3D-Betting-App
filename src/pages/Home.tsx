import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePlayerSync } from '../hooks/usePlayerSync';
import { Link } from 'react-router-dom';
import { Wallet, TrendingUp, History, AlertCircle, MessageSquare, Trash2 } from 'lucide-react';
import { database } from '../lib/firebase';
import { ref, onValue } from 'firebase/database';

import { API_BASE_URL } from '../constants';

const Home = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState('loading');
  const [recentBets, setRecentBets] = useState([]);
  const [betToDelete, setBetToDelete] = useState<number | null>(null);

  const dealerId = localStorage.getItem(`last_dealer_id_${user?.id}`) || undefined;
  const { balance: dealerBalance } = usePlayerSync(dealerId);

  const fetchBets = () => {
    fetch(`${API_BASE_URL}/api/bets`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => setRecentBets(data.slice(0, 3)));
  };

  useEffect(() => {
    // Initial fetch from API
    fetch(`${API_BASE_URL}/api/status`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => setStatus(data.status));

    // Real-time listener for market status
    const statusRef = ref(database, 'settings/marketStatus');
    const unsubscribe = onValue(statusRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        setStatus(val);
      }
    });

    fetchBets();

    return () => unsubscribe();
  }, []);

  const deleteBet = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/bets/${id}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) {
        setRecentBets((prev: any) => prev.filter((b: any) => b.id !== id));
      }
      setBetToDelete(null);
    } catch (err) {
      console.error('Failed to delete bet:', err);
      setBetToDelete(null);
    }
  };

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">မင်္ဂလာပါ, {user?.username || user?.phone}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">ကြိုဆိုပါတယ်!</p>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${status === 'open' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
          စျေးကွက်: {status === 'open' ? 'ဖွင့်' : 'ပိတ်'}
        </div>
      </div>

      {/* Wallet Card */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-blue-100 text-sm font-medium">လက်ကျန်ငွေ</p>
            <h2 className="text-3xl font-bold mt-1">{dealerBalance.toLocaleString()} ကျပ်</h2>
          </div>
          <Wallet className="text-blue-200 opacity-80" size={28} />
        </div>
        <div className="flex space-x-3 mt-4">
          <Link to="/wallet" className="flex-1 bg-white/20 hover:bg-white/30 text-white text-sm font-medium py-2 rounded-lg text-center backdrop-blur-sm transition">
            ငွေဖြည့်
          </Link>
          <Link to="/wallet" className="flex-1 bg-white/20 hover:bg-white/30 text-white text-sm font-medium py-2 rounded-lg text-center backdrop-blur-sm transition">
            ငွေထုတ်
          </Link>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-3">
        <Link to="/betting" className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center space-y-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
          <div className="w-9 h-9 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <TrendingUp size={18} />
          </div>
          <span className="text-xs font-medium text-gray-700 dark:text-gray-200">ထိုးမယ်</span>
        </Link>
        <Link to="/dealer-chat" className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center space-y-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
          <div className="w-9 h-9 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400">
            <MessageSquare size={18} />
          </div>
          <span className="text-xs font-medium text-gray-700 dark:text-gray-200">ဒိုင်တင်မယ်</span>
        </Link>
        <Link to="/history" className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center space-y-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
          <div className="w-9 h-9 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center text-orange-600 dark:text-orange-400">
            <History size={18} />
          </div>
          <span className="text-xs font-medium text-gray-700 dark:text-gray-200">မှတ်တမ်း</span>
        </Link>
      </div>

      {/* Recent Activity */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">လတ်တလောထိုးထားသောစာရင်း</h3>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          {recentBets.length > 0 ? (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {recentBets.map((bet: any) => (
                <div key={bet.id} className="p-4 flex justify-between items-center group">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center font-bold text-gray-600 dark:text-gray-300 text-xs">
                      {bet.number}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{bet.number.length === 3 ? '3D' : '2D'}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(bet.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">-{bet.amount} ကျပ်</p>
                      <p className={`text-xs capitalize ${bet.status === 'win' ? 'text-green-600 dark:text-green-400' : bet.status === 'lose' ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                        {bet.status}
                      </p>
                    </div>
                    <button 
                      onClick={() => setBetToDelete(bet.id)}
                      className="text-gray-300 hover:text-red-500 transition p-1 opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">
              မှတ်တမ်းမရှိသေးပါ။
            </div>
          )}
        </div>
      </div>

      {/* Delete Single Bet Confirmation Modal */}
      {betToDelete !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">ထိုးကွက်ဖျက်ရန် အတည်ပြုပါ</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">ဤထိုးကွက်ကို ဖျက်ရန် သေချာပါသလား?</p>
            <div className="flex space-x-3">
              <button
                onClick={() => setBetToDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
              >
                မဖျက်တော့ပါ
              </button>
              <button
                onClick={() => deleteBet(betToDelete)}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition shadow-sm shadow-red-200 dark:shadow-none"
              >
                ဖျက်မည်
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
