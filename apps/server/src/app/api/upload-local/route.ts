import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { promises as fs } from 'fs';
import path from 'path';
import { z } from 'zod';
import { preflight, withCORS } from '@/lib/cors';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (env.STORAGE_MODE !== 'local') {
    return NextResponse.json({ error: 'STORAGE_MODE must be local' }, { status: 400 });
  }
  const form = await req.formData();
  const token = form.get('uploadToken');
  const file = form.get('file') as File | null;
  if (!token || !file) return NextResponse.json({ error: 'Missing form fields' }, { status: 400 });

  const parsed = JSON.parse(Buffer.from(String(token), 'base64url').toString());
  const schema = z.object({ eventId: z.string().min(1), qrSlug: z.string().min(4), filename: z.string().min(1), mimeType: z.string().optional() });
  const { eventId, qrSlug, filename } = schema.parse(parsed);
  const storageRoot = path.join(process.cwd(), 'apps', 'server', 'storage');
  const dir = path.join(storageRoot, eventId, qrSlug);
  await fs.mkdir(dir, { recursive: true });
  const arrayBuffer = await file.arrayBuffer();
  await fs.writeFile(path.join(dir, filename), Buffer.from(arrayBuffer));

  return withCORS(req, NextResponse.json({ ok: true, key: `${eventId}/${qrSlug}/${filename}` }));
}

export function OPTIONS(req: NextRequest) {
  return preflight(req);
}
