type Hit = { count: number; first: number };
const hits = new Map<string, Hit>();

export function rateLimitByIp(ip: string, windowMs: number, limit: number) {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry) {
    hits.set(ip, { count: 1, first: now });
    return { allowed: true, remaining: limit - 1 };
  }
  if (now - entry.first > windowMs) {
    hits.set(ip, { count: 1, first: now });
    return { allowed: true, remaining: limit - 1 };
  }
  entry.count++;
  if (entry.count > limit) {
    return { allowed: false, remaining: 0 };
  }
  return { allowed: true, remaining: limit - entry.count };
}

