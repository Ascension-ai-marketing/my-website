// Google OAuth for the calendar owner. SOP: architecture/link-probes.md

export const SCOPES = {
  calendarEvents: 'https://www.googleapis.com/auth/calendar.events',
  calendarFreeBusy: 'https://www.googleapis.com/auth/calendar.freebusy',
  gmailSend: 'https://www.googleapis.com/auth/gmail.send',
  sheets: 'https://www.googleapis.com/auth/spreadsheets',
};

export const TOKEN_URL = 'https://oauth2.googleapis.com/token';

// Returns the named values from env, or throws naming every one that is missing.
export function requireEnv(names, env = process.env) {
  const missing = names.filter((name) => !env[name]);
  if (missing.length > 0) {
    throw new Error(`Missing in .env: ${missing.join(', ')}`);
  }
  return Object.fromEntries(names.map((name) => [name, env[name]]));
}

// Exchanges the stored refresh token for a short-lived access token.
// Throws if the token does not carry every scope in requiredScopes.
export async function getAccessToken(requiredScopes = [], env = process.env) {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN } = requireEnv(
    ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN'],
    env,
  );

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

  // Google normally echoes the granted scopes; if it does not, the API call itself reports a gap.
  const missing = typeof body.scope === 'string' ? missingScopes(body.scope, requiredScopes) : [];
  if (missing.length > 0) {
    throw new Error(`Sign-in is missing scope: ${missing.join(', ')}. Run "npm run google:auth" again.`);
  }
  return body.access_token;
}

// grantedScope is Google's space-separated scope string.
export function missingScopes(grantedScope, requiredScopes) {
  const granted = new Set((grantedScope ?? '').split(' '));
  return requiredScopes.filter((scope) => !granted.has(scope));
}
