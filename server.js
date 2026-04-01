import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';

import authRoutes from './routes/auth.js';
import memoryRoutes from './routes/memories.js';
import whisperRoutes from './routes/whispers.js';
import soundtrackRoutes from './routes/soundtracks.js';
import dynamicRoutes from './routes/dynamics.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// ─── CORS origin checker ──────────────────────────────────────
const isAllowedOrigin = (origin) => {
  if (!origin) return true; // allow server-to-server / curl
  if (origin === process.env.CLIENT_URL) return true;
  if (origin.endsWith('.vercel.app')) return true;
  if (origin === 'http://localhost:5173') return true;
  return false;
};

// ─── Socket.io ───────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) callback(null, true);
      else callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// ─── Middleware ───────────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) callback(null, true);
    else callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json());

// Make io available in routes via req.io
app.use((req, _res, next) => {
  req.io = io;
  next();
});

// ─── Routes ──────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/memories', memoryRoutes);
app.use('/api/whispers', whisperRoutes);
app.use('/api/soundtracks', soundtrackRoutes);
app.use('/api/dynamics', dynamicRoutes);

// ─── Socket.io — Real-time Whisper Chat ──────────────────────
const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  socket.on('register', (userId) => {
    onlineUsers.set(userId, socket.id);
    console.log(`User ${userId} registered with socket ${socket.id}`);
  });

  socket.on('sendWhisper', ({ toUserId, message }) => {
    const partnerSocketId = onlineUsers.get(toUserId);
    if (partnerSocketId) {
      io.to(partnerSocketId).emit('newWhisper', message);
    }
  });

  socket.on('disconnect', () => {
    for (const [userId, sId] of onlineUsers.entries()) {
      if (sId === socket.id) {
        onlineUsers.delete(userId);
        break;
      }
    }
    console.log('Socket disconnected:', socket.id);
  });
});

// ─── MongoDB ─────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    const PORT = process.env.PORT || 5000;
    httpServer.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });
