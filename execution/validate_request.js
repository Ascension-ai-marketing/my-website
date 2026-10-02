// Checks a booking request's fields and the bot trap. Pure. SOP: architecture/booking-validation.md
import { parseIsoWithOffset } from './lib/time.js';

const CONTROL = /[\u0000-\u001f\u007f]/;
const CONTROL_EXCEPT_NEWLINE = /[\u0000-\u0009\u000b-\u001f\u007f]/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^[0-9+().\- ]*$/;

function invalid(message) {
  return { ok: false, reason: 'invalid_input', message };
}

// Returns { ok: true, booking } or { ok: false, reason, message? }.
export function validateBookingRequest(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return invalid('The booking request was not understood. Please reload the page and try again.');
  }

  // A trimmed string, '' for a missing value, or null for a value that is not text.
  const text = (key) => {
    const value = body[key];
    if (value === undefined || value === null) return '';
    return typeof value === 'string' ? value.trim() : null;
  };

  const trap = text('homepage');
  if (trap !== '') return { ok: false, reason: 'spam' };

  const slotStart = parseIsoWithOffset(text('slot_start'));
  if (!slotStart) return invalid('Please pick a time from the list.');

  const name = text('name');
  if (!name || name.length > 100 || CONTROL.test(name)) {
    return invalid('Please enter your name (up to 100 characters).');
  }

  const email = text('email')?.toLowerCase();
  if (!email || email.length > 254 || CONTROL.test(email) || !EMAIL.test(email)) {
    return invalid('Please enter a valid email address.');
  }

  const phone = text('phone');
  if (phone === null || phone.length > 40 || !PHONE.test(phone)) {
    return invalid('Please enter a phone number using only digits, spaces and + ( ) - .');
  }

  const company = text('company_or_website');
  if (company === null || company.length > 200 || CONTROL.test(company)) {
    return invalid('Please keep the company or website under 200 characters.');
  }

  const message = text('message')?.replace(/\r\n?/g, '\n');
  if (message === null || message === undefined || message.length > 1000 || CONTROL_EXCEPT_NEWLINE.test(message)) {
    return invalid('Please keep your message under 1000 characters.');
  }

  return {
    ok: true,
    booking: { slotStart, name, email, phone, company_or_website: company, message },
  };
}
