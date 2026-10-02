// Mail transport for the owner's Proton address. SOP: architecture/email-setup.md
import nodemailer from 'nodemailer';

import { requireEnv } from './env.js';

export function createMailTransport(env = process.env) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_TOKEN } = requireEnv(
    ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_TOKEN'],
    env,
  );
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    // Port 587 starts unencrypted and upgrades; requireTLS refuses to go on if it cannot.
    secure: false,
    requireTLS: true,
    auth: { user: SMTP_USER, pass: SMTP_TOKEN },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
}
