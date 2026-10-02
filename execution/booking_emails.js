// The visitor confirmation and the owner notification, sent through Proton SMTP.
// SOP: architecture/booking-emails.md
import { RULES } from './booking_rules.js';
import { requireEnv } from './lib/env.js';
import { createMailTransport } from './lib/smtp.js';

const SEND_ATTEMPTS = 2;

// For example "Tuesday, October 6, 2026 at 2:00 p.m."
export function formatWhen(date, timeZone = RULES.timezone) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

const MEET_FALLBACK = 'The Google Meet link will be in your calendar invitation.';

export function buildVisitorEmail(booking, event, ownerEmail) {
  const when = formatWhen(booking.slotStart);
  const lines = [
    `Hi ${booking.name},`,
    '',
    `Your call is booked for ${when} (Toronto time).`,
    '',
    event.meetLink ? `Join with Google Meet: ${event.meetLink}` : MEET_FALLBACK,
  ];
  if (RULES.sendCalendarInvitation) lines.push('You will also get a calendar invitation from Google.');
  lines.push('', 'Need a different time? Just reply to this email.', '', 'See you soon!');
  return {
    to: booking.email,
    replyTo: ownerEmail,
    subject: `Your call is booked: ${when} (Toronto time)`,
    text: lines.join('\n'),
  };
}

export function buildOwnerEmail(booking, event, ownerEmail) {
  const when = formatWhen(booking.slotStart);
  return {
    to: ownerEmail,
    replyTo: booking.email,
    subject: `New booking: ${booking.name}, ${when}`,
    text: [
      `New call booked through the website for ${when} (Toronto time).`,
      '',
      `Name: ${booking.name}`,
      `Email: ${booking.email}`,
      `Phone: ${booking.phone || '-'}`,
      `Company or website: ${booking.company_or_website || '-'}`,
      '',
      'Message:',
      booking.message || '-',
      '',
      `Google Meet: ${event.meetLink ?? 'not created'}`,
      `Calendar event: ${event.htmlLink ?? '-'}`,
      '',
      'Reply to this email to answer the visitor directly.',
    ].join('\n'),
  };
}

async function sendWithRetry(transport, message) {
  let lastError;
  for (let attempt = 0; attempt < SEND_ATTEMPTS; attempt += 1) {
    try {
      const info = await transport.sendMail(message);
      return { sent: true, message_id: info.messageId };
    } catch (error) {
      lastError = error;
    }
  }
  return { sent: false, message_id: null, error: lastError.message };
}

// Sends both emails. Never throws for a failed send; each result says { sent, message_id }.
export async function sendBookingEmails(booking, event, { env = process.env, createTransport = createMailTransport } = {}) {
  const { OWNER_EMAIL, SMTP_USER } = requireEnv(['OWNER_EMAIL', 'SMTP_USER'], env);
  const transport = createTransport(env);
  try {
    return {
      visitor_confirmation: await sendWithRetry(transport, {
        from: SMTP_USER,
        ...buildVisitorEmail(booking, event, OWNER_EMAIL),
      }),
      owner_notification: await sendWithRetry(transport, {
        from: SMTP_USER,
        ...buildOwnerEmail(booking, event, OWNER_EMAIL),
      }),
    };
  } finally {
    transport.close();
  }
}
