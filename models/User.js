import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, minlength: 6 },

    // The couple this user belongs to (set after pairing)
    coupleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Couple', default: null },

    // Invite code this user generates to pair with a partner
    inviteCode: { type: String, unique: true, sparse: true },

    // Profile photo — stored via Cloudinary
    // TODO (YOU): Upload profile photo via the /api/auth/avatar endpoint
    avatar: {
      url: { type: String, default: '' },
      publicId: { type: String, default: '' }, // Cloudinary public_id for future deletion
    },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

export default mongoose.model('User', userSchema);
