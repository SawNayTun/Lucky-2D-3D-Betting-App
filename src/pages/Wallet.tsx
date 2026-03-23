import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePlayerSync } from '../hooks/usePlayerSync';
import { ArrowUpCircle, ArrowDownCircle, CheckCircle, AlertCircle, Clock, Wallet as WalletIcon, CreditCard, User, Hash, Trash2 } from 'lucide-react';
import { fetchApi } from '../utils/api';
import { database } from '../lib/firebase';
import { ref, push, set, serverTimestamp } from 'firebase/database';
import { useLocation } from 'react-router-dom';

const Wallet = () => {
  const { user, refreshUser } = useAuth();
  const location = useLocation();
  const dealerIdInput = localStorage.getItem(`last_dealer_id_${user?.id}`) || '';
  
  // Extract UUID from "Name-UUID" format if necessary
  const extractUuid = (input: string) => {
    if (!input) return '';
    const parts = input.split('-');
    if (parts.length >= 5) {
      // Looks like a UUID or contains one
      const uuidMatch = input.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
      return uuidMatch ? uuidMatch[0] : input;
    }
    return input;
  };

  const dealerId = extractUuid(dealerIdInput);
  const { balance: dealerBalance } = usePlayerSync(dealerId);

  const [activeTab, setActiveTab] = useState<'topup' | 'withdraw'>(location.state?.tab || 'topup');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('kpay');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [proof, setProof] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [transactions, setTransactions] = useState([]);
  const [txToDelete, setTxToDelete] = useState<number | null>(null);

  const fetchTransactions = async () => {
    try {
      const res = await fetchApi('/api/transactions');
      if (res.ok) {
        const data = await res.json();
        setTransactions(data);
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dealerId) {
      setMessage({ type: 'error', text: 'ဒိုင်ကို အရင်ရွေးချယ်ပေးပါ။' });
      return;
    }

    setLoading(true);
    setMessage(null);

    const type = activeTab === 'topup' ? 'deposit' : 'withdraw';

    try {
      // 1. Send to Firebase for Dealer App to see
      const requestsRef = ref(database, `requests/${dealerId}`);
      const newRequestRef = push(requestsRef);
      const requestId = newRequestRef.key;

      const firebasePayload: any = {
        id: requestId,
        senderId: user?.id,
        senderName: user?.username || user?.phone,
        username: user?.username || user?.phone,
        type: type,
        amount: Number(amount),
        paymentMethod: method,
        status: 'pending',
        timestamp: serverTimestamp(),
      };

      if (type === 'withdraw') {
        firebasePayload.accountName = accountName;
        firebasePayload.accountNumber = accountNumber;
      }

      await set(newRequestRef, firebasePayload);

      // 2. Also send to local API for history (Optional, but keeping it for now)
      const formData = new FormData();
      formData.append('type', type);
      formData.append('amount', amount);
      formData.append('method', method);
      if (type === 'withdraw') {
        formData.append('accountName', accountName);
        formData.append('accountNumber', accountNumber);
      }
      if (proof) {
        formData.append('proof', proof);
      }

      await fetchApi('/api/transactions', {
        method: 'POST',
        body: formData,
      });

      setMessage({ 
        type: 'success', 
        text: type === 'deposit' ? 'ငွေဖြည့်ရန် တောင်းဆိုမှု ပေးပို့ပြီးပါပြီ။' : 'ငွေထုတ်ရန် တောင်းဆိုမှု ပေးပို့ပြီးပါပြီ။' 
      });
      setAmount('');
      setAccountName('');
      setAccountNumber('');
      setProof(null);
      fetchTransactions();
      refreshUser();
    } catch (err: any) {
      console.error('Transaction error:', err);
      setMessage({ type: 'error', text: 'လုပ်ဆောင်ချက် မအောင်မြင်ပါ။ နောက်မှ ပြန်ကြိုးစားကြည့်ပါ။' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTransaction = async () => {
    if (txToDelete === null) return;
    
    try {
      setLoading(true);
      const res = await fetchApi(`/api/transactions/${txToDelete}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        setTransactions(transactions.filter((tx: any) => tx.id !== txToDelete));
        setTxToDelete(null);
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'ဖျက်၍မရပါ။' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'ဖျက်၍မရပါ။' });
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
        <h2 className="text-4xl font-bold">{dealerBalance.toLocaleString()} ကျပ်</h2>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('topup')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center ${
            activeTab === 'topup'
              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          <ArrowUpCircle size={18} className="mr-2" />
          ငွေဖြည့်
        </button>
        <button
          onClick={() => setActiveTab('withdraw')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center ${
            activeTab === 'withdraw'
              ? 'bg-white dark:bg-gray-700 text-red-600 dark:text-red-400 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          <ArrowDownCircle size={18} className="mr-2" />
          ငွေထုတ်
        </button>
      </div>

      {/* Form */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center">
          {activeTab === 'topup' ? (
            <>
              <ArrowUpCircle className="mr-2 text-green-500" />
              ငွေဖြည့်ရန်
            </>
          ) : (
            <>
              <ArrowDownCircle className="mr-2 text-red-500" />
              ငွေထုတ်ရန်
            </>
          )}
        </h3>

        {message && (
          <div className={`p-3 rounded-lg text-sm flex items-center mb-4 ${message.type === 'success' ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'}`}>
            {message.type === 'success' ? <CheckCircle size={16} className="mr-2" /> : <AlertCircle size={16} className="mr-2" />}
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ငွေပေးချေမှုစနစ်</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="kpay">KPay</option>
              <option value="wave">WavePay</option>
              <option value="cb">CB Pay</option>
              <option value="aya">AYA Pay</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ပမာဏ (ကျပ်)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={activeTab === 'topup' ? "အနည်းဆုံး ၁၀၀၀" : "ထုတ်ယူမည့် ပမာဏ"}
              required
            />
          </div>

          {activeTab === 'withdraw' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center">
                  <User size={14} className="mr-1" /> အမည် (Account Name)
                </label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ငွေလက်ခံမည့်သူ အမည်"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center">
                  <Hash size={14} className="mr-1" /> ဖုန်းနံပါတ် (Account Number)
                </label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ငွေလက်ခံမည့် ဖုန်းနံပါတ်"
                  required
                />
              </div>
            </>
          )}

          {activeTab === 'topup' && (
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
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 px-4 ${activeTab === 'topup' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'} text-white font-semibold rounded-lg shadow-md transition duration-200 ${
              loading ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {loading ? 'လုပ်ဆောင်နေသည်...' : (activeTab === 'topup' ? 'ငွေဖြည့်မည်' : 'ငွေထုတ်မည်')}
          </button>
        </form>
      </div>

      {/* Transaction History */}
      <div className="space-y-4 pb-20">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center">
          <Clock className="mr-2 text-blue-500" />
          မှတ်တမ်းများ
        </h3>
        
        {transactions.length === 0 ? (
          <div className="text-center py-8 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 text-gray-500">
            မှတ်တမ်းမရှိသေးပါ။
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx: any) => (
              <div key={tx.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-full ${tx.type === 'deposit' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    {tx.type === 'deposit' ? <ArrowUpCircle size={20} /> : <ArrowDownCircle size={20} />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      {tx.type === 'deposit' ? 'ငွေဖြည့်ခြင်း' : 'ငွေထုတ်ခြင်း'}
                    </p>
                    <p className="text-[10px] text-gray-500">{new Date(tx.created_at).toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={() => setTxToDelete(tx.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                  <div className="text-right">
                    <p className={`font-bold ${tx.type === 'deposit' ? 'text-green-600' : 'text-red-600'}`}>
                    {tx.type === 'deposit' ? '+' : '-'}{tx.amount.toLocaleString()}
                  </p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    tx.status === 'approved' ? 'bg-green-100 text-green-700' :
                    tx.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {tx.status === 'approved' ? 'အတည်ပြုပြီး' : tx.status === 'rejected' ? 'ငြင်းပယ်သည်' : 'စောင့်ဆိုင်းဆဲ'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>

      {/* Delete Confirmation Modal */}
      {txToDelete !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-xl border border-gray-100 dark:border-gray-700">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full text-red-600 dark:text-red-400">
                <Trash2 size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">မှတ်တမ်းဖျက်မည်</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  ဤမှတ်တမ်းကို ဖျက်ရန် သေချာပါသလား? ဤလုပ်ဆောင်ချက်ကို ပြန်ပြင်၍မရပါ။
                </p>
              </div>
              <div className="flex w-full space-x-3 pt-2">
                <button
                  onClick={() => setTxToDelete(null)}
                  className="flex-1 py-2.5 px-4 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  မလုပ်တော့ပါ
                </button>
                <button
                  onClick={handleDeleteTransaction}
                  disabled={loading}
                  className="flex-1 py-2.5 px-4 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  ဖျက်မည်
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Wallet;
