import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { rateLimitByIp } from '@/lib/rateLimit';
import { preflight, withCORS } from '@/lib/cors';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || req.ip || 'unknown';
  const rl = rateLimitByIp(ip, 60_000, 120); // 120 req/min
  if (!rl.allowed) return NextResponse.json({ error: 'Rate limited' }, { status: 429 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

  const schema = z.object({
    eventId: z.string().min(1),
    filename: z.string().min(1),
    mimeType: z.string().min(3),
    storageKey: z.string().min(1),
    qrSlug: z.string().min(4),
    width: z.number().int().optional(),
    height: z.number().int().optional(),
    email: z.string().email().optional()
  });
  const { eventId, filename, mimeType, storageKey, qrSlug, width, height, email } = schema.parse(body);

  // Ensure event exists
  await prisma.event.upsert({
    where: { id: eventId },
    update: {},
    create: { id: eventId, name: eventId, date: new Date() }
  });

  const photo = await prisma.photo.create({
    data: { eventId, filename, mimeType, storageKey, qrSlug, width: width ?? null, height: height ?? null, email: email ?? null }
  });

  return withCORS(req, NextResponse.json({ ok: true, photo }));
}

export function OPTIONS(req: NextRequest) {
  return preflight(req);
}
