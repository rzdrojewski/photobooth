import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { rateLimitByIp } from '@/lib/rateLimit';
import { env } from '@/lib/env';
import { z } from 'zod';
import { preflight, withCORS } from '@/lib/cors';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || req.ip || 'unknown';
  const rl = rateLimitByIp(ip, 1000 * 60 * 5, 5); // 5 mails / 5 min / IP
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
  }

  let slug: string | undefined;
  let email: string | undefined;
  const ctype = req.headers.get('content-type') || '';
  if (ctype.includes('application/json')) {
    const body = await req.json().catch(() => null);
    if (body) ({ slug, email } = body);
  } else {
    const form = await req.formData();
    slug = String(form.get('slug') || '');
    email = String(form.get('email') || '');
  }
  const schema = z.object({ slug: z.string().min(4), email: z.string().email() });
  try {
    schema.parse({ slug, email });
  } catch (e: any) {
    return NextResponse.json({ error: 'Invalid fields', details: e?.errors }, { status: 400 });
  }

  // TODO: configure real SMTP
  const transport = nodemailer.createTransport({ jsonTransport: true });
  const link = `${env.PUBLIC_BASE_URL}/p/${slug}`;
  await transport.sendMail({
    to: email,
    from: 'photobooth@example.com',
    subject: 'Votre photo Photobooth',
    text: `Téléchargez votre photo: ${link}`,
    html: `<p>Téléchargez votre photo: <a href="${link}">${link}</a></p>`
  });

  return withCORS(req, NextResponse.json({ ok: true }));
}

export function OPTIONS(req: NextRequest) {
  return preflight(req);
}
