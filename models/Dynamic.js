import mongoose from 'mongoose';

// Weekly snapshot data for the "Dynamic" page.
// Each document represents one user's self-reported stats for a given week.
const dynamicSchema = new mongoose.Schema(
  {
    coupleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Couple', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // ISO week label, e.g. "2026-W13"
    week: { type: String, required: true },

    // ── Radar chart axes ─────────────────────────────────────
    // Each value is 0–100
    love: { type: Number, default: 0, min: 0, max: 100 },
    care: { type: Number, default: 0, min: 0, max: 100 },
    fights: { type: Number, default: 0, min: 0, max: 100 }, // lower = better
    surprises: { type: Number, default: 0, min: 0, max: 100 },
    textsFirst: { type: Number, default: 0, min: 0, max: 100 },

    // ── Weekly counters ──────────────────────────────────────
    dateNights: { type: Number, default: 0, min: 0 },
    sweetGestures: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

// Unique per user per week
dynamicSchema.index({ coupleId: 1, userId: 1, week: 1 }, { unique: true });

export default mongoose.model('Dynamic', dynamicSchema);
