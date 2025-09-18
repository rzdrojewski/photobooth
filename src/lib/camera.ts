import { execFile } from "node:child_process";
import { mkdirSync, readdirSync, renameSync } from "node:fs";
import { dirname, join } from "node:path";

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
  options: { cwd?: string } = {},
): Promise<{ stdout: string; stderr: string }> {
  const debug = process.env.DEBUG_GPHOTO2 === "1";
  if (debug) console.log(`[gphoto2] exec: ${bin} ${args.join(" ")}`);
  return new Promise((resolve, reject) => {
    const child = execFile(
      bin,
      args,
      { timeout, encoding: "utf8", cwd: options.cwd },
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
          return reject(wrapped);
        }
        resolve({ stdout: out, stderr: errOut });
      },
    );
    child.on("error", reject);
  });
}

async function detectPort(
  bin: string,
  timeout: number,
): Promise<string | null> {
  try {
    const { stdout } = await runGphoto(bin, ["--auto-detect"], timeout);
    const match = stdout.match(/usb:\d+,\d+/);
    return match ? match[0] : null;
  } catch {
    return null;
  }
}

export async function getCameraInfo(
  bin?: string,
  port?: string | null,
  timeoutMs?: number,
) {
  const timeout = timeoutMs ?? 15000;
  const exe = bin || process.env.GPHOTO2_BIN || "gphoto2";
  const auto = await runGphoto(exe, ["--auto-detect"], timeout);
  const ports = Array.from(auto.stdout.matchAll(/usb:\d+,\d+/g)).map(
    (m) => m[0],
  );
  const selected = port || process.env.GPHOTO2_PORT || ports[0] || null;
  let summary: string | null = null;
  try {
    if (selected) {
      const res = await runGphoto(
        exe,
        ["--port", selected, "--summary"],
        timeout,
      );
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

async function listFileIndices(
  bin: string,
  baseArgs: string[],
  timeout: number,
): Promise<number[]> {
  const { stdout } = await runGphoto(
    bin,
    [...baseArgs, "--list-files"],
    timeout,
  );
  return Array.from(stdout.matchAll(/^#\s*(\d+)/gm))
    .map((m) => Number(m[1]))
    .filter((n) => Number.isFinite(n));
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
  const indices = await listFileIndices(bin, baseArgs, timeout);
  if (!indices.length) {
    throw new Error("No files found on camera after capture");
  }
  const lastIndex = Math.max(...indices);

  // 4) Download the last file to the desired location
  await runGphoto(
    bin,
    [
      ...baseArgs,
      "--get-file",
      String(lastIndex),
      "--filename",
      outputFile,
      "--force-overwrite",
      "--quiet",
    ],
    timeout,
  );
}

export async function triggerCaptureAndGetIndex(
  options: CaptureOptions = {},
): Promise<number> {
  const bin = options.gphoto2Bin || process.env.GPHOTO2_BIN || "gphoto2";
  const timeout = options.timeoutMs ?? 20000;
  const settleMs = options.settleMs ?? 500;
  const explicitPort = options.port || process.env.GPHOTO2_PORT || null;

  const port = explicitPort || (await detectPort(bin, timeout));
  const baseArgs = port ? ["--port", port] : [];

  const before = await listFileIndices(bin, baseArgs, timeout);
  const previousMax = before.length ? Math.max(...before) : 0;

  await runGphoto(bin, [...baseArgs, "--trigger-capture", "--quiet"], timeout);
  await new Promise((resolve) => setTimeout(resolve, settleMs));

  const after = await listFileIndices(bin, baseArgs, timeout);
  const newIndices = after.filter((idx) => idx > previousMax);
  if (!newIndices.length) {
    throw new Error("No files found on camera after capture");
  }
  return Math.max(...newIndices);
}

export async function triggerCapture(
  options: CaptureOptions = {},
): Promise<void> {
  const bin = options.gphoto2Bin || process.env.GPHOTO2_BIN || "gphoto2";
  const timeout = options.timeoutMs ?? 20000;
  const settleMs = options.settleMs ?? 500;
  const explicitPort = options.port || process.env.GPHOTO2_PORT || null;

  const port = explicitPort || (await detectPort(bin, timeout));
  const baseArgs = port ? ["--port", port] : [];

  await runGphoto(bin, [...baseArgs, "--trigger-capture", "--quiet"], timeout);
  await new Promise((resolve) => setTimeout(resolve, settleMs));
}

export async function getLatestIndices(
  count: number,
  options: CaptureOptions = {},
): Promise<number[]> {
  if (count <= 0) return [];
  const bin = options.gphoto2Bin || process.env.GPHOTO2_BIN || "gphoto2";
  const timeout = options.timeoutMs ?? 20000;
  const explicitPort = options.port || process.env.GPHOTO2_PORT || null;

  const port = explicitPort || (await detectPort(bin, timeout));
  const baseArgs = port ? ["--port", port] : [];
  const allIndices = await listFileIndices(bin, baseArgs, timeout);
  console.log(`[getLatestIndices] found ${allIndices.length} total frames`);
  console.log(`[getLatestIndices] all indices: ${allIndices.join(",")}`);
  const sorted = allIndices.sort((a, b) => a - b);
  return sorted.slice(-count);
}

export async function downloadFramesRange(
  indices: number[],
  destinationDir: string,
  options: CaptureOptions = {},
): Promise<string[]> {
  if (!indices.length) return [];

  const bin = options.gphoto2Bin || process.env.GPHOTO2_BIN || "gphoto2";
  const timeout = options.timeoutMs ?? 20000;
  const explicitPort = options.port || process.env.GPHOTO2_PORT || null;

  ensureDir(destinationDir);

  const port = explicitPort || (await detectPort(bin, timeout));
  const baseArgs = port ? ["--port", port] : [];
  const sorted = Array.from(new Set(indices)).sort((a, b) => a - b);
  const start = sorted[0];
  const end = sorted[sorted.length - 1];
  const rangeSpec = start === end ? String(start) : `${start}-${end}`;

  const beforeFiles = new Set<string>();
  try {
    for (const file of readdirSync(destinationDir)) {
      beforeFiles.add(file);
    }
  } catch {
    // ignore
  }

  console.log(
    `running command : ${[bin, ...baseArgs, `--get-file=${rangeSpec}`, "--filename", join(destinationDir, "frame-%n.%C"), "--force-overwrite", "--quiet"].join(" ")}`,
  );

  await runGphoto(
    bin,
    [
      ...baseArgs,
      `--get-file=${rangeSpec}`,
      "--filename",
      join(destinationDir, "frame-%n.%C"),
      "--force-overwrite",
      "--quiet",
    ],
    timeout,
  );

  const afterFiles = readdirSync(destinationDir);
  const newFiles = afterFiles.filter((file) => !beforeFiles.has(file));

  const results: string[] = [];
  for (let i = 0; i < sorted.length; i += 1) {
    const index = i + 1;
    console.log(`[downloadFramesRange] looking for frame-${index}`);
    const match = newFiles.find((file) => file.startsWith(`frame-${index}`));
    if (!match) {
      throw new Error(`Failed to download frame ${index}`);
    }
    const ext = match.includes(".") ? match.slice(match.lastIndexOf(".")) : "";
    const normalizedExt = ext ? ext.toLowerCase() : "";
    const oldPath = join(destinationDir, match);
    const newName = `frame-${i + 1}${normalizedExt}`;
    const newPath = join(destinationDir, newName);
    if (oldPath !== newPath) {
      renameSync(oldPath, newPath);
    }
    results.push(newPath);
  }

  return results;
}
