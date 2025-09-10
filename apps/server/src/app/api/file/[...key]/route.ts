import { NextRequest } from 'next/server';
import { env } from '@/lib/env';
import { getS3Client } from '@/lib/s3';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'node:stream';
import { resolveOrigin } from '@/lib/cors';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, { params }: { params: { key: string[] } }) {
  if (env.STORAGE_MODE !== 's3') {
    return new Response('Not available in local mode', { status: 400 });
  }
  const key = params.key.join('/');
  if (!env.S3_BUCKET) return new Response('S3 config missing', { status: 500 });

  const client = getS3Client();
  const cmd = new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key });
  try {
    const res = await client.send(cmd);
    const body = res.Body as any; // Node.js Readable
    const webStream = (Readable as any).toWeb ? (Readable as any).toWeb(body) : body;
    const contentType = res.ContentType || inferMime(key);
    const filename = key.split('/').pop() || 'file';
    const resHeaders: Record<string, string> = {
      'Content-Type': contentType,
      'Content-Length': res.ContentLength?.toString() || '',
      'Last-Modified': res.LastModified?.toUTCString() || '',
      'Content-Disposition': `inline; filename="${filename}"`
    };
    const origin = resolveOrigin(_req as any);
    if (origin) {
      resHeaders['Access-Control-Allow-Origin'] = origin;
      resHeaders['Vary'] = 'Origin';
    }
    return new Response(webStream as any, {
      headers: {
        ...resHeaders
      }
    });
  } catch (e) {
    console.error('S3 proxy error', e);
    return new Response('Not found', { status: 404 });
  }
}

function inferMime(name: string) {
  const lower = name.toLowerCase();
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.png')) return 'image/png';
  return 'application/octet-stream';
}
