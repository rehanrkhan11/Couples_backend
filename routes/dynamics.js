import express from 'express';
import { protect } from '../middleware/auth.js';
import Dynamic from '../models/Dynamic.js';

const router = express.Router();

const requireCouple = (req, res, next) => {
  if (!req.user.coupleId)
    return res.status(403).json({ message: 'You must be paired to view dynamics' });
  next();
};

// Helper: get current ISO week label "YYYY-WNN"
const currentWeek = () => {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil(((now - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`;
};

// ─── GET /api/dynamics ───────────────────────────────────────
// Returns this week's entries for both members of the couple
router.get('/', protect, requireCouple, async (req, res) => {
  try {
    const week = req.query.week || currentWeek();
    const entries = await Dynamic.find({ coupleId: req.user.coupleId, week })
      .populate('userId', 'name avatar');
    res.json({ week, entries });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── POST /api/dynamics ──────────────────────────────────────
// Upsert the current user's stats for this week
// Body: { love, care, fights, surprises, textsFirst, dateNights, sweetGestures }
router.post('/', protect, requireCouple, async (req, res) => {
  try {
    const week = currentWeek();
    const { love, care, fights, surprises, textsFirst, dateNights, sweetGestures } = req.body;

    const entry = await Dynamic.findOneAndUpdate(
      { coupleId: req.user.coupleId, userId: req.user.id, week },
      { love, care, fights, surprises, textsFirst, dateNights, sweetGestures },
      { upsert: true, new: true }
    ).populate('userId', 'name avatar');

    res.status(201).json(entry);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
