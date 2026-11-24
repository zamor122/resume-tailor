/**
 * Constant-time string comparison safe for both Node.js and Edge runtimes.
 * Prevents timing side-channel attacks when comparing shared secrets (CRON_SECRET, ADMIN_SECRET, etc.).
 */
export function timingSafeEqualString(
  provided: string | null | undefined,
  expected: string | null | undefined
): boolean {
  if (typeof provided !== "string" || typeof expected !== "string") {
    return false;
  }

  const encoder = new TextEncoder();
  const a = encoder.encode(provided);
  const b = encoder.encode(expected);

  let diff = a.length ^ b.length;
  for (let i = 0; i < b.length; i++) {
    diff |= (a[i] ?? 0) ^ b[i];
  }
  return diff === 0;
}
