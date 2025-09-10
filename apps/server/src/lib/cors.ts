import { NextRequest, NextResponse } from 'next/server';
import { env } from './env';

function parseAllowed() {
  const csv = (process.env.ALLOWED_ORIGINS || '').trim();
  if (!csv) return ['http://localhost:5173'];
  return csv.split(',').map(s => s.trim()).filter(Boolean);
}

const allowed = parseAllowed();

export function resolveOrigin(req: NextRequest) {
  const origin = req.headers.get('origin');
  if (!origin) return '*';
  if (allowed.includes('*')) return '*';
  if (allowed.includes(origin)) return origin;
  return 'null';
}

export function withCORS(req: NextRequest, res: NextResponse) {
  const origin = resolveOrigin(req);
  res.headers.set('Access-Control-Allow-Origin', origin);
  res.headers.set('Vary', 'Origin');
  res.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.headers.set('Access-Control-Max-Age', '600');
  return res;
}

export function preflight(req: NextRequest) {
  const res = new NextResponse(null, { status: 204 });
  return withCORS(req, res);
}

