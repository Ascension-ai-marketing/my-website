# SOP: The website

## Goal

One page that tells a local service business what Ascension AI does and lets them book a free discovery call, plus a privacy page. Everything on it is true, and the booking form works with `/api/slots` and `/api/book`.

## Content facts (from the user, 2026-10-02)

- Business name: **Ascension AI**. Tagline, from the user's logo: **"Rise above. Automate beyond."**
- Services, and only these: **Websites and landing pages**, **AI automation**, **SEO and content**.
- Audience: **local service businesses**.
- The call: **Free discovery call**, 30 minutes, on Google Meet. Its purpose: learn about the visitor's business and see if Ascension AI is a fit.
- Contact address: `zack@ascension-marketing.ca`.
- Proof: **none yet**. There is no testimonials, results or client-logos section.
- Address: the vercel.app domain for now.
- Analytics: Vercel Web Analytics.

## Content rules

- Never invent numbers, clients, testimonials, prices, guarantees, awards, years in business or locations.
- Service descriptions say what the service is and what it covers, not what results it will produce.
- Tone: bold and energetic, warm and friendly. Short sentences. Talk to the visitor as "you".
- Times on the site are always labelled Toronto time.

## Look (from the user's logo)

- Near-black background, gold as the main accent, electric blue as the second accent, chrome-white text. The logo's circuit lines are echoed as thin gold and blue lines, sparingly.
- System fonts only, so no font is downloaded from a third party. Bold, tight headings; plain readable body text.
- Text contrast meets WCAG AA. Every interactive element has a visible focus style.
- Works from 320 px wide with no sideways scrolling. The booking form is fully usable on a phone.
- Logo: `public/logo.png`, supplied by the user. Until it exists the header shows the name as a gold wordmark.

## Page structure (`public/index.html`)

1. Header: logo or wordmark, and a "Book a free discovery call" button that jumps to the booking section.
2. Hero: the headline, one paragraph naming the three services and the audience, the main button, the tagline.
3. Services: three cards, one per service.
4. How the call works: three steps (pick a time, talk on Google Meet for 30 minutes, see if it's a fit).
5. Booking: the form (below).
6. Footer: name, tagline, contact email, link to the privacy page.

## Booking form (`public/app.js`)

1. Load `GET /api/slots`. Group slots by Toronto date: day buttons, then time buttons for the chosen day. Label everything "Toronto time".
2. Fields: name, email (required); phone, company or website, message (optional), with the length limits from the Data Schema enforced in the browser too. A hidden `homepage` field, empty, off-screen, `tabindex=-1`, `autocomplete=off`: the bot trap.
3. On submit: disable the button, show "Booking your call…", and `POST /api/book` with the chosen `slot_start`.
4. Answers:
   - `200`: replace the form with a confirmation showing the time, the Meet link, and a note that Google will also send an invitation from `zack@ascension-marketing.ca` (Gmail may label it as from an unknown sender; that is normal for a first invitation).
   - `400`, `409`, `422`, `429`: show the server's `message` next to the button. For `slot_unavailable`, reload the slots.
   - `503` or a network error: "Booking is temporarily unavailable. Please try again in a few minutes."
5. If `/api/slots` answers `404` (booking switched off on the live site) or fails: hide the picker and say "Online booking opens soon. Email zack@ascension-marketing.ca to book your free discovery call." The page must never look broken.

## Privacy page (`public/privacy.html`)

States only what the system actually does: what the form collects, that it goes to the owner's Google Calendar (with the visitor invited), the Google Sheet, and email sent through Proton Mail; that hosting is on Vercel, whose logs record booking outcomes without visitor details; that Vercel Web Analytics counts visits without cookies; and how to ask for access, correction or deletion (email). No promises the system does not keep (no retention periods, no legal claims). The user reviews it at sign-off.

## Analytics

- Vercel Web Analytics, enabled by the owner with `vercel project web-analytics enable` (the CLI requires the owner to confirm).
- The page loads the script with `<script defer src="/_vercel/insights/script.js">`. Until analytics is enabled, that request returns 404 and nothing breaks.

## Local preview (`npm run dev`, `execution/dev_server.js`)

- Serves `public/` on `http://localhost:4321`.
- `GET /api/slots` uses the real, read-only slot list (real calendar, no changes).
- `POST /api/book` is a **dry run**: it runs the real validation and slot rules, then answers with a fake success or the real refusal. It never creates an event, sends an email or writes a row.
- `DEV_BOOKING=off npm run dev` makes `/api/slots` answer 404, to see the "booking opens soon" state.

## Verify

- Screenshots at desktop and phone width of: the page, the slot picker, a refusal, the confirmation, and the "opens soon" state.
- A live booking through the real form on a preview, per `architecture/live-test.md`.

## Lessons

- **2026-10-02: a class that sets `display` overrides the `hidden` attribute.** The form, the "opens soon" panel and the confirmation all showed at once, because `.booking-panel { display: grid }` beat `hidden`. Fix: a global `[hidden] { display: none !important; }`. Any new panel that is shown and hidden with `hidden` relies on that rule.
- **2026-10-02: a screenshot taken right after loading can catch the picker before the slots arrive.** Wait for the slot buttons before judging the layout.
- **2026-10-02: the project folder was moved.** Absolute paths in the SOPs and in the workspace launch config had to be updated. Prefer paths relative to the project root in new documents.
