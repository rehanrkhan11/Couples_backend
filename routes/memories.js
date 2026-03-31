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
// Returns all non-deleted memories for the couple, newest first
router.get('/', protect, requireCouple, async (req, res) => {
  try {
    const memories = await Memory.find({ coupleId: req.user.coupleId, isDeleted: false })
      .sort({ date: -1 })
      .populate('createdBy', 'name avatar');
    res.json(memories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── POST /api/memories ──────────────────────────────────────
// For photo memories: send multipart/form-data with field name "image"
// TODO (YOU): On the frontend, use FormData and append the image file under key "image"
router.post('/', protect, requireCouple, uploadImage.single('image'), async (req, res) => {
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

    // Attach Cloudinary result if an image was uploaded
    if (req.file) {
      memoryData.image = {
        url: req.file.path,         // Cloudinary secure URL
        publicId: req.file.filename, // Cloudinary public_id
      };
    }

    const memory = await Memory.create(memoryData);
    await memory.populate('createdBy', 'name avatar');
    res.status(201).json(memory);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── PATCH /api/memories/:id ─────────────────────────────────
// Update title, note, content or size — image replacement also supported
router.patch('/:id', protect, requireCouple, uploadImage.single('image'), async (req, res) => {
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
      // Delete old Cloudinary image if it exists
      if (memory.image?.publicId) {
        await cloudinary.uploader.destroy(memory.image.publicId);
      }
      memory.image = { url: req.file.path, publicId: req.file.filename };
    }

    await memory.save();
    await memory.populate('createdBy', 'name avatar');
    res.json(memory);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── DELETE /api/memories/:id ────────────────────────────────
router.delete('/:id', protect, requireCouple, async (req, res) => {
  try {
    const memory = await Memory.findOne({ _id: req.params.id, coupleId: req.user.coupleId });
    if (!memory) return res.status(404).json({ message: 'Memory not found' });

    // Remove from Cloudinary
    if (memory.image?.publicId) {
      await cloudinary.uploader.destroy(memory.image.publicId);
    }

    memory.isDeleted = true;
    await memory.save();
    res.json({ message: 'Memory deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
