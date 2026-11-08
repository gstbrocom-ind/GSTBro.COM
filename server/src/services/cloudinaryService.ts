import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env.js';

let configured = false;

export function initCloudinary(): void {
  if (configured || !env.CLOUDINARY_CLOUD_NAME) return;
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  });
  configured = true;
}

export async function uploadToCloudinary(
  buffer: Buffer,
  options: { folder?: string; resource_type?: 'image' | 'video' | 'raw' } = {}
): Promise<{ url: string; public_id: string }> {
  initCloudinary();
  if (!configured) throw new Error('Cloudinary not configured');

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder ?? 'gstbro',
        resource_type: options.resource_type ?? 'image',
      },
      (err, result) => {
        if (err || !result) reject(err ?? new Error('Upload failed'));
        else resolve({ url: result.secure_url, public_id: result.public_id });
      }
    );
    stream.end(buffer);
  });
}

export async function deleteFromCloudinary(publicId: string): Promise<void> {
  initCloudinary();
  if (!configured) return;
  await cloudinary.uploader.destroy(publicId);
}
