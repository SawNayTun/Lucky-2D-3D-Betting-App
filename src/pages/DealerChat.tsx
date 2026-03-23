import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Send, User, ChevronLeft, CheckCircle2, XCircle, MessageSquare, QrCode, Plus, UserPlus, Trash2, Camera, X, Clock } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import jsQR from 'jsqr';
import { database } from '../lib/firebase';
import { ref, push, set, onValue, off, serverTimestamp, remove, query, orderByChild, equalTo, update } from 'firebase/database';

interface Message {
  id: string;
  sender: 'user' | 'dealer';
  text: string;
  timestamp: number;
  status?: 'pending' | 'accepted' | 'rejected';
  isBet?: boolean;
  reportKey?: string;
  isDeleted?: boolean;
  details?: { number: string; amount: string; accepted: boolean }[];
}

interface DealerFriend {
  id: string;
  name: string;
  addedAt: number;
  status: 'pending' | 'accepted' | 'blocked';
  balance?: number; // Some dealers might have specific credit/balance for user
}

const QRScanner = ({ onScan, onClose }: { onScan: (data: string) => void; onClose: () => void }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let animationFrameId: number;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.play();
          requestAnimationFrame(tick);
        }
      } catch (err) {
        setError('Camera access denied or not available.');
      }
    };

    const tick = () => {
      if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA && canvasRef.current) {
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (context) {
          canvas.height = videoRef.current.videoHeight;
          canvas.width = videoRef.current.videoWidth;
          context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });
          if (code) {
            onScan(code.data);
            return;
          }
        }
      }
      animationFrameId = requestAnimationFrame(tick);
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      cancelAnimationFrame(animationFrameId);
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-4">
      <div className="relative w-full max-w-sm aspect-square overflow-hidden rounded-2xl border-2 border-blue-500">
        <video ref={videoRef} className="w-full h-full object-cover" />
        <canvas ref={canvasRef} className="hidden" />
        <div className="absolute inset-0 border-[40px] border-black/50 pointer-events-none">
          <div className="w-full h-full border-2 border-white/50 rounded-lg"></div>
        </div>
      </div>
      <p className="text-white mt-6 text-center">QR Code ကို ဘောင်အတွင်းထားပေးပါ။</p>
      {error && <p className="text-red-500 mt-2">{error}</p>}
      <button onClick={onClose} className="mt-8 px-8 py-3 bg-white/10 hover:bg-white/20 text-white rounded-full font-medium transition">
        ပိတ်မည်
      </button>
    </div>
  );
};

const DealerChat = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedDealer, setSelectedDealer] = useState<DealerFriend | null>(null);
  const [friends, setFriends] = useState<DealerFriend[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [inputDealerId, setInputDealerId] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<Message | null>(null);
  const [friendToDelete, setFriendToDelete] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Extract UUID from "Name-UUID" format if necessary
  const extractUuid = (input: string) => {
    if (!input) return '';
    const trimmed = input.trim();
    const uuidMatch = trimmed.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    return uuidMatch ? uuidMatch[0] : trimmed;
  };

  useEffect(() => {
    if (!user?.id) return;

    // Listen to contacts list from Firebase
    const contactsRef = ref(database, `users/${user.id}/contacts`);
    const unsubscribeContacts = onValue(contactsRef, (snapshot) => {
      const data = snapshot.val();
      const contactsList: DealerFriend[] = data ? Object.keys(data).map(key => ({
        id: key,
        ...data[key],
        status: data[key].status || 'accepted' // Default to accepted if status is missing (dealer app doesn't set it)
      })) : [];
      
      setFriends(contactsList);

      // Sync selectedDealer with updated data from contacts list
      setSelectedDealer(prev => {
        if (!prev) return null;
        const updated = contactsList.find(f => f.id === prev.id);
        if (!updated) return null; // Dealer removed user
        return updated;
      });

      // Handle initial selection only once
      if (!isInitialized && contactsList.length > 0) {
        const state = location.state as { justSubmitted?: boolean; dealerId?: string };
        const targetId = state?.dealerId || localStorage.getItem(`last_dealer_id_${user?.id}`);
        
        if (targetId) {
          const dealer = contactsList.find((f: any) => f.id === targetId);
          if (dealer && dealer.status === 'accepted') {
            setSelectedDealer(dealer);
            if (state?.dealerId) {
              window.history.replaceState({}, document.title);
            }
          }
        }
        setIsInitialized(true);
      } else if (!data) {
        setFriends([]);
      }
    });

    return () => unsubscribeContacts();
  }, [user?.id, location.state, isInitialized]);

  useEffect(() => {
    if (!selectedDealer || !user?.id) return;

    const chatRef = ref(database, `chats/${selectedDealer.id}/${user.id}/messages`);
    const reportsRef = ref(database, 'reports');

    const updateMessages = (chatData: any, reportsData: any, dealerReportsData: any) => {
      const allMessages: Message[] = [];

      // Process Chat Messages
      if (chatData) {
        Object.keys(chatData).forEach(key => {
          const msg = chatData[key];
          let status = msg.status;
          if (msg.details && msg.details.length > 0) {
            const allAccepted = msg.details.every((d: any) => d.accepted);
            const anyRejected = msg.details.some((d: any) => !d.accepted && d.hasOwnProperty('accepted'));
            if (allAccepted) status = 'accepted';
            else if (anyRejected) status = 'rejected';
          }
          allMessages.push({
            id: key,
            ...msg,
            status: status,
            timestamp: msg.timestamp || Date.now()
          });
        });
      }

      // Process Dealer Reports (Bets and Replies)
      if (dealerReportsData) {
        Object.keys(dealerReportsData).forEach(key => {
          const report = dealerReportsData[key];
          // Check if this report belongs to the current user and dealer
          if (report.userId == user.id && report.dealerId == selectedDealer.id) {
            if (report.isReply) {
              // Display as a reply from the dealer
              allMessages.push({
                id: `reply-${key}`,
                sender: 'dealer',
                text: report.reportText,
                timestamp: report.timestamp || Date.now(),
              });
            } else {
              // Display as a bet report from the user
              allMessages.push({
                id: `report-${key}`,
                sender: 'user',
                text: report.reportText,
                timestamp: report.timestamp || Date.now(),
                status: report.status || 'pending'
              });
            }
          }
        });
      }

      // If no messages at all, add greeting
      if (allMessages.length === 0) {
        allMessages.push({
          id: 'init',
          sender: 'dealer',
          text: `မင်္ဂလာပါ! ${selectedDealer.name} မှ ကြိုဆိုပါတယ်။ ထိုးမည့်ဂဏန်းများကို ပို့ပေးပါ။`,
          timestamp: Date.now(),
        });
      }

      // Sort and Set
      allMessages.sort((a, b) => a.timestamp - b.timestamp);
      setMessages(allMessages);
    };

    let chatData: any = null;
    let reportsData: any = null;
    let dealerReportsData: any = null;

    const unsubscribeChat = onValue(chatRef, (snapshot) => {
      chatData = snapshot.val();
      updateMessages(chatData, reportsData, dealerReportsData);
    });

    const unsubscribeReports = onValue(reportsRef, (snapshot) => {
      reportsData = snapshot.val();
      updateMessages(chatData, reportsData, dealerReportsData);
    });

    const unsubscribeDealerReports = onValue(ref(database, `dealer_reports/${selectedDealer.id}`), (snapshot) => {
      dealerReportsData = snapshot.val();
      updateMessages(chatData, reportsData, dealerReportsData);
    });

    return () => {
      unsubscribeChat();
      unsubscribeReports();
      unsubscribeDealerReports();
    };
  }, [selectedDealer, user?.id]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleAddFriend = async (id: string) => {
    const trimmedId = extractUuid(id.trim());
    if (!trimmedId || !user?.id) {
      alert('ဒိုင် ID ထည့်ပေးပါ။');
      return;
    }
    
    // Basic UUID validation (8-4-4-4-12 format)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(trimmedId)) {
      alert('မှားယွင်းသော ဒိုင် ID ပုံစံဖြစ်နေပါသည်။');
      return;
    }

    if (friends.some(f => f.id === trimmedId)) {
      alert('ဤဒိုင်ကို Friend အပ်ပြီးသားဖြစ်ပါသည်။');
      return;
    }

    try {
      // 1. Add to user's contacts list as pending
      const userContactRef = ref(database, `users/${user.id}/contacts/${trimmedId}`);
      await set(userContactRef, {
        name: `ဒိုင် (${trimmedId.substring(0, 6)}...)`,
        addedAt: Date.now(),
        status: 'pending'
      });

      // 2. Send request to dealer's request node
      const requestRef = ref(database, `requests/${trimmedId}/${user.id}`);
      await set(requestRef, {
        id: user.id,
        senderId: user.id,
        senderName: user.username || user.phone,
        username: user.username || user.phone,
        phone: user.phone,
        timestamp: serverTimestamp(),
        type: 'friend',
        status: 'pending'
      });

      setShowAddModal(false);
      setInputDealerId('');
      setShowScanner(false);
      alert('Friend Request ပို့လိုက်ပါပြီ။ ဒိုင်ဘက်မှ လက်ခံသည်အထိ စောင့်ဆိုင်းပေးပါ။');
    } catch (error) {
      console.error('Error adding friend:', error);
      alert('အမှားတစ်ခုဖြစ်သွားပါသည်။ ပြန်လည်ကြိုးစားကြည့်ပါ။');
    }
  };

  const handleRemoveFriend = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFriendToDelete(id);
  };

  const confirmRemoveFriend = async () => {
    if (!friendToDelete || !user?.id) return;
    
    try {
      // Remove from user's contacts
      await set(ref(database, `users/${user.id}/contacts/${friendToDelete}`), null);
      // Also remove the request from dealer's node
      await set(ref(database, `requests/${friendToDelete}/${user.id}`), null);
      
      if (selectedDealer?.id === friendToDelete) {
        setSelectedDealer(null);
        localStorage.removeItem(`last_dealer_id_${user?.id}`);
        window.dispatchEvent(new Event('dealerChanged'));
      }
      setFriendToDelete(null);
    } catch (error) {
      console.error('Error removing friend:', error);
    }
  };

  const parseBets = (text: string) => {
    const regex = /(\d+)[=-](\d+)/g;
    const bets = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      bets.push({
        number: match[1],
        amount: match[2],
      });
    }
    return bets;
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedDealer || !user?.id) return;

    const chatRef = ref(database, `chats/${selectedDealer.id}/${user.id}/messages`);
    const newMessageRef = push(chatRef);
    
    set(newMessageRef, {
      sender: 'user',
      text: inputText,
      timestamp: serverTimestamp(),
      status: 'pending'
    });

    setInputText('');
  };

  const handleDeleteMessage = async (message: Message) => {
    if (!selectedDealer || !user?.id) return;
    setMessageToDelete(message);
  };

  const confirmDeleteMessage = async () => {
    if (!messageToDelete || !selectedDealer || !user?.id) return;
    
    const messageRef = ref(database, `chats/${selectedDealer.id}/${user.id}/messages/${messageToDelete.id}`);
    try {
      await update(messageRef, {
        text: 'ဤစာကို ပြန်ဖျက်လိုက်သည်',
        isDeleted: true,
        details: null, // Remove bet details if any
        status: 'deleted'
      });
      
      // If it's a bet, also remove the report from the reports node
      if (messageToDelete.reportKey) {
        const reportRef = ref(database, `reports/${messageToDelete.reportKey}`);
        await remove(reportRef).catch(e => console.error('Failed to delete report:', e));
        
        const dealerReportRef = ref(database, `dealer_reports/${selectedDealer.id}/${messageToDelete.reportKey}`);
        await remove(dealerReportRef).catch(e => console.error('Failed to delete dealer report:', e));
      }
    } catch (err) {
      console.error('Failed to delete message:', err);
      alert('ဖျက်ရန် အဆင်မပြေပါ။');
    } finally {
      setMessageToDelete(null);
    }
  };

  if (showScanner) {
    return <QRScanner onScan={handleAddFriend} onClose={() => setShowScanner(false)} />;
  }

  if (!selectedDealer) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 p-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center space-x-3">
            <button onClick={() => navigate(-1)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500">
              <ChevronLeft size={24} />
            </button>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">ဒိုင်တင်မည်</h1>
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition shadow-lg shadow-blue-500/20"
          >
            <UserPlus size={20} />
          </button>
        </div>

        {/* Friends List */}
        <div className="flex-1 p-4 space-y-4">
          {friends.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-60 py-20">
              <div className="w-20 h-20 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-400">
                <MessageSquare size={40} />
              </div>
              <div>
                <p className="text-gray-900 dark:text-white font-bold">Friend စာရင်းမရှိသေးပါ</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">ဒိုင် ID သို့မဟုတ် QR Code ဖြင့် Friend အပ်ပါ။</p>
              </div>
              <button 
                onClick={() => setShowAddModal(true)}
                className="px-6 py-2 bg-blue-600 text-white rounded-full font-medium"
              >
                Friend အပ်မည်
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {friends.map((friend) => (
                <div 
                  key={friend.id}
                  onClick={() => {
                    if (friend.status === 'pending') {
                      alert('ဒိုင်ဘက်မှ လက်ခံသည်အထိ စောင့်ဆိုင်းပေးပါ။');
                      return;
                    }
                    setSelectedDealer(friend);
                    localStorage.setItem(`last_dealer_id_${user?.id}`, friend.id);
                    window.dispatchEvent(new Event('dealerChanged'));
                    setMessages([{
                      id: 'init',
                      sender: 'dealer',
                      text: `မင်္ဂလာပါ! ${friend.name} မှ ကြိုဆိုပါတယ်။ ထိုးမည့်ဂဏန်းများကို ပို့ပေးပါ။`,
                      timestamp: Date.now(),
                    }]);
                  }}
                  className={`bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition cursor-pointer group ${friend.status === 'pending' ? 'opacity-70' : ''}`}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                      friend.status === 'pending' ? 'bg-gray-100 text-gray-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    }`}>
                      {friend.id.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white">{friend.name}</h3>
                      <div className="flex items-center space-x-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{friend.id.substring(0, 12)}...</p>
                        {friend.status === 'pending' && (
                          <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-[10px] rounded-full font-bold">Pending</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => handleRemoveFriend(friend.id, e)}
                    className="p-2 text-gray-400 hover:text-red-500 transition"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Friend Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-3xl shadow-2xl p-6 border border-gray-100 dark:border-gray-700">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Friend အပ်မည်</h2>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-4">
                <button 
                  onClick={() => setShowScanner(true)}
                  className="w-full py-4 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl flex flex-col items-center justify-center space-y-2 border-2 border-dashed border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition"
                >
                  <Camera size={32} />
                  <span className="font-bold">QR Code ဖြင့် အပ်မည်</span>
                </button>
                
                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
                  <span className="flex-shrink mx-4 text-gray-400 text-xs uppercase font-bold">သို့မဟုတ်</span>
                  <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">ဒိုင် ID ဖြင့် အပ်မည်</label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={inputDealerId}
                      onChange={(e) => setInputDealerId(e.target.value)}
                      placeholder="ID ကို ရိုက်ထည့်ပါ"
                      className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white transition text-sm"
                    />
                    <button 
                      onClick={() => handleAddFriend(inputDealerId)}
                      className="px-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Friend Confirmation Modal */}
        {friendToDelete && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 w-full max-w-xs rounded-3xl shadow-2xl p-6 border border-gray-100 dark:border-gray-700 text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">ဒိုင်ကို ဖျက်မည်</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">ဤဒိုင်ကို Friend စာရင်းမှ ဖျက်လိုပါသလား?</p>
              <div className="flex space-x-3">
                <button 
                  onClick={() => setFriendToDelete(null)}
                  className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold transition"
                >
                  မဖျက်ပါ
                </button>
                <button 
                  onClick={confirmRemoveFriend}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold transition shadow-lg shadow-red-500/20"
                >
                  ဖျက်မည်
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 p-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center space-x-3">
          <button onClick={() => setSelectedDealer(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500">
            <ChevronLeft size={24} />
          </button>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
              {selectedDealer.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="font-bold text-gray-900 dark:text-white text-sm">{selectedDealer.name}</h2>
              <p className="text-[10px] text-green-500 flex items-center">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1 animate-pulse"></span>
                Online
              </p>
            </div>
          </div>
        </div>
        <button 
          onClick={(e) => handleRemoveFriend(selectedDealer.id, e)}
          className="p-2 text-gray-400 hover:text-red-500 transition"
        >
          <Trash2 size={20} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {selectedDealer?.status === 'blocked' ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mb-4">
              <XCircle size={32} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Block ခံထားရပါသည်</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">ဤဒိုင်မှ သင့်ကို Block ထားသည့်အတွက် စာပို့၍ မရနိုင်ပါ။</p>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} group/msg`}>
                <div className={`relative max-w-[85%] rounded-2xl p-3 shadow-sm ${
                  msg.sender === 'user' 
                    ? 'bg-blue-600 text-white rounded-tr-none' 
                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-100 dark:border-gray-700 rounded-tl-none'
                }`}>
                  {msg.sender === 'user' && msg.id !== 'init' && !msg.isDeleted && (
                    <button 
                      onClick={() => handleDeleteMessage(msg)}
                      className="absolute -left-10 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-red-500 transition-colors bg-white dark:bg-gray-800 rounded-full shadow-sm border border-gray-100 dark:border-gray-700"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                  <p className={`text-sm whitespace-pre-wrap ${msg.isDeleted ? 'italic opacity-70' : ''}`}>{msg.text}</p>
                  
                  {msg.details && (
                    <div className="mt-3 space-y-2 border-t border-gray-100 dark:border-gray-700 pt-2">
                      {msg.details.map((detail, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs bg-gray-50 dark:bg-gray-900/50 p-2 rounded-lg">
                          <span className="font-mono font-bold text-gray-700 dark:text-gray-300">{detail.number} = {detail.amount}</span>
                          {detail.accepted ? (
                            <span className="flex items-center text-green-600 dark:text-green-400 font-medium">
                              <CheckCircle2 size={14} className="mr-1" /> လက်ခံသည်
                            </span>
                          ) : (
                            <span className="flex items-center text-red-600 dark:text-red-400 font-medium">
                              <XCircle size={14} className="mr-1" /> လက်မခံပါ
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                    <div className="flex items-center justify-end space-x-1 mt-1">
                      <p className={`text-[10px] ${msg.sender === 'user' ? 'text-blue-100' : 'text-gray-400'}`}>
                        {new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' })}
                      </p>
                      {msg.sender === 'user' && (
                        <span className="text-blue-100">
                          {msg.status === 'accepted' ? <CheckCircle2 size={10} /> : 
                           msg.status === 'rejected' ? <XCircle size={10} /> : 
                           <span className="text-[10px] bg-white/20 px-1 rounded-full">{msg.status === 'pending' ? 'စောင့်ဆိုင်းဆဲ' : msg.status}</span>}
                        </span>
                      )}
                    </div>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 rounded-tl-none">
                  <div className="flex space-x-1">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Delete Message Confirmation Modal */}
      {messageToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 w-full max-w-xs rounded-3xl shadow-2xl p-6 border border-gray-100 dark:border-gray-700 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={32} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">စာကို ဖျက်မည်</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">ဤစာကို ဖျက်လိုပါသလား?</p>
            <div className="flex space-x-3">
              <button 
                onClick={() => setMessageToDelete(null)}
                className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold transition"
              >
                မဖျက်ပါ
              </button>
              <button 
                onClick={confirmDeleteMessage}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold transition shadow-lg shadow-red-500/20"
              >
                ဖျက်မည်
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Input Form */}
      {selectedDealer?.status !== 'blocked' && (
        <form onSubmit={handleSendMessage} className="bg-white dark:bg-gray-800 p-4 border-t border-gray-100 dark:border-gray-700 flex items-center space-x-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="စာရိုက်ပါ..."
            className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-full focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white transition text-sm"
          />
          <button 
            type="submit"
            className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition shadow-lg shadow-blue-500/20"
          >
            <Send size={18} />
          </button>
        </form>
      )}
    </div>
  );
};

export default DealerChat;
