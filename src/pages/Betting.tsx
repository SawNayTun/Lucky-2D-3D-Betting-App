import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle, Lock, Plus, Trash2, List } from 'lucide-react';
import { database } from '../lib/firebase';
import { ref, onValue } from 'firebase/database';
import { usePlayerSync } from '../hooks/usePlayerSync';

import { API_BASE_URL } from '../constants';

interface BetItem {
  number: string;
  amount: string;
}

const Betting = () => {
  const { user, setUser, refreshUser } = useAuth();
  const [betType, setBetType] = useState<'2D' | '3D'>('2D');
  const [betList, setBetList] = useState<BetItem[]>([{ number: '', amount: '' }]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('loading');
  const navigate = useNavigate();
  const [friends, setFriends] = useState<any[]>([]);
  const [selectedDealerId, setSelectedDealerId] = useState<string>('');
  
  const { balance: dealerBalance, isBanned, isDeleted } = usePlayerSync(selectedDealerId);

  useEffect(() => {
    if (!user?.id) return;

    // Listen to friends list from Firebase
    const friendsRef = ref(database, `users/${user.id}/friends`);
    const unsubscribe = onValue(friendsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const friendsList = Object.keys(data)
          .map(key => ({
            id: key,
            ...data[key]
          }))
          .filter((f: any) => f.status === 'accepted'); // Only show accepted dealers
        
        setFriends(friendsList);
        
        // Try to get last dealer or default to first
        const lastDealerId = localStorage.getItem(`last_dealer_id_${user?.id}`);
        if (lastDealerId && friendsList.some((f: any) => f.id === lastDealerId)) {
          setSelectedDealerId(lastDealerId);
        } else if (friendsList.length > 0) {
          const firstId = friendsList[0].id;
          setSelectedDealerId(firstId);
          localStorage.setItem(`last_dealer_id_${user?.id}`, firstId);
        } else {
          setSelectedDealerId('');
        }
      } else {
        setFriends([]);
        setSelectedDealerId('');
      }
    });

    return () => unsubscribe();
  }, [user?.id]);

  useEffect(() => {
    // Initial fetch from API
    fetch(`${API_BASE_URL}/api/status`)
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

    return () => unsubscribe();
  }, []);

  const addBetRow = () => {
    setBetList([...betList, { number: '', amount: '' }]);
  };

  const removeBetRow = (index: number) => {
    if (betList.length === 1) {
      setBetList([{ number: '', amount: '' }]);
      return;
    }
    const newList = [...betList];
    newList.splice(index, 1);
    setBetList(newList);
  };

  const handleReverse = (index: number) => {
    const bet = betList[index];
    if (!bet.number || !bet.amount) return;

    if (betType === '2D' && bet.number.length === 2) {
      const reversed = bet.number.split('').reverse().join('');
      if (bet.number === reversed) return; // double

      const halfAmount = Math.floor(Number(bet.amount) / 2).toString();
      
      const newList = [...betList];
      newList.splice(index, 1, 
        { number: bet.number, amount: halfAmount },
        { number: reversed, amount: halfAmount }
      );
      setBetList(newList);
    } else if (betType === '3D' && bet.number.length === 3) {
      // Generate unique permutations
      const perms = new Set<string>();
      const chars = bet.number.split('');
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          if (i === j) continue;
          for (let k = 0; k < 3; k++) {
            if (i === k || j === k) continue;
            perms.add(chars[i] + chars[j] + chars[k]);
          }
        }
      }
      
      const permsArray = Array.from(perms);
      if (permsArray.length <= 1) return;

      const newList = [...betList];
      newList.splice(index, 1, ...permsArray.map(num => ({ number: num, amount: bet.amount })));
      setBetList(newList);
    }
  };

  const updateBetRow = (index: number, field: keyof BetItem, value: string) => {
    const newList = [...betList];
    if (field === 'number') {
      const maxLength = betType === '2D' ? 2 : 3;
      newList[index].number = value.replace(/\D/g, '').slice(0, maxLength);
    } else {
      newList[index].amount = value.replace(/\D/g, '');
    }
    setBetList(newList);
  };

  const handleBetTypeChange = (type: '2D' | '3D') => {
    setBetType(type);
    setBetList([{ number: '', amount: '' }]);
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (status !== 'open') {
      setError('စျေးကွက်ပိတ်ထားပါသည်။');
      return;
    }

    if (!selectedDealerId) {
      setError('ဒိုင်ရွေးချယ်ပေးပါ။');
      return;
    }

    // Filter out empty rows
    const validBets = betList.filter(b => b.number && b.amount);
    
    if (validBets.length === 0) {
      setError('အနည်းဆုံး တစ်ကွက် ထည့်သွင်းပေးပါ။');
      return;
    }

    // Validate bets
    const requiredLength = betType === '2D' ? 2 : 3;
    for (const b of validBets) {
      if (b.number.length !== requiredLength) {
        setError(`ဂဏန်း ${b.number} သည် ${requiredLength} လုံး မပြည့်ပါ။`);
        return;
      }
      if (Number(b.amount) < 100) {
        setError('အနည်းဆုံး ထိုးကြေးမှာ ၁၀၀ ကျပ် ဖြစ်ပါသည်။');
        return;
      }
    }

    const totalAmount = validBets.reduce((sum, b) => sum + Number(b.amount), 0);
    
    if (isDeleted || isBanned) {
      setError('အကောင့်ပိတ်ခံထားရသဖြင့် ဂဏန်းထိုး၍မရပါ။');
      return;
    }

    if (dealerBalance < totalAmount) {
      setError('လက်ကျန်ငွေ မလုံလောက်ပါ။ ကျေးဇူးပြု၍ ငွေသွင်းပါ။');
      return;
    }

    // If no friends, redirect to add dealer
    if (friends.length === 0) {
      alert('ဂဏန်းထိုးရန်အတွက် အရင်ဆုံး ဒိုင်တစ်ဦးကို Friend အပ်ပေးပါ။');
      navigate('/dealer-chat');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/bets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          bets: validBets,
          dealerId: selectedDealerId 
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Bet failed');
      }

      // Refresh user balance to trigger sync
      await refreshUser();

      // Success - Redirect to dealer chat to see the sent bet
      navigate('/dealer-chat', { 
        state: { 
          dealerId: selectedDealerId,
          justSubmitted: true
        } 
      });
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const [qpDigit, setQpDigit] = useState('');
  const [qpAmount, setQpAmount] = useState('');

  const handleQuickPick = (type: 'double' | 'head' | 'tail' | 'include') => {
    if (type !== 'double' && (!qpDigit || qpDigit.length !== 1)) {
      setError('ဂဏန်း ၁ လုံး ရိုက်ထည့်ပါ။');
      return;
    }
    if (!qpAmount || Number(qpAmount) < 100) {
      setError('အနည်းဆုံး ထိုးကြေး ၁၀၀ ကျပ် ထည့်ပါ။');
      return;
    }

    let newBets: BetItem[] = [];
    const amt = qpAmount;

    if (type === 'double') {
      for (let i = 0; i < 10; i++) {
        newBets.push({ number: `${i}${i}`, amount: amt });
      }
    } else if (type === 'head') {
      for (let i = 0; i < 10; i++) {
        newBets.push({ number: `${qpDigit}${i}`, amount: amt });
      }
    } else if (type === 'tail') {
      for (let i = 0; i < 10; i++) {
        newBets.push({ number: `${i}${qpDigit}`, amount: amt });
      }
    } else if (type === 'include') {
      const added = new Set<string>();
      for (let i = 0; i < 10; i++) {
        const headNum = `${qpDigit}${i}`;
        const tailNum = `${i}${qpDigit}`;
        if (!added.has(headNum)) {
          newBets.push({ number: headNum, amount: amt });
          added.add(headNum);
        }
        if (!added.has(tailNum)) {
          newBets.push({ number: tailNum, amount: amt });
          added.add(tailNum);
        }
      }
    }

    const currentBets = betList.filter(b => b.number || b.amount);
    setBetList([...currentBets, ...newBets]);
    setQpDigit('');
    setQpAmount('');
    setError('');
  };

  const isClosed = status === 'closed';
  const totalBetAmount = betList.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);

  return (
    <div className="p-4 space-y-6 pb-24">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ထိုးမည်</h1>
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${status === 'open' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
          စျေးကွက်: {status === 'open' ? 'ဖွင့်' : status === 'loading' ? '...' : 'ပိတ်'}
        </div>
      </div>

      {isBanned && (
        <div className="bg-red-500 text-white p-3 rounded-lg mt-4 text-center">
          ⚠️ သင့်အကောင့်ကို ယာယီပိတ်ထားပါသည်။ ဂဏန်းထိုး၍ မရနိုင်ပါ။
        </div>
      )}

      {isDeleted && (
        <div className="bg-red-500 text-white p-3 rounded-lg mt-4 text-center">
          ⚠️ သင့်အကောင့်ကို ဒိုင်မှ ဖျက်ပစ်လိုက်ပါပြီ။ ဂဏန်းထိုး၍ မရနိုင်ပါ။
        </div>
      )}

      <div className="flex space-x-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
        <button
          onClick={() => handleBetTypeChange('2D')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${
            betType === '2D'
              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          2D
        </button>
        <button
          onClick={() => handleBetTypeChange('3D')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${
            betType === '3D'
              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          3D
        </button>
      </div>

      {friends.length > 0 ? (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">ဒိုင်ရွေးချယ်ရန်</label>
          <select 
            value={selectedDealerId}
            onChange={(e) => {
              setSelectedDealerId(e.target.value);
              localStorage.setItem(`last_dealer_id_${user?.id}`, e.target.value);
            }}
            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition text-sm"
          >
            <option value="" disabled>ဒိုင်ရွေးချယ်ပါ</option>
            {friends.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>
      ) : (
        <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-200 dark:border-amber-800/50">
          <p className="text-amber-700 dark:text-amber-400 text-sm flex items-center">
            <AlertCircle size={16} className="mr-2" />
            ဂဏန်းထိုးရန်အတွက် အရင်ဆုံး ဒိုင်တစ်ဦးကို Friend အပ်ပေးပါ။ (ဒိုင်ဘက်မှ လက်ခံပြီးမှသာ ထိုး၍ရပါမည်)
          </p>
          <button 
            onClick={() => navigate('/dealer-chat')}
            className="mt-3 w-full py-2 bg-amber-600 text-white rounded-lg text-sm font-bold shadow-sm"
          >
            ဒိုင်အပ်ရန် သွားမည်
          </button>
        </div>
      )}

      {betType === '2D' && !isClosed && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">အမြန်ရွေးချယ်မှု</h3>
          <div className="flex space-x-2 mb-3">
            <input
              type="text"
              maxLength={1}
              value={qpDigit}
              onChange={(e) => setQpDigit(e.target.value.replace(/\D/g, ''))}
              placeholder="ဂဏန်း"
              className="w-16 px-3 py-2 text-center font-mono border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <input
              type="text"
              value={qpAmount}
              onChange={(e) => setQpAmount(e.target.value.replace(/\D/g, ''))}
              placeholder="ပမာဏ"
              className="flex-1 px-3 py-2 font-mono border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="grid grid-cols-4 gap-2">
            <button onClick={() => handleQuickPick('head')} className="py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 transition">ထိပ်</button>
            <button onClick={() => handleQuickPick('tail')} className="py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 transition">ပိတ်</button>
            <button onClick={() => handleQuickPick('include')} className="py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 transition">အပါ</button>
            <button onClick={() => handleQuickPick('double')} className="py-2 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg text-sm font-medium hover:bg-purple-100 dark:hover:bg-purple-900/50 transition">အပူး</button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex justify-between items-center mb-6">
          <span className="text-gray-500 dark:text-gray-400 text-sm">လက်ကျန်ငွေ</span>
          <span className="text-xl font-bold text-blue-600 dark:text-blue-400">{dealerBalance.toLocaleString()} ကျပ်</span>
        </div>

        {isClosed && (
          <div className="bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 p-4 rounded-lg text-sm flex items-start mb-6 border border-amber-200 dark:border-amber-800">
            <Lock size={18} className="mr-3 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-bold mb-1">စျေးကွက်ပိတ်ထားပါသည်</p>
              <p>လက်ရှိအချိန်တွင် ဂဏန်းထိုး၍မရနိုင်သေးပါ။ စျေးကွက်ပြန်ဖွင့်ချိန်မှ ပြန်လည်ကြိုးစားပေးပါ။</p>
            </div>
          </div>
        )}

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
          <div className="space-y-3">
            {betList.map((bet, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div className="flex-1">
                  <input
                    type="text"
                    maxLength={betType === '2D' ? 2 : 3}
                    value={bet.number}
                    disabled={isClosed || loading}
                    onChange={(e) => updateBetRow(index, 'number', e.target.value)}
                    className={`w-full px-3 py-2 text-center text-lg font-mono border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition ${
                      isClosed ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    placeholder="ဂဏန်း"
                  />
                </div>
                <div className="flex-[2]">
                  <input
                    type="text"
                    value={bet.amount}
                    disabled={isClosed || loading}
                    onChange={(e) => updateBetRow(index, 'amount', e.target.value)}
                    className={`w-full px-3 py-2 text-center text-lg font-mono border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition ${
                      isClosed ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    placeholder="ပမာဏ"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleReverse(index)}
                  disabled={isClosed || loading || !bet.number || !bet.amount || (betType === '2D' && bet.number.length !== 2) || (betType === '3D' && bet.number.length !== 3)}
                  className="p-2 text-blue-500 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition font-bold"
                  title="အာမည် (Reverse)"
                >
                  R
                </button>
                <button
                  type="button"
                  onClick={() => removeBetRow(index)}
                  disabled={isClosed || loading}
                  className="p-2 text-gray-400 hover:text-red-500 transition"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addBetRow}
            disabled={isClosed || loading}
            className="w-full py-2 flex items-center justify-center space-x-2 border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 rounded-lg hover:border-blue-500 hover:text-blue-500 transition"
          >
            <Plus size={18} />
            <span>နောက်ထပ်ထည့်မည်</span>
          </button>

          <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-500 dark:text-gray-400">လက်ကျန်ငွေ</span>
              <span className="text-lg font-bold text-green-600 dark:text-green-400">{dealerBalance.toLocaleString()} ကျပ်</span>
            </div>
            <div className="flex justify-between items-center mb-4">
              <span className="text-gray-500 dark:text-gray-400">စုစုပေါင်း ကျသင့်ငွေ</span>
              <span className="text-xl font-bold text-gray-900 dark:text-white">{totalBetAmount.toLocaleString()} ကျပ်</span>
            </div>
            
            <button
              type="submit"
              disabled={isClosed || loading || totalBetAmount === 0 || isBanned || isDeleted}
              className={`w-full py-3 px-4 font-semibold rounded-lg shadow-md transition duration-200 ${
                isClosed || totalBetAmount === 0 || isBanned || isDeleted
                  ? 'bg-gray-400 cursor-not-allowed text-white' 
                  : loading 
                    ? 'bg-blue-600 opacity-70 cursor-not-allowed text-white' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {loading ? 'လုပ်ဆောင်နေသည်...' : isClosed ? 'စျေးကွက်ပိတ်ထားသည်' : isBanned ? 'အကောင့်ပိတ်ခံထားရသည်' : isDeleted ? 'အကောင့်ဖျက်ခံထားရသည်' : 'ထိုးမည်'}
            </button>
          </div>
        </form>
      </div>

      <div className="text-center text-xs text-gray-400 mt-4">
        ဂဏန်းမထိုးခင် သေချာစစ်ဆေးပါ။ ထိုးပြီးလျှင် ပြန်ဖျက်၍မရပါ။
      </div>
    </div>
  );
};

export default Betting;
