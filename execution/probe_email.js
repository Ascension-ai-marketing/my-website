// Probe: sign in to Proton's SMTP server and send one test email from the owner to the owner.
// SOP: architecture/link-probes.md, architecture/email-setup.md
import { requireEnv } from './lib/env.js';
import { runProbe } from './lib/probe.js';
import { createMailTransport } from './lib/smtp.js';

await runProbe('email', async () => {
  const { OWNER_EMAIL, SMTP_USER } = requireEnv(['OWNER_EMAIL', 'SMTP_USER']);
  const transport = createMailTransport();
  try {
    const info = await transport.sendMail({
      from: SMTP_USER,
      to: OWNER_EMAIL,
      subject: '[probe] my-website email link check',
      text: 'This is a connection test from the my-website booking system. No action needed.',
    });
    if (!info.accepted.includes(OWNER_EMAIL)) {
      throw new Error(`Proton did not accept the message for ${OWNER_EMAIL}: ${info.response}`);
    }
    return `test email sent from ${SMTP_USER} to ${OWNER_EMAIL}, server said "${info.response}"`;
  } finally {
    transport.close();
  }
});
