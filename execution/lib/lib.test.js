import assert from 'node:assert/strict';
import { test } from 'node:test';

import { health } from '../health.js';
import { requireEnv } from './env.js';
import { secretValueProblem, upsertEnvValue } from './env_file.js';
import { SCOPES, missingScopes } from './google_auth.js';
import { buildLeadSheetRequest, LEAD_SHEET_COLUMNS } from './lead_sheet.js';
import { runLinkChecks } from './link_checks.js';
import { createMailTransport } from './smtp.js';

test('lead sheet header row matches the schema column order', () => {
  assert.deepEqual(LEAD_SHEET_COLUMNS, [
    'booked_at',
    'slot_start',
    'slot_end',
    'name',
    'email',
    'phone',
    'company_or_website',
    'message',
    'event_id',
    'meet_link',
  ]);
  const request = buildLeadSheetRequest();
  assert.equal(request.properties.title, 'Website Leads');
  assert.equal(request.sheets.length, 1);
  assert.equal(request.sheets[0].properties.title, 'Leads');
  const header = request.sheets[0].data[0].rowData[0].values.map((cell) => cell.userEnteredValue.stringValue);
  assert.deepEqual(header, LEAD_SHEET_COLUMNS);
});

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

test('secretValueProblem accepts a token and rejects anything that is not one', () => {
  assert.equal(secretValueProblem('abc123-DEF_456'), null);
  assert.match(secretValueProblem(''), /empty/);
  assert.match(secretValueProblem('two words'), /more than one word/);
  assert.match(secretValueProblem('line1\nline2'), /more than one word/);
  assert.match(secretValueProblem('x'.repeat(513)), /512 characters/);
  assert.match(secretValueProblem('SMTP_TOKEN=abc'), /NAME=value/);
});

test('requireEnv names every missing variable', () => {
  assert.throws(() => requireEnv(['A', 'B', 'C'], { B: 'x' }), /Missing in \.env: A, C/);
  assert.deepEqual(requireEnv(['B'], { B: 'x' }), { B: 'x' });
});

test('missingScopes lists required scopes that were not granted', () => {
  assert.deepEqual(missingScopes('s1 s2', ['s1', 's3']), ['s3']);
  assert.deepEqual(missingScopes('s1 s2', ['s1', 's2']), []);
});

test('the sign-in no longer asks for any Gmail scope', () => {
  assert.equal(Object.values(SCOPES).some((scope) => scope.includes('gmail')), false);
});

test('mail transport uses STARTTLS on the configured port and refuses plain text', () => {
  const transport = createMailTransport({
    SMTP_HOST: 'smtp.example.test',
    SMTP_PORT: '587',
    SMTP_USER: 'owner@example.test',
    SMTP_TOKEN: 'token',
  });
  assert.equal(transport.options.host, 'smtp.example.test');
  assert.equal(transport.options.port, 587);
  assert.equal(transport.options.secure, false);
  assert.equal(transport.options.requireTLS, true);
  transport.close();
  assert.throws(() => createMailTransport({ SMTP_HOST: 'h' }), /Missing in \.env: SMTP_PORT, SMTP_USER, SMTP_TOKEN/);
});

test('runLinkChecks reports every service RED, without throwing, when nothing is configured', async () => {
  const report = await runLinkChecks({});
  assert.equal(report.ok, false);
  assert.deepEqual(Object.keys(report.results), ['calendar', 'sheets', 'email']);
  for (const result of Object.values(report.results)) {
    assert.equal(result.status, 'RED');
    assert.match(result.detail, /Missing in \.env/);
  }
});
