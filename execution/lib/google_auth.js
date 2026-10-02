// Google OAuth for the calendar owner. SOP: architecture/link-probes.md
import { requireEnv } from './env.js';

export const SCOPES = {
  calendarEvents: 'https://www.googleapis.com/auth/calendar.events',
  calendarFreeBusy: 'https://www.googleapis.com/auth/calendar.freebusy',
  sheets: 'https://www.googleapis.com/auth/spreadsheets',
};

export const TOKEN_URL = 'https://oauth2.googleapis.com/token';

// The last access token, reused until a minute before it expires (one booking makes several calls).
let cached = null;

export function clearTokenCache() {
  cached = null;
}

// Exchanges the stored refresh token for a short-lived access token.
// Throws if the token does not carry every scope in requiredScopes.
export async function getAccessToken(requiredScopes = [], env = process.env) {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN } = requireEnv(
    ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN'],
    env,
  );
  if (!cached || cached.refreshToken !== GOOGLE_REFRESH_TOKEN || Date.now() > cached.expiresAt - 60_000) {
    cached = await refreshAccessToken(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN);
  }

  // Google normally echoes the granted scopes; if it does not, the API call itself reports a gap.
  const missing = typeof cached.scope === 'string' ? missingScopes(cached.scope, requiredScopes) : [];
  if (missing.length > 0) {
    throw new Error(`Sign-in is missing scope: ${missing.join(', ')}. Run "npm run google:auth" again.`);
  }
  return cached.token;
}

async function refreshAccessToken(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: GOOGLE_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(
      `Google token refresh failed (${res.status}): ${body.error} ${body.error_description ?? ''}`.trim(),
    );
  }
  return {
    refreshToken: GOOGLE_REFRESH_TOKEN,
    token: body.access_token,
    scope: body.scope,
    expiresAt: Date.now() + (body.expires_in ?? 0) * 1000,
  };
}

// grantedScope is Google's space-separated scope string.
export function missingScopes(grantedScope, requiredScopes) {
  const granted = new Set((grantedScope ?? '').split(' '));
  return requiredScopes.filter((scope) => !granted.has(scope));
}

// Throws with Google's own error message when an API call fails.
export async function googleJson(res) {
  const body = await res.json();
  if (!res.ok) {
    const reason = body.error?.message ?? JSON.stringify(body);
    throw new Error(`${res.status} ${reason}`);
  }
  return body;
}
