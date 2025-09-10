import { z } from 'zod';

export const envSchema = z.object({
  STORAGE_MODE: z.enum(['s3', 'local']).default('local'),
  S3_ENDPOINT: z.string().url().optional(),
  S3_REGION: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  S3_FORCE_PATH_STYLE: z.string().transform(v => v === 'true').optional(),
  ADMIN_PASSWORD: z.string().min(4),
  PUBLIC_BASE_URL: z.string().url()
});

export const env = envSchema.parse({
  STORAGE_MODE: process.env.STORAGE_MODE,
  S3_ENDPOINT: process.env.S3_ENDPOINT,
  S3_REGION: process.env.S3_REGION,
  S3_BUCKET: process.env.S3_BUCKET,
  S3_ACCESS_KEY: process.env.S3_ACCESS_KEY,
  S3_SECRET_KEY: process.env.S3_SECRET_KEY,
  S3_FORCE_PATH_STYLE: process.env.S3_FORCE_PATH_STYLE,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
  PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL
});

