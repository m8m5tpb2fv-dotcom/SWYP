export function parseLimit(raw: unknown, fallback: number, max: number): number {
  const parsed = typeof raw === "string" ? parseInt(raw, 10) : NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(parsed, max);
}
