import express from 'express';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { nanoid } from 'nanoid'; // tiny random string for invite codes
import User from '../models/User.js';
import Couple from '../models/Couple.js';
import { protect } from '../middleware/auth.js';
import { uploadImage } from '../middleware/cloudinary.js';

const router = express.Router();

// ─── Helper: sign a JWT ───────────────────────────────────────
const signToken = (user) =>
  jwt.sign(
    { id: user._id, coupleId: user.coupleId },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );

// ─── POST /api/auth/register ──────────────────────────────────
router.post(
  '/register',
  [
    body('name').notEmpty().trim(),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { name, email, password } = req.body;

      if (await User.findOne({ email }))
        return res.status(400).json({ message: 'Email already in use' });

      // Generate a unique 8-char invite code for pairing
      const inviteCode = nanoid(8).toUpperCase();
      const user = await User.create({ name, email, password, inviteCode });

      res.status(201).json({ token: signToken(user), user: { id: user._id, name, email, inviteCode, coupleId: null } });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// ─── POST /api/auth/login ─────────────────────────────────────
router.post(
  '/login',
  [body('email').isEmail(), body('password').notEmpty()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email });
      if (!user || !(await user.comparePassword(password)))
        return res.status(401).json({ message: 'Invalid credentials' });

      res.json({
        token: signToken(user),
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          inviteCode: user.inviteCode,
          coupleId: user.coupleId,
          avatar: user.avatar,
        },
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// ─── GET /api/auth/me ─────────────────────────────────────────
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password').populate('coupleId');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── POST /api/auth/pair ──────────────────────────────────────
// Body: { inviteCode: "ABC12345" }
// The logged-in user pairs with the owner of the given invite code.
router.post('/pair', protect, async (req, res) => {
  try {
    const { inviteCode } = req.body;
    if (!inviteCode) return res.status(400).json({ message: 'inviteCode is required' });

    const partner = await User.findOne({ inviteCode: inviteCode.toUpperCase() });
    if (!partner) return res.status(404).json({ message: 'Invite code not found' });
    if (partner._id.toString() === req.user.id)
      return res.status(400).json({ message: 'You cannot pair with yourself' });
    if (partner.coupleId)
      return res.status(400).json({ message: 'That user is already paired' });

    const me = await User.findById(req.user.id);
    if (me.coupleId) return res.status(400).json({ message: 'You are already paired' });

    // Create the couple
    const couple = await Couple.create({ members: [me._id, partner._id] });

    // Update both users
    me.coupleId = couple._id;
    partner.coupleId = couple._id;
    await me.save();
    await partner.save();

    res.json({ coupleId: couple._id, message: 'Paired successfully! 💑' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── POST /api/auth/avatar ────────────────────────────────────
// TODO (YOU): Call this with multipart/form-data, field name "avatar"
router.post('/avatar', protect, uploadImage.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { avatar: { url: req.file.path, publicId: req.file.filename } },
      { new: true }
    ).select('-password');

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
