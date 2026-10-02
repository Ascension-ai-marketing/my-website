// Builds the base64url "raw" message the Gmail API expects for a plain-text email.
// Gmail fills in the From header with the signed-in account.
export function buildRawEmail({ to, subject, text }) {
  const message = [
    `To: ${to}`,
    `Subject: ${encodeHeader(subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(text, 'utf8').toString('base64'),
  ].join('\r\n');
  return Buffer.from(message, 'utf8').toString('base64url');
}

// RFC 2047 encoding, so non-ASCII subjects survive.
function encodeHeader(value) {
  return /^[\x20-\x7e]*$/.test(value)
    ? value
    : `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`;
}
