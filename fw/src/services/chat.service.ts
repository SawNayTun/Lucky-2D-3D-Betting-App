import { Injectable, signal, effect } from '@angular/core';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getDatabase, ref, push, onValue, Database, off, serverTimestamp, set, get, remove, update } from 'firebase/database';

export interface ChatMessage {
  id?: string;
  text?: string; // Content payload (text or base64 image)
  imageUrl?: string; // For backward compatibility or distinct field
  type?: 'text' | 'image';
  senderId: string;
  timestamp: number;
}

export interface ChatContact {
  userId: string;
  name: string;
  lastMessage?: string;
  lastTimestamp?: number;
  chatId: string;
}

export interface FriendRequest {
  id?: string;
  senderId: string;
  senderName: string;
  timestamp: any;
  type?: string;
  status?: string;
  phone?: string;
  amount?: number;
  screenshotUrl?: string;
  paymentMethod?: string;
  accountName?: string;
  accountNumber?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private app: FirebaseApp | undefined;
  private db: Database | undefined;
  
  // Signals
  contacts = signal<ChatContact[]>([]);
  incomingRequests = signal<FriendRequest[]>([]); 
  activeMessages = signal<ChatMessage[]>([]);
  isConnected = signal(false);

  constructor() {
    this.initFirebase();
  }

  private initFirebase() {
    const firebaseConfig = {
      apiKey: "AIzaSyAas8VrbH-tb6FWQRa4JrqEJEZcsOKcwEo",
      authDomain: "d-management-6bd74.firebaseapp.com",
      databaseURL: "https://d-management-6bd74-default-rtdb.asia-southeast1.firebasedatabase.app",
      projectId: "d-management-6bd74",
      storageBucket: "d-management-6bd74.firebasestorage.app",
      messagingSenderId: "881446635711",
      appId: "1:881446635711:web:cf755a10a36adfbd339e0a",
      measurementId: "G-GVF6DEGVJX"
    };

    try {
      this.app = initializeApp(firebaseConfig);
      this.db = getDatabase(this.app, firebaseConfig.databaseURL);
      
      // Monitor connection status properly
      const connectedRef = ref(this.db, '.info/connected');
      onValue(connectedRef, (snap) => {
        this.isConnected.set(!!snap.val());
      });

    } catch (error) {
      console.error('Firebase Init Error:', error);
      this.isConnected.set(false);
    }
  }

  // --- 1. Listeners ---

  private contactsListener: any = null;
  private requestsListener: any = null;

  listenToUserData(myUserId: string) {
    if (!this.db || !myUserId) return;

    const contactsPath = `users/${myUserId}/contacts`;
    const requestsPath = `requests/${myUserId}`;

    // Clean up existing listeners
    off(ref(this.db, contactsPath));
    off(ref(this.db, requestsPath));

    // Listen to Contacts
    onValue(ref(this.db, contactsPath), (snapshot) => {
      const data = snapshot.val();
      console.log('Contacts updated from Firebase:', data);
      if (data) {
        const list: ChatContact[] = Object.values(data);
        list.sort((a, b) => (b.lastTimestamp || 0) - (a.lastTimestamp || 0));
        this.contacts.set(list);
      } else {
        this.contacts.set([]);
      }
    });

    // Listen to Incoming Requests
    onValue(ref(this.db, requestsPath), (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list: FriendRequest[] = Object.values(data);
        list.sort((a, b) => b.timestamp - a.timestamp);
        this.incomingRequests.set(list);
      } else {
        this.incomingRequests.set([]);
      }
    });
  }

  // --- 2. Friend Request Logic ---

  async sendFriendRequest(playerId: string, playerName: string, dealerIdInput: string) {
    let dealerId = dealerIdInput.trim();
    
    // Extract UUID from Name-UUID format if present (Matching Dealer App logic)
    if (dealerId.includes('-')) {
      const parts = dealerId.split('-');
      if (parts.length >= 5) {
        const possibleUuid = parts.slice(-5).join('-');
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(possibleUuid)) {
          dealerId = possibleUuid;
        } else {
          dealerId = parts[parts.length - 1];
        }
      } else {
        dealerId = parts[parts.length - 1];
      }
    }

    console.log(`Sending Friend Request: Path=requests/${dealerId}, Sender=${playerName} (${playerId})`);
    
    if (!this.db) {
        console.error('Database not initialized');
        return false;
    }
    
    if (!playerId || !dealerId) {
        console.error('Missing playerId or dealerId');
        return false;
    }

    if (playerId === dealerId) {
        console.error('Cannot add yourself');
        return false;
    }

    try {
      // Unique ID တစ်ခုဖန်တီးရန် push ကိုအသုံးပြုပါ
      const newRequestRef = push(ref(this.db, `requests/${dealerId}`));
      const uniqueReqId = newRequestRef.key;

      const payload = {
        id: uniqueReqId,
        senderId: playerId,
        senderName: playerName,
        username: playerName, // Added for compatibility with Dealer App
        type: 'friend',
        status: 'pending',
        timestamp: serverTimestamp()
      };

      console.log('Writing payload to Firebase:', payload);
      await set(newRequestRef, payload);

      console.log('Friend request sent successfully!');
      return true;
    } catch (error) {
      console.error('Error sending friend request:', error);
      return false;
    }
  }

  async sendDepositRequest(playerId: string, playerName: string, dealerIdInput: string, amount: number, screenshotUrl: string) {
    let dealerId = dealerIdInput.trim();
    if (dealerId.includes('-')) {
        const parts = dealerId.split('-');
        dealerId = parts[parts.length - 1];
        if (dealerId.length < 30 && parts.length >= 5) dealerId = parts.slice(-5).join('-');
    }

    if (!this.db) return false;
    
    try {
      const newRequestRef = push(ref(this.db, `requests/${dealerId}`));
      const uniqueReqId = newRequestRef.key;

      await set(newRequestRef, {
        id: uniqueReqId,
        senderId: playerId,
        senderName: playerName,
        username: playerName,
        amount: amount,
        screenshotUrl: screenshotUrl, // ငွေလွှဲပြေစာ ပုံလင့်ခ်
        type: 'deposit',
        status: 'pending',
        timestamp: serverTimestamp()
      });

      console.log('Deposit request sent successfully!');
      return true;
    } catch (error) {
      console.error('Error sending deposit request:', error);
      return false;
    }
  }

  async sendWithdrawRequest(
    playerId: string, 
    playerName: string, 
    dealerIdInput: string, 
    amount: number,
    paymentMethod: string, // KPay, WavePay, etc.
    accountName: string,
    accountNumber: string
  ) {
    let dealerId = dealerIdInput.trim();
    if (dealerId.includes('-')) {
        const parts = dealerId.split('-');
        dealerId = parts[parts.length - 1];
        if (dealerId.length < 30 && parts.length >= 5) dealerId = parts.slice(-5).join('-');
    }

    if (!this.db) return false;
    
    try {
      const newRequestRef = push(ref(this.db, `requests/${dealerId}`));
      const uniqueReqId = newRequestRef.key;

      await set(newRequestRef, {
        id: uniqueReqId,
        senderId: playerId,
        senderName: playerName,
        username: playerName,
        amount: amount,
        paymentMethod: paymentMethod,
        accountName: accountName,
        accountNumber: accountNumber,
        type: 'withdraw',
        status: 'pending',
        timestamp: serverTimestamp()
      });

      console.log('Withdraw request sent successfully!');
      return true;
    } catch (error) {
      console.error('Error sending withdraw request:', error);
      return false;
    }
  }

  async acceptFriendRequest(myId: string, myName: string, request: FriendRequest) {
    if (!this.db) return;

    const otherId = request.senderId;
    const otherName = request.senderName;
    const chatId = [myId, otherId].sort().join('_'); // Consistent Chat ID

    const updates: any = {};

    // 1. Add to My Contacts
    updates[`users/${myId}/contacts/${otherId}`] = {
      userId: otherId,
      name: otherName,
      chatId: chatId,
      lastTimestamp: Date.now()
    };

    // 2. Add to Other's Contacts
    updates[`users/${otherId}/contacts/${myId}`] = {
      userId: myId,
      name: myName,
      chatId: chatId,
      lastTimestamp: Date.now()
    };

    // 3. Initialize customer record for balance tracking
    updates[`dealer_customers/${myId}/${otherId}`] = {
      id: otherId,
      name: otherName,
      balance: 0,
      isBanned: false,
      joinedAt: serverTimestamp()
    };

    // 4. Delete the Request (using the push ID)
    updates[`requests/${myId}/${request.id}`] = null;

    // Perform atomic update
    await update(ref(this.db), updates);
  }

  async rejectFriendRequest(myId: string, requestId: string) {
    if (!this.db) return;
    await remove(ref(this.db, `requests/${myId}/${requestId}`));
  }

  // --- 3. Deposit & Withdrawal Logic ---

  async acceptDeposit(myId: string, req: FriendRequest) {
    if (!this.db || !req.amount) return;

    const customerRef = ref(this.db, `dealer_customers/${myId}/${req.senderId}/balance`);
    onValue(customerRef, async (snapshot) => {
      const currentBalance = snapshot.val() || 0;
      const newBalance = currentBalance + Number(req.amount);
      
      const updates: any = {};
      updates[`dealer_customers/${myId}/${req.senderId}/balance`] = newBalance;
      updates[`requests/${myId}/${req.id}`] = null;
      
      // Update transaction status for player app sync
      updates[`transaction_updates/${req.senderId}/${req.id}`] = {
        status: 'approved',
        type: 'deposit',
        amount: req.amount,
        timestamp: serverTimestamp()
      };
      
      await update(ref(this.db!), updates);
    }, { onlyOnce: true });
  }

  async acceptWithdraw(myId: string, req: FriendRequest) {
    if (!this.db || !req.amount) return;

    const customerRef = ref(this.db, `dealer_customers/${myId}/${req.senderId}/balance`);
    onValue(customerRef, async (snapshot) => {
      const currentBalance = snapshot.val() || 0;
      const amount = Number(req.amount);
      
      if (currentBalance < amount) {
        alert('လက်ကျန်ငွေ မလုံလောက်ပါ။');
        return;
      }
      
      const newBalance = currentBalance - amount;
      
      const updates: any = {};
      updates[`dealer_customers/${myId}/${req.senderId}/balance`] = newBalance;
      updates[`requests/${myId}/${req.id}`] = null;
      
      // Update transaction status for player app sync
      updates[`transaction_updates/${req.senderId}/${req.id}`] = {
        status: 'approved',
        type: 'withdraw',
        amount: req.amount,
        timestamp: serverTimestamp()
      };
      
      await update(ref(this.db!), updates);
    }, { onlyOnce: true });
  }

  async rejectRequest(myId: string, req: FriendRequest) {
    if (!this.db) return;
    
    const updates: any = {};
    updates[`requests/${myId}/${req.id}`] = null;
    
    // If it's a deposit or withdraw, mark as rejected for player app sync
    if (req.type === 'deposit' || req.type === 'withdraw') {
      updates[`transaction_updates/${req.senderId}/${req.id}`] = {
        status: 'rejected',
        type: req.type,
        amount: req.amount,
        timestamp: serverTimestamp()
      };
    }
    
    await update(ref(this.db), updates);
  }

  async removeContact(myId: string, otherId: string) {
    if (!this.db) return;
    
    console.log(`Removing contact: ${myId} -> ${otherId}`);

    // 1. Remove from local side
    try {
      const myContactRef = ref(this.db, `users/${myId}/contacts/${otherId}`);
      await remove(myContactRef);
      console.log('Removed from local contacts');
    } catch (error) {
      console.error('Failed to remove local contact:', error);
      throw error;
    }
    
    // 2. Remove from other side
    try {
      const otherContactRef = ref(this.db, `users/${otherId}/contacts/${myId}`);
      await remove(otherContactRef);
      console.log('Removed from remote contacts');
    } catch (e) {
      console.warn('Could not remove remote contact (ignored):', e);
    }
  }

  // --- 3. Messaging ---

  listenToMessages(chatId: string) {
    if (!this.db || !chatId) return;
    this.activeMessages.set([]); 

    const messagesRef = ref(this.db, `messages/${chatId}`);
    
    onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const msgList: ChatMessage[] = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        })).sort((a, b) => a.timestamp - b.timestamp);
        this.activeMessages.set(msgList);
      } else {
        this.activeMessages.set([]);
      }
    });
  }

  stopListeningMessages(chatId: string) {
    if (!this.db || !chatId) return;
    off(ref(this.db, `messages/${chatId}`));
  }

  async sendMessage(chatId: string, content: string, senderId: string, myId: string, otherId: string, type: 'text' | 'image' = 'text') {
    if (!this.db) return;
    
    const messageData: any = {
      senderId,
      timestamp: serverTimestamp(),
      type
    };

    if (type === 'image') {
      messageData.imageUrl = content;
      messageData.text = 'Sent an image'; // Fallback text for notifications
    } else {
      messageData.text = content;
    }

    // 1. Push Message
    await push(ref(this.db, `messages/${chatId}`), messageData);

    // 2. Update Last Message for both users
    const db = this.db;
    const lastMsgPreview = type === 'image' ? 'Sent an image' : content;

    const updates: any = {};
    updates[`users/${myId}/contacts/${otherId}/lastMessage`] = lastMsgPreview;
    updates[`users/${myId}/contacts/${otherId}/lastTimestamp`] = serverTimestamp();
    updates[`users/${otherId}/contacts/${myId}/lastMessage`] = lastMsgPreview;
    updates[`users/${otherId}/contacts/${myId}/lastTimestamp`] = serverTimestamp();
    
    await update(ref(db), updates);
  }

  async deleteMessage(chatId: string, messageId: string) {
    if (!this.db || !chatId || !messageId) return;
    await remove(ref(this.db, `messages/${chatId}/${messageId}`));
  }

  // --- 4. Calling Signaling ---

  async sendCallSignal(targetId: string, callerId: string, callerName: string, type: 'audio' | 'video') {
    if (!this.db) return;
    const callRef = ref(this.db, `calls/${targetId}/${callerId}`);
    await set(callRef, {
      callerId,
      callerName,
      type,
      status: 'ringing',
      timestamp: serverTimestamp()
    });
  }

  async updateCallStatus(targetId: string, callerId: string, status: 'accepted' | 'rejected' | 'ended') {
    if (!this.db) return;
    const callRef = ref(this.db, `calls/${targetId}/${callerId}`);
    if (status === 'ended' || status === 'rejected') {
      await remove(callRef);
    } else {
      await update(callRef, { status });
    }
  }

  async sendWebRTCSignal(targetId: string, callerId: string, type: 'offer' | 'answer' | 'candidate', data: any) {
    if (!this.db) return;
    // Path is always calls/targetId/callerId
    // If I am caller, targetId is the other person.
    // If I am callee, targetId is ME, callerId is the other person.
    // WAIT: The path must be consistent.
    // The call is established at `calls/{calleeId}/{callerId}`.
    
    // So we need to know who is the original "callee" (target) and "caller".
    // I will pass the path components explicitly.
    const callPath = `calls/${targetId}/${callerId}`;
    
    if (type === 'candidate') {
        await push(ref(this.db, `${callPath}/candidates`), data);
    } else {
        await update(ref(this.db, callPath), { [type]: data });
    }
  }

  listenToCalls(myId: string, callback: (call: any) => void) {
    if (!this.db || !myId) return;
    const callsRef = ref(this.db, `calls/${myId}`);
    onValue(callsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Get the most recent call
        const calls = Object.values(data);
        if (calls.length > 0) {
          callback(calls[0]);
        }
      } else {
        callback(null);
      }
    });
  }

  listenToCallSignal(targetId: string, callerId: string, callback: (data: any) => void) {
      if (!this.db) return;
      const callRef = ref(this.db, `calls/${targetId}/${callerId}`);
      onValue(callRef, (snapshot) => {
          callback(snapshot.val());
      });
  }
}