import assert from 'node:assert/strict';
import { test } from 'node:test';

import { health } from '../health.js';
import { buildRawEmail } from './email.js';
import { upsertEnvValue } from './env_file.js';
import { missingScopes, requireEnv } from './google_auth.js';

test('health reports ok with the given time', () => {
  assert.deepEqual(health(new Date('2026-10-02T12:00:00Z')), {
    ok: true,
    service: 'my-website',
    time: '2026-10-02T12:00:00.000Z',
  });
});

test('upsertEnvValue appends a missing key', () => {
  assert.equal(upsertEnvValue('A=1\n', 'B', '2'), 'A=1\nB=2\n');
  assert.equal(upsertEnvValue('A=1', 'B', '2'), 'A=1\nB=2\n');
  assert.equal(upsertEnvValue('', 'B', '2'), 'B=2\n');
});

test('upsertEnvValue replaces an existing key and keeps the rest', () => {
  assert.equal(upsertEnvValue('A=1\nB=old\nC=3\n', 'B', 'new'), 'A=1\nB=new\nC=3\n');
});

test('upsertEnvValue does not match a key that only shares a prefix', () => {
  assert.equal(upsertEnvValue('B_OTHER=1\n', 'B', '2'), 'B_OTHER=1\nB=2\n');
});

test('requireEnv names every missing variable', () => {
  assert.throws(() => requireEnv(['A', 'B', 'C'], { B: 'x' }), /Missing in \.env: A, C/);
  assert.deepEqual(requireEnv(['B'], { B: 'x' }), { B: 'x' });
});

test('missingScopes lists required scopes that were not granted', () => {
  assert.deepEqual(missingScopes('s1 s2', ['s1', 's3']), ['s3']);
  assert.deepEqual(missingScopes('s1 s2', ['s1', 's2']), []);
});

test('buildRawEmail produces a decodable message with an encoded body', () => {
  const raw = buildRawEmail({ to: 'a@example.com', subject: 'Hello', text: 'Body text' });
  const message = Buffer.from(raw, 'base64url').toString('utf8');
  const [headers, body] = message.split('\r\n\r\n');
  assert.match(headers, /^To: a@example\.com\r\nSubject: Hello\r\n/);
  assert.equal(Buffer.from(body, 'base64').toString('utf8'), 'Body text');
});

test('buildRawEmail encodes a non-ASCII subject', () => {
  const raw = buildRawEmail({ to: 'a@example.com', subject: 'Café ☕', text: 'x' });
  const message = Buffer.from(raw, 'base64url').toString('utf8');
  assert.match(message, /Subject: =\?UTF-8\?B\?/);
  assert.doesNotMatch(message.split('\r\n\r\n')[0], /Café/);
});
