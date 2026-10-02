# SOP: Live end-to-end test of booking

## Goal

Prove the whole booking chain against the real services: slot list, booking, calendar event with Meet link and invitation, both emails, lead row, and the per-email limit. Then remove every trace of the test.

Approved by the user on 2026-10-02 ("Yes, run it").

## Inputs

- A preview deployment made by `git push` (contains only committed files).
- `TEST_EMAIL`: the visitor address for the test, agreed with the user before the run. It must not be `zack@ascension-marketing.ca`: Google treats the organizer as the guest and sends no invitation, so that path would go untested.
- Test name `Live Test (delete me)` and message `Automated end-to-end test`, so the test is recognisable everywhere it lands.

## Steps

1. `vercel curl /api/slots --deployment <preview>`: expect 200 and a non-empty list. Take the first slot.
2. `vercel curl /api/book --deployment <preview> -- -X POST -H 'content-type: application/json' -d '<body>'`: expect 200, `status: booked`, a `meet_link`.
3. Check each landing point:
   - Calendar: `npm run test:find -- <TEST_EMAIL>` lists the booking event with its Meet link and guest.
   - Lead sheet: the same command shows the matching row.
   - Emails: the server log line (`vercel logs`) shows both `sent: true` with message ids. If the test address is a mailbox Claude can read, confirm the confirmation and the invitation arrived and where (inbox or spam).
4. Book again with the same email and another slot: expect 409 `already_booked`.
5. Clean up: `npm run test:cleanup -- <TEST_EMAIL>` deletes the test event(s) without notifying the guest, and deletes the test row(s) from the sheet.
6. Verify the cleanup: `npm run test:find -- <TEST_EMAIL>` finds nothing, and `/api/slots` offers the slot again.

## Tool

`execution/test_booking_cleanup.js`:

- `find`: lists upcoming booking events (`source=my-website`) whose guest is the email, and lead rows whose email column is the email. Prints ids, times, Meet links and row numbers; prints no other visitor data.
- `cleanup`: deletes exactly those events (`sendUpdates=none`) and those rows (bottom-up, with a `deleteDimension` request on the `Leads` tab). Refuses to touch an event or row whose name is not `Live Test (delete me)`, so it can never remove a real booking.

## Lessons

None yet.
