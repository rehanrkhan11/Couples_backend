import mongoose from 'mongoose';

// A song the couple adds to their shared soundtrack.
const soundtrackSchema = new mongoose.Schema(
  {
    coupleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Couple', required: true, index: true },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    title: { type: String, required: true, trim: true },
    artist: { type: String, required: true, trim: true },
    album: { type: String, default: '' },

    // Album art — stored via Cloudinary
    // TODO (YOU): Send album art image to POST /api/soundtracks with multipart/form-data field name "albumArt"
    albumArt: {
      url: { type: String, default: '' },
      publicId: { type: String, default: '' },
    },

    // Audio preview clip — stored via Cloudinary (optional)
    // TODO (YOU): Send audio file to POST /api/soundtracks with multipart/form-data field name "audio"
    audio: {
      url: { type: String, default: '' },
      publicId: { type: String, default: '' },
    },

    // External link (Spotify, Apple Music, YouTube, etc.)
    link: { type: String, default: '' },

    // Personal note about why this song matters
    note: { type: String, default: '' },

    // Mark one song as the featured (hero) song
    featured: { type: Boolean, default: false },

    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('Soundtrack', soundtrackSchema);
