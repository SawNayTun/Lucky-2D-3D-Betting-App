import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ArrowUpCircle, ArrowDownCircle, CheckCircle, AlertCircle } from 'lucide-react';
import { API_BASE_URL } from '../constants';

const Wallet = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'topup' | 'withdraw'>('topup');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('kpay');
  const [proof, setProof] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append('type', activeTab === 'topup' ? 'deposit' : 'withdraw');
    formData.append('amount', amount);
    formData.append('method', method);
    if (proof) {
      formData.append('proof', proof);
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/transactions`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Transaction failed');

      setMessage({ type: 'success', text: 'Request submitted successfully!' });
      setAmount('');
      setProof(null);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ပိုက်ဆံအိတ်</h1>

      {/* Balance Card */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-2xl p-6 text-white shadow-lg flex flex-col items-center justify-center space-y-2">
        <p className="text-blue-100 text-sm font-medium">လက်ကျန်ငွေ</p>
        <h2 className="text-4xl font-bold">{user?.balance?.toLocaleString()} ကျပ်</h2>
      </div>

      {/* Form */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center">
          <ArrowUpCircle className="mr-2 text-green-500" />
          ငွေဖြည့်ရန်
        </h3>

        {message && (
          <div className={`p-3 rounded-lg text-sm flex items-center mb-4 ${message.type === 'success' ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'}`}>
            {message.type === 'success' ? <CheckCircle size={16} className="mr-2" /> : <AlertCircle size={16} className="mr-2" />}
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">


          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ပမာဏ (ကျပ်)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="အနည်းဆုံး ၁၀၀၀"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ငွေလွှဲပြေစာ (Screenshot)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setProof(e.target.files ? e.target.files[0] : null)}
              className="w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-blue-900 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-800"
            />
            <p className="text-xs text-gray-400 mt-1">ငွေလွှဲထားသော Screenshot တင်ပေးပါ။</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition duration-200 ${
              loading ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {loading ? 'လုပ်ဆောင်နေသည်...' : 'ငွေဖြည့်မည်'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Wallet;
