// Liveness payload for /api/health. SOP: architecture/link-probes.md
export function health(now) {
  return { ok: true, service: 'my-website', time: now.toISOString() };
}
