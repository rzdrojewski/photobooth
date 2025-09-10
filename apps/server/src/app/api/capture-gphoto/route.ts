import { NextRequest, NextResponse } from 'next/server';
import { preflight, withCORS } from '@/lib/cors';
import { rateLimitByIp } from '@/lib/rateLimit';
import { spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { setTimeout as sleep } from 'node:timers/promises';
import fs from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';

async function run(cmd: string, args: string[], opts?: { cwd?: string }): Promise<{ code: number; stdout: string; stderr: string }> {
  return await new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], shell: false, cwd: opts?.cwd });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('close', (code) => resolve({ code: code ?? -1, stdout, stderr }));
  });
}

function parseLastFileIndex(listing: string): number | null {
  // Lines look like: "#123  <filename>"
  // We will capture the greatest index
  let max = -1;
  for (const line of listing.split(/\r?\n/)) {
    const m = line.match(/^#(\d+)\b/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (!Number.isNaN(n) && n > max) max = n;
    }
  }
  return max >= 0 ? max : null;
}

async function ensureDir(p: string) {
  await fs.mkdir(p, { recursive: true }).catch(() => {});
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || req.ip || 'unknown';
  const rl = rateLimitByIp(ip, 10_000, 10); // 10 req / 10s
  if (!rl.allowed) return NextResponse.json({ error: 'Rate limited' }, { status: 429 });

  // Optional body: { settleMs?: number }
  const body = await req.json().catch(() => ({} as { settleMs?: number }));
  const settleMs = typeof body?.settleMs === 'number' && body.settleMs >= 200 ? Math.min(body.settleMs, 5000) : 1200;

  // Trigger capture
  const trigger = await run('gphoto2', ['--trigger-capture']);
  if (trigger.code !== 0) {
    return NextResponse.json({ error: 'gphoto2 trigger failed', details: trigger.stderr || trigger.stdout }, { status: 500 });
  }

  // Wait a bit for the file to be saved on the camera
  await sleep(settleMs);

  // List files and pick the last index
  const list = await run('gphoto2', ['--list-files']);
  if (list.code !== 0) {
    return NextResponse.json({ error: 'gphoto2 list failed', details: list.stderr || list.stdout }, { status: 500 });
  }
  const lastIndex = parseLastFileIndex(list.stdout);
  if (!lastIndex) {
    return NextResponse.json({ error: 'No file found on camera after capture' }, { status: 500 });
  }

  // Prepare output path inside workspace
  const baseDir = path.resolve(process.cwd(), '.data', 'captures');
  await ensureDir(baseDir);
  const filename = `dslr_${Date.now()}.jpg`;
  const outPath = path.join(baseDir, filename);

  // Download the file
  const get = await run('gphoto2', ['--get-file', String(lastIndex), '--filename', outPath]);
  if (get.code !== 0) {
    return NextResponse.json({ error: 'gphoto2 get-file failed', details: get.stderr || get.stdout }, { status: 500 });
  }

  let buf: Buffer | null = null;
  try {
    buf = await fs.readFile(outPath);
  } catch (e) {
    return NextResponse.json({ error: 'Failed reading captured file' }, { status: 500 });
  } finally {
    // Best effort cleanup to avoid growing folder
    await fs.unlink(outPath).catch(() => {});
  }

  const res = new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'no-store, max-age=0'
    }
  });
  return withCORS(req, res);
}

export function OPTIONS(req: NextRequest) {
  return preflight(req);
}

