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
  const debug = process.env.DEBUG_GPHOTO2 === "1";
  if (debug) console.log(`[gphoto2] exec: ${bin} ${args.join(" ")}`);
  return new Promise((resolve, reject) => {
    const child = execFile(
      bin,
      args,
      { timeout, encoding: "utf8" },
      (err, stdout, stderr) => {
        const out = stdout ?? "";
        const errOut = stderr ?? "";
        if (debug) {
          if (out) console.log(`[gphoto2] stdout:\n${out}`);
          if (errOut) console.log(`[gphoto2] stderr:\n${errOut}`);
        }
        if (err) {
          const wrapped = new Error(
            `gphoto2 failed: ${err.message}\nargs: ${args.join(" ")}\nstdout:\n${out}\nstderr:\n${errOut}`,
          );
          // @ts-ignore attach context for server logs
          (wrapped as any).code = (err as any).code;
          return reject(wrapped);
        }
        resolve({ stdout: out, stderr: errOut });
      },
    );
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

export async function getCameraInfo(bin?: string, port?: string | null, timeoutMs?: number) {
  const timeout = timeoutMs ?? 15000;
  const exe = bin || process.env.GPHOTO2_BIN || "gphoto2";
  const auto = await runGphoto(exe, ["--auto-detect"], timeout);
  const ports = Array.from(auto.stdout.matchAll(/usb:\d+,\d+/g)).map((m) => m[0]);
  const selected = port || process.env.GPHOTO2_PORT || ports[0] || null;
  let summary: string | null = null;
  try {
    if (selected) {
      const res = await runGphoto(exe, ["--port", selected, "--summary"], timeout);
      summary = res.stdout || res.stderr || null;
    }
  } catch (e) {
    summary = (e as Error).message;
  }
  return {
    ports,
    selectedPort: selected,
    autoDetectRaw: auto.stdout,
    summaryRaw: summary,
  };
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
