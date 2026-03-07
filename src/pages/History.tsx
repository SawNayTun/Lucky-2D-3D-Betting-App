import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Copy, Check, Trash2, XCircle } from 'lucide-react';
import { API_BASE_URL } from '../constants';

const History = () => {
  const { user } = useAuth();
  const [bets, setBets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const fetchBets = () => {
    setLoading(true);
    fetch(`${API_BASE_URL}/api/bets`)
      .then((res) => res.json())
      .then((data) => {
        setBets(data);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchBets();
  }, []);

  const copyReport = () => {
    if (bets.length === 0) return;

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB');
    const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    
    let report = `--- ${user?.username || user?.phone} ---\n`;
    report += `နေ့စွဲ - ${dateStr} (${timeStr})\n`;
    report += `--------------------\n`;
    
    let totalAmount = 0;
    bets.forEach((bet: any, index: number) => {
      report += `${bet.number} = ${bet.amount}\n`;
      totalAmount += bet.amount;
      
      // Add divider every 10 items like in user example
      if ((index + 1) % 10 === 0 && index !== bets.length - 1) {
        report += `--------------------\n`;
      }
    });
    
    report += `--------------------\n`;
    report += `စုစုပေါင်း: (${bets.length}) ကွက် - ${totalAmount} ကျပ်`;

    navigator.clipboard.writeText(report).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const deleteBet = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/bets/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setBets((prev: any) => prev.filter((b: any) => b.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete bet:', err);
    }
  };

  const clearHistory = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/bets`, { method: 'DELETE' });
      if (res.ok) {
        setBets([]);
      }
    } catch (err) {
      console.error('Failed to clear history:', err);
    }
  };

  return (
    <div className="p-4 space-y-4 pb-20">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ထိုးကွက်မှတ်တမ်း</h1>
        <div className="flex space-x-2">
          {bets.length > 0 && (
            <>
              <button 
                onClick={copyReport}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition shadow-sm"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                <span>{copied ? 'Copied!' : 'Report'}</span>
              </button>
              <button 
                onClick={clearHistory}
                className="flex items-center space-x-2 bg-red-100 hover:bg-red-200 text-red-600 px-3 py-1.5 rounded-lg text-sm font-medium transition"
                title="Clear All"
              >
                <Trash2 size={16} />
              </button>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading history...</div>
      ) : bets.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400">မှတ်တမ်းမရှိသေးပါ။</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bets.map((bet: any) => (
            <div key={bet.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-center group">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center font-bold text-lg">
                  {bet.number}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{bet.number.length === 3 ? '3D' : '2D'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(bet.created_at).toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
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
                <button 
                  onClick={() => deleteBet(bet.id)}
                  className="text-gray-300 hover:text-red-500 transition p-1"
                >
                  <XCircle size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default History;
