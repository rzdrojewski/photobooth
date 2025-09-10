import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { getS3Client } from '@/lib/s3';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { rateLimitByIp } from '@/lib/rateLimit';
import { preflight, withCORS } from '@/lib/cors';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || req.ip || 'unknown';
  const rl = rateLimitByIp(ip, 60_000, 60); // 60 req/min
  if (!rl.allowed) return NextResponse.json({ error: 'Rate limited' }, { status: 429 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

  const schema = z.object({ filename: z.string().min(1), mimeType: z.string().min(3), eventId: z.string().min(1) });
  const { filename, mimeType, eventId } = schema.parse(body);

  const qrSlug = nanoid(9);
  const key = `${eventId}/${qrSlug}/${filename}`;

  if (env.STORAGE_MODE === 's3') {
    if (!env.S3_BUCKET) return NextResponse.json({ error: 'S3 config' }, { status: 500 });
    const client = getS3Client();
    const command = new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      ContentType: mimeType
    });
    const url = await getSignedUrl(client, command, { expiresIn: 60 * 5 });
    return withCORS(req, NextResponse.json({ mode: 's3', url, qrSlug, key }));
  }

  // Local mode: return a simple upload token (embed data)
  const uploadToken = Buffer.from(JSON.stringify({ eventId, qrSlug, filename, mimeType })).toString('base64url');
  return withCORS(req, NextResponse.json({ mode: 'local', uploadToken, qrSlug, key }));
}

export function OPTIONS(req: NextRequest) {
  return preflight(req);
}
