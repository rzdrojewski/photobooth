import { execFile } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export type CaptureOptions = {
  gphoto2Bin?: string;
  timeoutMs?: number;
  settleMs?: number;
  port?: string; // e.g., "usb:001,005"
};

export function ensureDir(path: string) {
  try {
    mkdirSync(path, { recursive: true });
  } catch {}
}

function runGphoto(
  bin: string,
  args: string[],
  timeout: number,
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = execFile(bin, args, { timeout, encoding: "utf8" }, (err, stdout, stderr) => {
      if (err) return reject(err);
      resolve({ stdout: stdout ?? "", stderr: stderr ?? "" });
    });
    child.on("error", reject);
  });
}

async function detectPort(bin: string, timeout: number): Promise<string | null> {
  try {
    const { stdout } = await runGphoto(bin, ["--auto-detect"], timeout);
    const match = stdout.match(/usb:\d+,\d+/);
    return match ? match[0] : null;
  } catch {
    return null;
  }
}

export async function capturePhoto(
  outputFile: string,
  options: CaptureOptions = {},
): Promise<void> {
  const bin = options.gphoto2Bin || process.env.GPHOTO2_BIN || "gphoto2";
  const timeout = options.timeoutMs ?? 20000;
  const settleMs = options.settleMs ?? 500;
  const explicitPort = options.port || process.env.GPHOTO2_PORT || null;

  ensureDir(dirname(outputFile));

  // Resolve port if available to avoid detection issues
  const port = explicitPort || (await detectPort(bin, timeout));
  const baseArgs = port ? ["--port", port] : [];

  // 1) Trigger capture (non-blocking)
  await runGphoto(bin, [...baseArgs, "--trigger-capture", "--quiet"], timeout);

  // 2) Give the camera time to save the file
  await new Promise((r) => setTimeout(r, settleMs));

  // 3) List files and pick the last index
  const { stdout } = await runGphoto(bin, [...baseArgs, "--list-files"], timeout);
  const indices = Array.from(stdout.matchAll(/^#\s*(\d+)/gm)).map((m) => Number(m[1])).filter((n) => Number.isFinite(n));
  if (!indices.length) {
    throw new Error("No files found on camera after capture");
  }
  const lastIndex = Math.max(...indices);

  // 4) Download the last file to the desired location
  await runGphoto(
    bin,
    [...baseArgs, "--get-file", String(lastIndex), "--filename", outputFile, "--force-overwrite", "--quiet"],
    timeout,
  );
}
