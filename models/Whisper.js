import mongoose from 'mongoose';

// A Whisper is a private message between the two people in a couple.
// Real-time delivery is handled via Socket.io; this model persists the history.
const whisperSchema = new mongoose.Schema(
  {
    coupleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Couple', required: true, index: true },
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    text: { type: String, required: true, trim: true },

    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('Whisper', whisperSchema);
