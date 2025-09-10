import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { env } from '@/lib/env';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  const url = `${env.PUBLIC_BASE_URL}/p/${params.slug}`;
  const svg = await QRCode.toString(url, { type: 'svg', margin: 1, width: 256 });
  return new NextResponse(svg, {
    headers: { 'Content-Type': 'image/svg+xml' }
  });
}

