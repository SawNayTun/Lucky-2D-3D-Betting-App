import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import db from './db.js';
import { database } from './src/lib/firebase.js';
import { ref, push, set, onValue } from 'firebase/database';

// Extend Express Request interface
interface AuthenticatedRequest extends Request {
  user?: any;
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-prod';
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR);
}

// Sync Firebase Balance to SQLite
const usersRef = ref(database, 'users');
onValue(usersRef, (snapshot) => {
  const users = snapshot.val();
  if (users) {
    console.log('Syncing balances from Firebase...');
    const updateStmt = db.prepare('UPDATE users SET balance = ? WHERE id = ?');
    const transaction = db.transaction((usersData) => {
      Object.keys(usersData).forEach((userId) => {
        const balance = usersData[userId].balance;
        if (balance !== undefined) {
          // Ensure userId is treated correctly (SQLite id is integer)
          const numericId = parseInt(userId, 10);
          if (!isNaN(numericId)) {
            updateStmt.run(balance, numericId);
            
            // Sync to dealer_customers for all accepted friends
            const friends = usersData[userId].friends;
            if (friends) {
              Object.keys(friends).forEach(dealerId => {
                if (friends[dealerId].status === 'accepted') {
                  const dealerCustomerBalanceRef = ref(database, `dealer_customers/${dealerId}/${userId}/balance`);
                  set(dealerCustomerBalanceRef, balance).catch(console.error);
                }
              });
            }
          }
        }
      });
    });
    try {
      transaction(users);
      console.log('Balance sync completed successfully.');
    } catch (err) {
      console.error('Failed to sync balance from Firebase:', err);
    }
  }
});

// Sync Dealer Customers Balance to SQLite and Users
const dealerCustomersRef = ref(database, 'dealer_customers');
onValue(dealerCustomersRef, (snapshot) => {
  const dealers = snapshot.val();
  if (dealers) {
    console.log('Syncing balances from dealer_customers...');
    const updateStmt = db.prepare('UPDATE users SET balance = ? WHERE id = ?');
    const selectStmt = db.prepare('SELECT balance FROM users WHERE id = ?');
    const transaction = db.transaction((dealersData) => {
      Object.keys(dealersData).forEach((dealerId) => {
        const customers = dealersData[dealerId];
        Object.keys(customers).forEach((playerId) => {
          const balance = customers[playerId].balance;
          if (balance !== undefined) {
            const numericId = parseInt(playerId, 10);
            if (!isNaN(numericId)) {
              const userRecord: any = selectStmt.get(numericId);
              if (userRecord && userRecord.balance !== balance) {
                updateStmt.run(balance, numericId);
                // Also update users node in Firebase to keep it in sync
                const userBalanceRef = ref(database, `users/${playerId}/balance`);
                set(userBalanceRef, balance).catch(console.error);
              }
            }
          }
        });
      });
    });
    try {
      transaction(dealers);
      console.log('Dealer customers balance sync completed successfully.');
    } catch (err) {
      console.error('Failed to sync balance from dealer_customers:', err);
    }
  }
});

// Sync Market Status from Firebase
const marketStatusRef = ref(database, 'settings/marketStatus');
onValue(marketStatusRef, (snapshot) => {
  const status = snapshot.val();
  if (status) {
    const stmt = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('market_status', ?)");
    try {
      stmt.run(status);
      console.log(`Market status updated to: ${status}`);
    } catch (err) {
      console.error('Failed to sync market status from Firebase:', err);
    }
  }
});

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.set('trust proxy', true); // Trust proxy headers for correct protocol/host

  app.use(cors()); // Allow all origins with *

  app.use(express.json());
  app.use(cookieParser());
  app.use('/uploads', express.static(UPLOAD_DIR));

  // --- Auth Middleware ---
  const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const bearerToken = authHeader && authHeader.split(' ')[1];
    const token = bearerToken || req.cookies.token;

    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  };

  // --- API Routes ---

  // Register
  app.post('/api/auth/register', async (req: Request, res: Response) => {
    const { phone, username, password, device_id, install_time } = req.body;
    console.log('Register attempt:', { phone, username });
    if (!phone || !password) return res.status(400).json({ error: 'Phone and password required' });

    try {
      // Check if username exists
      if (username) {
        const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
        if (existingUser) {
          return res.status(400).json({ error: 'Username already taken' });
        }
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const stmt = db.prepare('INSERT INTO users (phone, username, password, device_id, install_time) VALUES (?, ?, ?, ?, ?)');
      const info = stmt.run(phone, username || phone, hashedPassword, device_id || null, install_time || null);
      
      const token = jwt.sign({ id: info.lastInsertRowid, phone }, JWT_SECRET);
      res.cookie('token', token, { httpOnly: true, sameSite: 'none', secure: true });
      res.json({ token, id: info.lastInsertRowid, phone, username: username || phone, balance: 0 });
    } catch (err: any) {
      console.error('Registration error:', err);
      if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return res.status(400).json({ error: 'Phone number already registered' });
      }
      res.status(500).json({ error: 'Internal server error: ' + err.message });
    }
  });

  // Login
  app.post('/api/auth/login', async (req: Request, res: Response) => {
    const { phone, password, device_id, install_time } = req.body;
    console.log('Login attempt:', { phone });
    
    if (!phone) {
      return res.status(400).json({ error: 'Phone number required' });
    }

    let user: any = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);

    if (!user) {
      console.log('User not found, auto-registering for prototype:', phone);
      const hashedPassword = await bcrypt.hash(password, 10);
      const stmt = db.prepare('INSERT INTO users (phone, username, password, device_id, install_time) VALUES (?, ?, ?, ?, ?)');
      const info = stmt.run(phone, phone, hashedPassword, device_id || null, install_time || null);
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
    } else {
      if (!(await bcrypt.compare(password, user.password))) {
        console.log('Invalid password for:', phone);
        return res.status(401).json({ error: 'Invalid credentials' });
      }
    }

    // Update device info on login if provided
    if (device_id || install_time) {
      const updateStmt = db.prepare('UPDATE users SET device_id = COALESCE(?, device_id), install_time = COALESCE(?, install_time) WHERE id = ?');
      updateStmt.run(device_id || null, install_time || null, user.id);
    }

    const token = jwt.sign({ id: user.id, phone: user.phone }, JWT_SECRET);
    res.cookie('token', token, { httpOnly: true, sameSite: 'none', secure: true });
    res.json({ token, id: user.id, phone: user.phone, username: user.username, balance: user.balance });
  });

  // Logout
  app.post('/api/auth/logout', (req: Request, res: Response) => {
    res.clearCookie('token');
    res.json({ success: true });
  });

  // Get Current User
  app.get('/api/auth/me', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    const user = db.prepare('SELECT id, phone, username, balance FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.sendStatus(404);
    res.json(user);
  });

  // Update User Profile
  app.put('/api/auth/profile', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    const { username } = req.body;
    if (!username || username.trim() === '') {
      return res.status(400).json({ error: 'Username is required' });
    }

    try {
      const updateStmt = db.prepare('UPDATE users SET username = ? WHERE id = ?');
      updateStmt.run(username.trim(), req.user.id);
      
      const user = db.prepare('SELECT id, phone, username, balance FROM users WHERE id = ?').get(req.user.id);
      res.json(user);
    } catch (err: any) {
      console.error('Profile update error:', err);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  });

  // Get System Status
  app.get('/api/status', (req: Request, res: Response) => {
    const status: any = db.prepare("SELECT value FROM settings WHERE key = 'market_status'").get();
    res.json({ status: status ? status.value : 'closed' });
  });

  // Place Bet (Supports Bulk)
  app.post('/api/bets', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const { bets, dealerId } = req.body; // Expecting array of { number, amount } and dealerId
    
    if (!bets || !Array.isArray(bets) || bets.length === 0) {
      return res.status(400).json({ error: 'No bets provided' });
    }

    const user: any = db.prepare('SELECT username, phone, balance FROM users WHERE id = ?').get(req.user.id);
    
    // Check market status
    const status: any = db.prepare("SELECT value FROM settings WHERE key = 'market_status'").get();
    if (status?.value !== 'open') {
      return res.status(400).json({ error: 'Market is closed' });
    }

    const totalAmount = bets.reduce((sum, b) => sum + Number(b.amount), 0);

    if (user.balance < totalAmount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    const betStmt = db.prepare('INSERT INTO bets (user_id, number, amount) VALUES (?, ?, ?)');
    const updateBalanceStmt = db.prepare('UPDATE users SET balance = balance - ? WHERE id = ?');

    const transaction = db.transaction(() => {
      const betIds = bets.map(b => {
        const info = betStmt.run(req.user.id, b.number, b.amount);
        return info.lastInsertRowid;
      });
      updateBalanceStmt.run(totalAmount, req.user.id);
      return betIds;
    });

    try {
      const betIds = transaction();
      const newBalance: any = db.prepare('SELECT balance FROM users WHERE id = ?').get(req.user.id);
      
      // 1. Update Firebase Balance immediately
      const userBalanceRef = ref(database, `users/${req.user.id}/balance`);
      await set(userBalanceRef, newBalance.balance);

      // Also update dealer_customers balance if dealerId is provided
      if (dealerId) {
        const dealerCustomerBalanceRef = ref(database, `dealer_customers/${dealerId}/${req.user.id}/balance`);
        await set(dealerCustomerBalanceRef, newBalance.balance);
      }
      
      // 2. Generate Formatted Report
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-GB');
      const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      
      let reportText = `--- ${user?.username || user?.phone} ---\n`;
      reportText += `နေ့စွဲ - ${dateStr} (${timeStr})\n`;
      reportText += `--------------------\n`;
      
      bets.forEach((b, index) => {
        reportText += `${b.number} = ${b.amount}\n`;
        if ((index + 1) % 10 === 0 && index !== bets.length - 1) {
          reportText += `--------------------\n`;
        }
      });
      
      reportText += `--------------------\n`;
      reportText += `စုစုပေါင်း: (${bets.length}) ကွက် - ${totalAmount} ကျပ်`;

      // 3. Push Report to Firebase for Dealer Software
      const reportsRef = ref(database, 'reports');
      const newReportRef = push(reportsRef);
      
      const reportData = {
        userId: req.user.id,
        user_id: req.user.id,
        dealerId: dealerId || null,
        dealer_id: dealerId || null,
        username: user?.username || 'Unknown',
        phone: user?.phone || 'Unknown',
        reportText,
        report_text: reportText,
        totalAmount,
        total_amount: totalAmount,
        betCount: bets.length,
        bet_count: bets.length,
        createdAt: Date.now(),
        created_at: Date.now(),
        status: 'pending'
      };

      await set(newReportRef, reportData);
      
      // Also push to a dealer-specific reports node for easier filtering by dealer software
      if (dealerId) {
        const dealerReportsRef = ref(database, `dealer_reports/${dealerId}/${newReportRef.key}`);
        await set(dealerReportsRef, reportData);
      }

      // 4. Push to Chat if dealerId is provided
      if (dealerId) {
        const chatRef = ref(database, `chats/${dealerId}/${req.user.id}/messages`);
        const newMessageRef = push(chatRef);
        await set(newMessageRef, {
          sender: 'user',
          text: reportText,
          timestamp: Date.now(),
          status: 'pending',
          isBet: true,
          reportKey: newReportRef.key,
          totalAmount,
          total_amount: totalAmount
        });
      }

      // 5. Push individual bets
      const firebaseBetsRef = ref(database, 'bets');
      for (let i = 0; i < bets.length; i++) {
        const b = bets[i];
        const newBetRef = push(firebaseBetsRef);
        await set(newBetRef, {
          id: betIds[i],
          userId: req.user.id,
          user_id: req.user.id,
          dealerId: dealerId || null,
          dealer_id: dealerId || null,
          username: user?.username || 'Unknown',
          number: b.number,
          amount: Number(b.amount),
          status: 'pending',
          createdAt: Date.now(),
          created_at: Date.now()
        });
      }

      res.json({ success: true, newBalance: newBalance.balance });
    } catch (err) {
      console.error('Bet error:', err);
      res.status(500).json({ error: 'Bet failed' });
    }
  });

  // Get Bet History
  app.get('/api/bets', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    const bets = db.prepare('SELECT * FROM bets WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
    res.json(bets);
  });

  // Delete Individual Bet
  app.delete('/api/bets/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    try {
      const stmt = db.prepare('DELETE FROM bets WHERE id = ? AND user_id = ?');
      const info = stmt.run(id, req.user.id);
      if (info.changes === 0) {
        return res.status(404).json({ error: 'Bet not found or unauthorized' });
      }

      // Also attempt to delete from Firebase bets node
      const firebaseBetsRef = ref(database, 'bets');
      onValue(firebaseBetsRef, async (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const keyToDelete = Object.keys(data).find(key => data[key].id === Number(id));
          if (keyToDelete) {
            const betData = data[keyToDelete];
            await set(ref(database, `bets/${keyToDelete}`), null);
            
            // If we can find a report that matches this user and time, we could try to delete it
            // but it's safer to let the user delete the report from the chat.
          }
        }
      }, { onlyOnce: true });

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete bet' });
    }
  });

  // Clear All Bet History
  app.delete('/api/bets', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    try {
      const stmt = db.prepare('DELETE FROM bets WHERE user_id = ?');
      stmt.run(req.user.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to clear history' });
    }
  });

  // Request Top-up/Withdraw
  app.post('/api/transactions', authenticateToken, upload.single('proof'), async (req: AuthenticatedRequest, res: Response) => {
    const { type, amount, method } = req.body;
    const proofImage = req.file ? `/uploads/${req.file.filename}` : null;

    if (!amount || !method) return res.status(400).json({ error: 'Missing fields' });

    try {
      const stmt = db.prepare('INSERT INTO transactions (user_id, type, amount, method, proof_image) VALUES (?, ?, ?, ?, ?)');
      const info = stmt.run(req.user.id, type, amount, method, proofImage);
      
      // Push to Firebase Realtime Database for Dealer Software
      const transactionRef = ref(database, 'transactions');
      const newTransactionRef = push(transactionRef);
      
      const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
      const fullImageUrl = proofImage ? `${baseUrl}${proofImage}` : null;
      
      // Get user details for Firebase
      const user: any = db.prepare('SELECT username, phone FROM users WHERE id = ?').get(req.user.id);

      await set(newTransactionRef, {
        userId: req.user.id,
        username: user?.username || 'Unknown',
        amount: Number(amount),
        proofImage: fullImageUrl,
        status: 'pending',
        timestamp: new Date().toISOString(),
        type: type
      });

      res.json({ success: true });
    } catch (err) {
      console.error('Transaction error:', err);
      res.status(500).json({ error: 'Transaction request failed' });
    }
  });

  // Get Transactions
  app.get('/api/transactions', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    const transactions = db.prepare('SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
    res.json(transactions);
  });


  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production (if built)
    app.use(express.static('dist'));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
