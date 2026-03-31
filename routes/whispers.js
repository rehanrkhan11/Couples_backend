import express from 'express';
import { protect } from '../middleware/auth.js';
import Whisper from '../models/Whisper.js';
import User from '../models/User.js';

const router = express.Router();

const requireCouple = (req, res, next) => {
  if (!req.user.coupleId)
    return res.status(403).json({ message: 'You must be paired to send whispers' });
  next();
};

// ─── GET /api/whispers ───────────────────────────────────────
// Fetch last 50 whispers for the couple
router.get('/', protect, requireCouple, async (req, res) => {
  try {
    const whispers = await Whisper.find({ coupleId: req.user.coupleId })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('from', 'name avatar')
      .populate('to', 'name avatar');

    res.json(whispers.reverse()); // return oldest-first for chat display
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── POST /api/whispers ──────────────────────────────────────
// Body: { text }
// Saves to DB and emits via Socket.io to the partner
router.post('/', protect, requireCouple, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: 'text is required' });

    // Find the partner (the other member of the couple)
    const me = await User.findById(req.user.id).populate('coupleId');
    const partnerId = me.coupleId.members.find((m) => m.toString() !== req.user.id);

    const whisper = await Whisper.create({
      coupleId: req.user.coupleId,
      from: req.user.id,
      to: partnerId,
      text: text.trim(),
    });

    await whisper.populate('from', 'name avatar');
    await whisper.populate('to', 'name avatar');

    // Emit real-time event to partner via Socket.io
    // req.io is attached in server.js
    req.io.emit(`sendWhisper`, { toUserId: partnerId.toString(), message: whisper });

    res.status(201).json(whisper);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── PATCH /api/whispers/read ────────────────────────────────
// Mark all unread whispers sent TO the current user as read
router.patch('/read', protect, requireCouple, async (req, res) => {
  try {
    await Whisper.updateMany(
      { coupleId: req.user.coupleId, to: req.user.id, read: false },
      { read: true }
    );
    res.json({ message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
