import mongoose from 'mongoose';

// Represents a single item on the couple's Timeline.
const memorySchema = new mongoose.Schema(
  {
    coupleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Couple', required: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    type: {
      type: String,
      enum: ['photo', 'note', 'milestone'],
      required: true,
    },

    title: { type: String, required: true, trim: true },
    date: { type: Date, required: true },

    // For type === 'note' or 'milestone'
    content: { type: String, default: '' },

    // For type === 'photo' — stored via Cloudinary
    // TODO (YOU): Send the image file to POST /api/memories with multipart/form-data using field name "image"
    image: {
      url: { type: String, default: '' },
      publicId: { type: String, default: '' },
    },

    note: { type: String, default: '' }, // Caption shown on photo cards

    // Controls the asymmetric layout on the timeline
    size: { type: String, enum: ['large', 'medium', 'small'], default: 'medium' },

    // Soft delete
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('Memory', memorySchema);
