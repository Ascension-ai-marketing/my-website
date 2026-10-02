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

## Results, 2026-10-02

Run on the git-made preview of commit `fca6d0f`, visitor `admin.ascension.marketing@gmail.com` (chosen by the user).

| Step | Result |
| --- | --- |
| Slot list | 200, 160 slots, Oct 5 to Oct 16 |
| Booking | 200 `booked`, slot `2026-10-05T09:00:00-04:00`, Meet link returned |
| Calendar | Event found with the guest and the Meet link |
| Lead sheet | Row 2, with the test name and email in the schema's `name` and `email` columns |
| Emails | Log: both `sent: true` with message ids. The visitor's Gmail inbox held the confirmation from `zack@ascension-marketing.ca` and Google's invitation, both in the inbox, not spam |
| Second booking, same email | 409 `already_booked` |
| Booked slot | No longer offered (159 slots) |
| Server time | `elapsed_ms: 7506` for the booking |
| Cleanup | Event and row removed; `test:find` finds nothing; slot offered again (160); sheet back to the header only; hourly count 0 |

Not checked: the owner notification's arrival in the Proton inbox (Claude cannot read it; Proton accepted the message).

## Lessons

- **2026-10-02: `vercel logs <deployment> --json` returns the log lines newest first.** Filter by content (`"outcome":"booked"`), not by position.
- **2026-10-02: the Vercel files listing does not work for git-made deployments.** To confirm such a preview holds no secrets, check `git ls-files` instead: only committed files are deployed.
