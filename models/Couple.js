import mongoose from 'mongoose';

// A Couple document is created when two users pair up via invite code.
const coupleSchema = new mongoose.Schema(
  {
    // Exactly two members
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],

    // Optional couple name / nickname
    coupleName: { type: String, default: '' },

    // Anniversary / relationship start date
    // TODO (YOU): Set this from the frontend settings screen when you build one
    anniversaryDate: { type: Date, default: null },

    // Couple cover photo — stored via Cloudinary
    coverPhoto: {
      url: { type: String, default: '' },
      publicId: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

export default mongoose.model('Couple', coupleSchema);
