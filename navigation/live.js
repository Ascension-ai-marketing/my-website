// On the production site, booking answers only when BOOKING_LIVE is "true". Previews always answer.
// SOP: architecture/booking-flow.md
export function bookingIsOpen(env = process.env) {
  return env.VERCEL_ENV !== 'production' || env.BOOKING_LIVE === 'true';
}

// Reads a JSON body of at most maxBytes. Returns null for anything else.
export async function readJsonBody(request, maxBytes = 10_240) {
  const text = await request.text();
  if (Buffer.byteLength(text, 'utf8') > maxBytes) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
