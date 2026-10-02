// The visitor confirmation and the owner notification, sent through Proton SMTP.
// Each has a plain-text and an HTML version. SOP: architecture/booking-emails.md
import { RULES } from './booking_rules.js';
import { requireEnv } from './lib/env.js';
import { createMailTransport } from './lib/smtp.js';

const SEND_ATTEMPTS = 2;
const BRAND = 'Ascension AI';
const TAGLINE = 'Rise above. Automate beyond.';
const CALL_NAME = 'Free discovery call';

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

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// Visitor text inside HTML: escaped, line breaks kept.
function htmlText(value) {
  return escapeHtml(value).replaceAll('\n', '<br>');
}

// Only links we created ourselves (Google Meet, Google Calendar) are ever put in an href.
function safeLink(url) {
  return typeof url === 'string' && /^https:\/\/(meet|calendar|www)\.google\.com\//.test(url) ? url : null;
}

function button(url, label) {
  return `<a href="${escapeHtml(url)}" style="display:inline-block;background:#e0a92e;color:#0b0b0f;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:8px">${escapeHtml(label)}</a>`;
}

// One light card with a black header bar, inline styles only.
function layout(bodyHtml) {
  return `<!doctype html>
<html lang="en"><body style="margin:0;padding:24px 12px;background:#f3f1ec;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a1f;line-height:1.55">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden">
<tr><td style="background:#0b0b0f;padding:20px 28px;border-bottom:3px solid #e0a92e">
<span style="color:#e0a92e;font-size:20px;font-weight:800;letter-spacing:3px">ASCENSION <span style="color:#38bdf8">AI</span></span>
</td></tr>
<tr><td style="padding:28px">${bodyHtml}</td></tr>
<tr><td style="padding:16px 28px;background:#faf8f4;color:#6b6b74;font-size:13px">${escapeHtml(BRAND)} &middot; ${escapeHtml(TAGLINE)}</td></tr>
</table></td></tr></table></body></html>`;
}

const SHORT_WHEN = (date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: RULES.timezone, weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date);

export function buildVisitorEmail(booking, event, ownerEmail) {
  const when = formatWhen(booking.slotStart);
  const meet = safeLink(event.meetLink);
  const invitationNote = RULES.sendCalendarInvitation
    ? `Google will also send you a calendar invitation from ${ownerEmail}. Accept it to add the call to your calendar. If Gmail says it's from an unknown sender, that's normal for a first invitation.`
    : null;

  const text = [
    `Hi ${booking.name},`,
    '',
    `You're booked! Your ${CALL_NAME.toLowerCase()} with ${BRAND} is set for:`,
    '',
    `${when} (Toronto time)`,
    '30 minutes on Google Meet',
    '',
    meet ? `Join Google Meet: ${meet}` : 'The Google Meet link will be in your calendar invitation.',
    ...(invitationNote ? ['', invitationNote] : []),
    '',
    'Need a different time? Just reply to this email.',
    '',
    'Talk soon,',
    BRAND,
    TAGLINE,
  ].join('\n');

  const html = layout(`
<p style="margin:0 0 16px">Hi ${htmlText(booking.name)},</p>
<p style="margin:0 0 20px;font-size:20px;font-weight:800">You're booked!</p>
<p style="margin:0 0 6px">Your ${escapeHtml(CALL_NAME.toLowerCase())} with ${escapeHtml(BRAND)} is set for:</p>
<p style="margin:0 0 22px;padding:14px 16px;background:#faf8f4;border-left:4px solid #e0a92e;border-radius:6px">
<strong>${escapeHtml(when)}</strong> (Toronto time)<br>30 minutes on Google Meet</p>
<p style="margin:0 0 22px">${meet ? button(meet, 'Join Google Meet') : 'The Google Meet link will be in your calendar invitation.'}</p>
${invitationNote ? `<p style="margin:0 0 16px;color:#4a4a52;font-size:14px">${escapeHtml(invitationNote)}</p>` : ''}
<p style="margin:0 0 16px">Need a different time? Just reply to this email.</p>
<p style="margin:0">Talk soon,<br><strong>${escapeHtml(BRAND)}</strong></p>`);

  return {
    to: booking.email,
    replyTo: ownerEmail,
    subject: `You're booked: ${CALL_NAME}, ${SHORT_WHEN(booking.slotStart)} (Toronto time)`,
    text,
    html,
  };
}

export function buildOwnerEmail(booking, event, ownerEmail) {
  const when = formatWhen(booking.slotStart);
  const meet = safeLink(event.meetLink);
  const calendarLink = safeLink(event.htmlLink);
  const fields = [
    ['Name', booking.name],
    ['Email', booking.email],
    ['Phone', booking.phone || '-'],
    ['Company or website', booking.company_or_website || '-'],
  ];

  const text = [
    `New ${CALL_NAME.toLowerCase()} booked through the website for ${when} (Toronto time).`,
    '',
    ...fields.map(([label, value]) => `${label}: ${value}`),
    '',
    'Message:',
    booking.message || '-',
    '',
    `Google Meet: ${meet ?? 'not created'}`,
    `Calendar event: ${calendarLink ?? '-'}`,
    '',
    `Reply to this email to answer ${booking.name} directly.`,
  ].join('\n');

  const rows = fields
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#6b6b74;white-space:nowrap;vertical-align:top">${escapeHtml(label)}</td><td style="padding:6px 0">${htmlText(value)}</td></tr>`,
    )
    .join('');
  const html = layout(`
<p style="margin:0 0 6px;font-size:20px;font-weight:800">New ${escapeHtml(CALL_NAME.toLowerCase())}</p>
<p style="margin:0 0 20px"><strong>${escapeHtml(when)}</strong> (Toronto time)</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 18px">${rows}</table>
<p style="margin:0 0 6px;color:#6b6b74">Message</p>
<p style="margin:0 0 22px;padding:12px 14px;background:#faf8f4;border-radius:6px">${htmlText(booking.message || '-')}</p>
<p style="margin:0 0 22px">${meet ? button(meet, 'Join Google Meet') : 'No Meet link was created.'}
${calendarLink ? `&nbsp; <a href="${escapeHtml(calendarLink)}" style="color:#0b6fa4">Open in Google Calendar</a>` : ''}</p>
<p style="margin:0;color:#4a4a52;font-size:14px">Reply to this email to answer ${htmlText(booking.name)} directly.</p>`);

  return {
    to: ownerEmail,
    replyTo: booking.email,
    subject: `New discovery call: ${booking.name}, ${SHORT_WHEN(booking.slotStart)}`,
    text,
    html,
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

// Sends both emails at the same time. Never throws for a failed send; each result says { sent, message_id }.
export async function sendBookingEmails(booking, event, { env = process.env, createTransport = createMailTransport } = {}) {
  const { OWNER_EMAIL, SMTP_USER } = requireEnv(['OWNER_EMAIL', 'SMTP_USER'], env);
  const from = { name: BRAND, address: SMTP_USER };
  const transport = createTransport(env);
  try {
    const [visitor_confirmation, owner_notification] = await Promise.all([
      sendWithRetry(transport, { from, ...buildVisitorEmail(booking, event, OWNER_EMAIL) }),
      sendWithRetry(transport, { from, ...buildOwnerEmail(booking, event, OWNER_EMAIL) }),
    ]);
    return { visitor_confirmation, owner_notification };
  } finally {
    transport.close();
  }
}
