let captureQueue: Promise<void> = Promise.resolve();

export async function enqueueCapture<T>(fn: () => Promise<T>): Promise<T> {
  const waitFor = captureQueue.catch(() => {});
  let release!: () => void;
  captureQueue = new Promise<void>((resolve) => {
    release = resolve;
  });
  await waitFor;
  try {
    return await fn();
  } finally {
    release();
  }
}
