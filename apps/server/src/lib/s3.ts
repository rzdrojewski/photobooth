import { S3Client } from '@aws-sdk/client-s3';
import { env } from './env';

export function getS3Client() {
  if (env.STORAGE_MODE !== 's3') throw new Error('S3 client requested while STORAGE_MODE!=s3');
  if (!env.S3_ENDPOINT || !env.S3_REGION || !env.S3_ACCESS_KEY || !env.S3_SECRET_KEY)
    throw new Error('S3 env variables missing');

  return new S3Client({
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT,
    forcePathStyle: env.S3_FORCE_PATH_STYLE ?? true,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY,
      secretAccessKey: env.S3_SECRET_KEY
    }
  });
}

