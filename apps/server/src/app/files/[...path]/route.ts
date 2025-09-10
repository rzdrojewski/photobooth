import { NextRequest } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  const filePath = path.join(process.cwd(), 'apps', 'server', 'storage', ...params.path);
  try {
    const data = await fs.readFile(filePath);
    const filename = params.path.at(-1) || 'file';
    return new Response(data, {
      headers: {
        'Content-Disposition': `inline; filename="${filename}"`,
        'Content-Type': inferMime(filename)
      }
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}

function inferMime(name: string) {
  const lower = name.toLowerCase();
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.png')) return 'image/png';
  return 'application/octet-stream';
}

