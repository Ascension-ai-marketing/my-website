// One-time Google sign-in for the calendar owner. Writes GOOGLE_REFRESH_TOKEN to .env.
// The token is never printed. SOP: architecture/google-setup.md
import { createHash, randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';

import { upsertEnvValue } from './lib/env_file.js';
import { SCOPES, TOKEN_URL, requireEnv } from './lib/google_auth.js';

const ENV_PATH = '.env';
const TIMEOUT_MS = 5 * 60 * 1000;

let credentials;
try {
  credentials = requireEnv(['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET']);
} catch (error) {
  console.log(`RED google sign-in: ${error.message}`);
  process.exit(1);
}
const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = credentials;

const state = randomBytes(16).toString('hex');
const codeVerifier = randomBytes(32).toString('base64url');
const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');

const server = createServer();
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const redirectUri = `http://127.0.0.1:${server.address().port}`;

const consentUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
consentUrl.search = new URLSearchParams({
  client_id: GOOGLE_CLIENT_ID,
  redirect_uri: redirectUri,
  response_type: 'code',
  scope: Object.values(SCOPES).join(' '),
  access_type: 'offline',
  // Google only returns a refresh token on consent, so always ask for it.
  prompt: 'consent',
  state,
  code_challenge: codeChallenge,
  code_challenge_method: 'S256',
}).toString();

console.log('Open this link, sign in as the calendar owner, and allow every permission:\n');
console.log(consentUrl.toString());
console.log('\nWaiting for the sign-in to finish...');

const timeout = setTimeout(() => finish(new Error('timed out after 5 minutes')), TIMEOUT_MS);

server.on('request', async (req, res) => {
  const url = new URL(req.url, redirectUri);
  if (url.pathname !== '/') {
    res.writeHead(404).end();
    return;
  }
  // A request without our state is not the sign-in coming back. Reject it and keep waiting.
  if (url.searchParams.get('state') !== state) {
    res.writeHead(400, { 'content-type': 'text/plain' }).end('Sign-in failed: state mismatch');
    return;
  }
  try {
    if (url.searchParams.has('error')) throw new Error(`Google returned: ${url.searchParams.get('error')}`);
    await storeRefreshToken(url.searchParams.get('code'));
    res.writeHead(200, { 'content-type': 'text/plain' }).end('Signed in. You can close this tab.');
    finish();
  } catch (error) {
    res.writeHead(400, { 'content-type': 'text/plain' }).end(`Sign-in failed: ${error.message}`);
    finish(error);
  }
});

async function storeRefreshToken(code) {
  const tokenRes = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      code,
      code_verifier: codeVerifier,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }),
  });
  const body = await tokenRes.json();
  if (!tokenRes.ok) throw new Error(`${body.error} ${body.error_description ?? ''}`.trim());
  if (!body.refresh_token) throw new Error('Google returned no refresh token');

  const envText = await readFile(ENV_PATH, 'utf8');
  await writeFile(ENV_PATH, upsertEnvValue(envText, 'GOOGLE_REFRESH_TOKEN', body.refresh_token));
}

function finish(error) {
  clearTimeout(timeout);
  server.close();
  server.closeAllConnections();
  if (error) {
    console.log(`RED google sign-in: ${error.message}`);
    process.exitCode = 1;
  } else {
    console.log('GREEN google sign-in: GOOGLE_REFRESH_TOKEN written to .env');
  }
}
