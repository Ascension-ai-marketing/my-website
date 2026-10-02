// Probe: send one test email from the owner to the owner.
// gmail.send permits nothing but sending, so a real send is the only possible probe.
// SOP: architecture/link-probes.md
import { buildRawEmail } from './lib/email.js';
import { SCOPES, getAccessToken, requireEnv } from './lib/google_auth.js';
import { googleJson, runProbe } from './lib/probe.js';

await runProbe('gmail', async () => {
  const { OWNER_EMAIL } = requireEnv(['OWNER_EMAIL']);
  const token = await getAccessToken([SCOPES.gmailSend]);

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      raw: buildRawEmail({
        to: OWNER_EMAIL,
        subject: '[probe] my-website Gmail link check',
        text: 'This is a connection test from the my-website booking system. No action needed.',
      }),
    }),
  });
  const body = await googleJson(res);
  return `test email sent to ${OWNER_EMAIL}, message id ${body.id}`;
});
