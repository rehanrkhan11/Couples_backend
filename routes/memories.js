import express from 'express';
import { protect } from '../middleware/auth.js';
import { uploadImage, cloudinary } from '../middleware/cloudinary.js';
import Memory from '../models/Memory.js';

const router = express.Router();

// All memory routes require authentication and an active couple
const requireCouple = (req, res, next) => {
  if (!req.user.coupleId)
    return res.status(403).json({ message: 'You must be paired to manage memories' });
  next();
};

// ─── GET /api/memories ───────────────────────────────────────
router.get('/', protect, requireCouple, async (req, res) => {
  try {
    const memories = await Memory.find({ coupleId: req.user.coupleId, isDeleted: false })
      .sort({ date: -1 })
      .populate('createdBy', 'name avatar');
    res.json(memories);
  } catch (err) {
    console.error('GET /memories error:', err);
    res.status(500).json({ message: err.message || String(err) });
  }
});

// ─── POST /api/memories ──────────────────────────────────────
router.post('/', protect, requireCouple, (req, res, next) => {
  uploadImage.single('image')(req, res, (err) => {
    if (err) {
      console.error('Multer/Cloudinary upload error:', err);
      return res.status(500).json({ message: err.message || String(err) });
    }
    next();
  });
}, async (req, res) => {
  try {
    const { type, title, date, content, note, size } = req.body;

    const memoryData = {
      coupleId: req.user.coupleId,
      createdBy: req.user.id,
      type,
      title,
      date: new Date(date),
      content,
      note,
      size: size || 'medium',
    };

    if (req.file) {
      memoryData.image = {
        url: req.file.path,
        publicId: req.file.filename,
      };
    }

    const memory = await Memory.create(memoryData);
    await memory.populate('createdBy', 'name avatar');
    res.status(201).json(memory);
  } catch (err) {
    console.error('POST /memories error:', err);
    res.status(500).json({ message: err.message || String(err) });
  }
});

// ─── PATCH /api/memories/:id ─────────────────────────────────
router.patch('/:id', protect, requireCouple, (req, res, next) => {
  uploadImage.single('image')(req, res, (err) => {
    if (err) {
      console.error('Multer/Cloudinary upload error:', err);
      return res.status(500).json({ message: err.message || String(err) });
    }
    next();
  });
}, async (req, res) => {
  try {
    const memory = await Memory.findOne({ _id: req.params.id, coupleId: req.user.coupleId });
    if (!memory) return res.status(404).json({ message: 'Memory not found' });

    const { title, note, content, size, date } = req.body;
    if (title !== undefined) memory.title = title;
    if (note !== undefined) memory.note = note;
    if (content !== undefined) memory.content = content;
    if (size !== undefined) memory.size = size;
    if (date !== undefined) memory.date = new Date(date);

    if (req.file) {
      if (memory.image?.publicId) {
        await cloudinary.uploader.destroy(memory.image.publicId);
      }
      memory.image = { url: req.file.path, publicId: req.file.filename };
    }

    await memory.save();
    await memory.populate('createdBy', 'name avatar');
    res.json(memory);
  } catch (err) {
    console.error('PATCH /memories error:', err);
    res.status(500).json({ message: err.message || String(err) });
  }
});

// ─── DELETE /api/memories/:id ────────────────────────────────
router.delete('/:id', protect, requireCouple, async (req, res) => {
  try {
    const memory = await Memory.findOne({ _id: req.params.id, coupleId: req.user.coupleId });
    if (!memory) return res.status(404).json({ message: 'Memory not found' });

    if (memory.image?.publicId) {
      await cloudinary.uploader.destroy(memory.image.publicId);
    }

    memory.isDeleted = true;
    await memory.save();
    res.json({ message: 'Memory deleted' });
  } catch (err) {
    console.error('DELETE /memories error:', err);
    res.status(500).json({ message: err.message || String(err) });
  }
});

export default router;
