import express from 'express';
import multer from 'multer';
import { protect } from '../middleware/auth.js';
import { cloudinary } from '../middleware/cloudinary.js';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import Soundtrack from '../models/Soundtrack.js';

const router = express.Router();

// Combined upload: albumArt (image) + audio (audio clip)
// Using multer fields so both can be uploaded in one request
// TODO (YOU): Send multipart/form-data with fields "albumArt" (image file) and "audio" (audio file)
const albumArtStorage = new CloudinaryStorage({
  cloudinary,
  params: { folder: 'couples-app/album-art', allowed_formats: ['jpg', 'jpeg', 'png', 'webp'] },
});
const audioStorage = new CloudinaryStorage({
  cloudinary,
  params: { folder: 'couples-app/audio', resource_type: 'video', allowed_formats: ['mp3', 'wav', 'ogg', 'm4a'] },
});

// We handle two separate uploads sequentially in the route
const uploadArtMiddleware = multer({ storage: albumArtStorage }).single('albumArt');
const uploadAudioMiddleware = multer({ storage: audioStorage }).single('audio');

const requireCouple = (req, res, next) => {
  if (!req.user.coupleId)
    return res.status(403).json({ message: 'You must be paired to manage soundtracks' });
  next();
};

// ─── GET /api/soundtracks ────────────────────────────────────
router.get('/', protect, requireCouple, async (req, res) => {
  try {
    const songs = await Soundtrack.find({ coupleId: req.user.coupleId, isDeleted: false })
      .sort({ featured: -1, createdAt: -1 })
      .populate('addedBy', 'name avatar');
    res.json(songs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── POST /api/soundtracks ───────────────────────────────────
router.post('/', protect, requireCouple, (req, res) => {
  // Chain the two multer middlewares manually
  uploadArtMiddleware(req, res, (artErr) => {
    if (artErr) return res.status(400).json({ message: artErr.message });

    uploadAudioMiddleware(req, res, async (audioErr) => {
      if (audioErr) return res.status(400).json({ message: audioErr.message });

      try {
        const { title, artist, album, link, note, featured } = req.body;
        if (!title || !artist) return res.status(400).json({ message: 'title and artist are required' });

        const songData = {
          coupleId: req.user.coupleId,
          addedBy: req.user.id,
          title,
          artist,
          album: album || '',
          link: link || '',
          note: note || '',
          featured: featured === 'true' || featured === true,
        };

        if (req.files?.albumArt?.[0]) {
          songData.albumArt = { url: req.files.albumArt[0].path, publicId: req.files.albumArt[0].filename };
        }
        if (req.files?.audio?.[0]) {
          songData.audio = { url: req.files.audio[0].path, publicId: req.files.audio[0].filename };
        }

        // If this is set as featured, un-feature all others
        if (songData.featured) {
          await Soundtrack.updateMany({ coupleId: req.user.coupleId }, { featured: false });
        }

        const song = await Soundtrack.create(songData);
        await song.populate('addedBy', 'name avatar');
        res.status(201).json(song);
      } catch (err) {
        res.status(500).json({ message: err.message });
      }
    });
  });
});

// ─── PATCH /api/soundtracks/:id/feature ─────────────────────
// Toggle featured status for a song
router.patch('/:id/feature', protect, requireCouple, async (req, res) => {
  try {
    await Soundtrack.updateMany({ coupleId: req.user.coupleId }, { featured: false });
    const song = await Soundtrack.findOneAndUpdate(
      { _id: req.params.id, coupleId: req.user.coupleId },
      { featured: true },
      { new: true }
    );
    if (!song) return res.status(404).json({ message: 'Song not found' });
    res.json(song);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── DELETE /api/soundtracks/:id ─────────────────────────────
router.delete('/:id', protect, requireCouple, async (req, res) => {
  try {
    const song = await Soundtrack.findOne({ _id: req.params.id, coupleId: req.user.coupleId });
    if (!song) return res.status(404).json({ message: 'Song not found' });

    if (song.albumArt?.publicId) await cloudinary.uploader.destroy(song.albumArt.publicId);
    if (song.audio?.publicId) await cloudinary.uploader.destroy(song.audio.publicId, { resource_type: 'video' });

    song.isDeleted = true;
    await song.save();
    res.json({ message: 'Song removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
