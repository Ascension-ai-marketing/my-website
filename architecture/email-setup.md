# SOP: Email sending setup (Proton SMTP)

## Goal

Let the booking system send its two emails (confirmation to the visitor, notification to the owner) from `zack@ascension-marketing.ca`, through Proton Mail's SMTP server.

## Why Proton and not Gmail

`zack@ascension-marketing.ca` has no Gmail mailbox; the domain's mail is hosted at Proton Mail. The user chose Proton SMTP on 2026-10-02. It needs no new account and no DNS changes, because the domain's SPF and DKIM records already authorize Proton. Sent messages appear in the owner's Proton Sent folder.

Proton's own description: SMTP is available on paid Proton Mail plans with a custom domain address (https://proton.me/support/smtp-submission).

## Settings

| Name | Value |
| --- | --- |
| `SMTP_HOST` | `smtp.protonmail.ch` |
| `SMTP_PORT` | `587` (STARTTLS) |
| `SMTP_USER` | `zack@ascension-marketing.ca` |
| `SMTP_TOKEN` | generated in Proton, secret |

The first three are already in `.env`.

## Steps (done by the owner)

1. Sign in to Proton Mail in a browser as `zack@ascension-marketing.ca`.
2. Open **Settings → All settings → IMAP/SMTP → SMTP tokens** and click **Generate token**.
3. Token name: `my-website`. Email address: `zack@ascension-marketing.ca`. Click **Generate** and enter the Proton account password when asked.
4. Click the copy button next to the **SMTP token**. Proton shows it only once.
5. With the token still on the clipboard, run this from any folder. It saves the clipboard into `.env` without showing it:

```bash
npm --prefix "/Users/ascensionmacbook/Ascension/Claude/Website Design/Ascension website" run env:paste -- SMTP_TOKEN
```

6. Run the probe. It sends one test email from the owner to the owner:

```bash
npm --prefix "/Users/ascensionmacbook/Ascension/Claude/Website Design/Ascension website" run probe:email
```

## Rules

- Never type the Proton account password or mailbox password into `.env`. Only an SMTP token works, and only a token belongs there.
- One token per use. This token is for this website only, so it can be deleted in Proton without affecting anything else.
- Port 587 with STARTTLS only. The transport refuses to send over an unencrypted connection.

## Edge cases

- **`535` authentication failed:** wrong token, deleted token, or a token generated for a different address. Generate a new one and repeat steps 4 to 6.
- **"SMTP tokens" is missing from Proton's settings:** the Proton plan does not include SMTP submission. Stop and report; the fallback is an email service such as Resend.
- **The clipboard held something else when step 5 ran:** the probe fails with `535`. Copy the token again (generate a new one if the Proton popup is closed) and repeat step 5.

## Verified facts

- 2026-10-02: a Vercel function can open a connection to `smtp.protonmail.ch:587` and receives the `220` greeting (tested on a preview deployment).

## Rotating the token

Do it in this order so email never stops working:

1. Generate a new token in Proton and copy it.
2. `npm run env:paste -- SMTP_TOKEN`
3. `npm run probe:email` (sends one test email to the owner)
4. `npm run vercel:env -- SMTP_TOKEN`, then deploy (any push to `main`) so production picks it up
5. Delete the old token in Proton.

## Lessons

- **2026-10-02: the SMTP token was posted in the chat.** Anything pasted into a chat is stored with the conversation, so the token was rotated using the steps above. Secrets go from Proton to the clipboard to `npm run env:paste` only.
