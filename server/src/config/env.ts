import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  SUPABASE_URL: z.string().trim().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().trim().min(1),
  JWT_SECRET: z.string().trim().min(16),
  RESEND_API_KEY: z.string().trim().optional(),
  RESEND_FROM_EMAIL: z.string().trim().default('GSTBro <noreply@gstbro.com>'),
  CLOUDINARY_CLOUD_NAME: z.string().trim().optional(),
  CLOUDINARY_API_KEY: z.string().trim().optional(),
  CLOUDINARY_API_SECRET: z.string().trim().optional(),
  GOOGLE_SERVICE_ACCOUNT_JSON: z.string().trim().optional(),
  GOOGLE_DRIVE_ROOT_FOLDER_ID: z.string().trim().optional(),
  SITE_URL: z.string().trim().url().default('https://gstbro.com'),
  CORS_ORIGINS: z.string().trim().default('http://localhost:5173,http://localhost:5174'),
  TWOFACTOR_API_KEY: z.string().trim().optional(),
  TWOFACTOR_API_BASE_URL: z.string().trim().url().default('https://2factor.in/API/V1'),
  TWOFACTOR_TEMPLATE_NAME: z.string().trim().optional(),
  APITXT_AUTHKEY: z.string().trim().optional(),
  APITXT_SMS_TEMPLATE_ID: z.string().trim().optional(),
  APITXT_API_BASE_URL: z.string().trim().url().default('https://apitxt.com/api'),
  OTP_PROVIDER: z.enum(['apitxt', '2factor']).default('apitxt'),
  OTP_HASH_SECRET: z.string().trim().min(16).default('gstbro_secure_dedicated_otp_hmac_secret_2026'),
  REDIS_URL: z.string().trim().optional(),
  TRUST_PROXY: z.coerce.boolean().default(true),
  CLOUDFLARE_ORIGIN_SECRET: z.string().trim().optional(),
  TURNSTILE_SECRET_KEY: z.string().trim().default('1x0000000000000000000000000000000AA'),
});

export const env = envSchema.parse(process.env);
export const corsOrigins = env.CORS_ORIGINS.split(',').map((o) => o.trim());
