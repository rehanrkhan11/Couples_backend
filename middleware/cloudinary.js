import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import dotenv from 'dotenv';

dotenv.config();

// TODO (YOU): Ensure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET are in .env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ─── Image Storage (for memory photos, album art) ────────────
const imageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'couples-app/images',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ quality: 'auto', fetch_format: 'auto' }],
  },
});

// ─── Audio Storage (for soundtrack audio clips) ──────────────
const audioStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'couples-app/audio',
    resource_type: 'video', // Cloudinary uses "video" resource_type for audio
    allowed_formats: ['mp3', 'wav', 'ogg', 'm4a'],
  },
});

export const uploadImage = multer({ storage: imageStorage });
export const uploadAudio = multer({ storage: audioStorage });
export { cloudinary };
