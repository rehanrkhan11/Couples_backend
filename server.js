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

// Socket.io for real-time whisper messaging
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

// ─── Middleware ───────────────────────────────────────────────
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
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
// Connected users: { userId: socketId }
const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  // User registers with their userId so we can route messages
  socket.on('register', (userId) => {
    onlineUsers.set(userId, socket.id);
    console.log(`User ${userId} registered with socket ${socket.id}`);
  });

  // Send a whisper to a specific partner
  socket.on('sendWhisper', ({ toUserId, message }) => {
    const partnerSocketId = onlineUsers.get(toUserId);
    if (partnerSocketId) {
      io.to(partnerSocketId).emit('newWhisper', message);
    }
  });

  socket.on('disconnect', () => {
    // Clean up the disconnected user
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
// TODO (YOU): Make sure your MONGODB_URI is set in .env
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
