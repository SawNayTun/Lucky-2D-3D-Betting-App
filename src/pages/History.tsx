import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

const History = () => {
  const [bets, setBets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/bets')
      .then((res) => res.json())
      .then((data) => {
        setBets(data);
        setLoading(false);
      });
  }, []);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ထိုးကွက်မှတ်တမ်း</h1>

      {loading ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading history...</div>
      ) : bets.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400">မှတ်တမ်းမရှိသေးပါ။</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bets.map((bet: any) => (
            <div key={bet.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center font-bold text-lg">
                  {bet.number}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">2D</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(bet.created_at).toLocaleString()}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-900 dark:text-white">{bet.amount.toLocaleString()} ကျပ်</p>
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium capitalize ${
                  bet.status === 'win' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 
                  bet.status === 'lose' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' : 
                  'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                }`}>
                  {bet.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default History;
