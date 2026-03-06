import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
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
    const updateStmt = db.prepare('UPDATE users SET balance = ? WHERE id = ?');
    const transaction = db.transaction((usersData) => {
      Object.keys(usersData).forEach((userId) => {
        const balance = usersData[userId].balance;
        if (balance !== undefined) {
          updateStmt.run(balance, userId);
        }
      });
    });
    try {
      transaction(users);
    } catch (err) {
      console.error('Failed to sync balance from Firebase:', err);
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

  app.use(express.json());
  app.use(cookieParser());
  app.use('/uploads', express.static(UPLOAD_DIR));

  // --- Auth Middleware ---
  const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const token = req.cookies.token;
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
    const { phone, username, password } = req.body;
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
      const stmt = db.prepare('INSERT INTO users (phone, username, password) VALUES (?, ?, ?)');
      const info = stmt.run(phone, username || phone, hashedPassword);
      
      const token = jwt.sign({ id: info.lastInsertRowid, phone }, JWT_SECRET);
      res.cookie('token', token, { httpOnly: true, sameSite: 'none', secure: true });
      res.json({ id: info.lastInsertRowid, phone, username: username || phone, balance: 0 });
    } catch (err: any) {
      if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return res.status(400).json({ error: 'Phone number already registered' });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Login
  app.post('/api/auth/login', async (req: Request, res: Response) => {
    const { phone, password } = req.body;
    const user: any = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, phone: user.phone }, JWT_SECRET);
    res.cookie('token', token, { httpOnly: true, sameSite: 'none', secure: true });
    res.json({ id: user.id, phone: user.phone, username: user.username, balance: user.balance });
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

  // Get System Status
  app.get('/api/status', (req: Request, res: Response) => {
    const status: any = db.prepare("SELECT value FROM settings WHERE key = 'market_status'").get();
    res.json({ status: status ? status.value : 'closed' });
  });

  // Place Bet
  app.post('/api/bets', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    const { number, amount } = req.body;
    const user: any = db.prepare('SELECT balance FROM users WHERE id = ?').get(req.user.id);
    
    // Check market status
    const status: any = db.prepare("SELECT value FROM settings WHERE key = 'market_status'").get();
    if (status?.value !== 'open') {
      return res.status(400).json({ error: 'Market is closed' });
    }

    if (user.balance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    const betStmt = db.prepare('INSERT INTO bets (user_id, number, amount) VALUES (?, ?, ?)');
    const updateBalanceStmt = db.prepare('UPDATE users SET balance = balance - ? WHERE id = ?');

    const transaction = db.transaction(() => {
      betStmt.run(req.user.id, number, amount);
      updateBalanceStmt.run(amount, req.user.id);
    });

    try {
      transaction();
      const newBalance: any = db.prepare('SELECT balance FROM users WHERE id = ?').get(req.user.id);
      res.json({ success: true, newBalance: newBalance.balance });
    } catch (err) {
      res.status(500).json({ error: 'Bet failed' });
    }
  });

  // Get Bet History
  app.get('/api/bets', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    const bets = db.prepare('SELECT * FROM bets WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
    res.json(bets);
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
      
      const fullImageUrl = proofImage ? `${req.protocol}://${req.get('host')}${proofImage}` : null;
      
      // Get user details for Firebase
      const user: any = db.prepare('SELECT username, phone FROM users WHERE id = ?').get(req.user.id);

      await set(newTransactionRef, {
        id: info.lastInsertRowid,
        userId: req.user.id,
        username: user?.username || 'Unknown',
        phone: user?.phone || req.user.phone,
        type,
        amount: Number(amount),
        method,
        proofImage: fullImageUrl,
        status: 'pending',
        createdAt: Date.now()
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
