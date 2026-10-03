# SOP: Google credentials setup

## Goal

Give the booking system permission to act as the calendar owner (`zack@ascension-marketing.ca`): read availability, create events, and append rows to the lead sheet. Email is not sent through Google; see `architecture/email-setup.md`.

These steps are done by the owner, signed in to Google as `zack@ascension-marketing.ca`. Claude never types or sees the credentials.

## Current state (2026-10-02)

Steps 1 to 3 are done, in the Google account `zack@ascension-marketing.ca`:

- Project `my-website-booking` (id `my-website-booking-510420`), no organization, no billing account.
- Calendar, Gmail and Sheets APIs enabled.
- Consent screen created: app name `My Website Booking`, audience External.
- **Step 4 is NOT done.** Google keeps the Publish button disabled: "To publish your app, you must complete your configuration on the Branding page." The app is in **Testing**, with `zack@ascension-marketing.ca` added as a test user. Sign-in works in Testing, but **the sign-in expires after 7 days**. See "Before going live" below.

Steps 5 to 8 were done later the same day: the OAuth client exists, `.env` is filled in, the sign-in succeeded with all four scopes, and the lead sheet was created by `npm run setup:sheet` instead of by hand (step 6). Probe results: Calendar and Sheets green, **Gmail red**. See `architecture/link-probes.md`, Lessons.

Two other projects exist in the same account from earlier attempts, "My First Project" and "calander hosting" (both in the organization `zack-org`). They are not used by this system.

## Before going live

The app must not be left in Testing in production, or bookings stop a week after each sign-in. One of these has to happen before Phase T:

- **Publish it.** Fill in the Branding page (home page and privacy policy links on the site's real domain), then Audience, Publish app. Then run step 8 again.
- **Or make it Internal.** Move the project into the organization `zack-org`, then Audience, Make internal. Projects in that organization are attached to the billing account. Then run step 8 again.

## Why OAuth and not a service account

A service account cannot invite guests to a calendar event without domain-wide delegation. Inviting the visitor is part of the payload. See `memory/findings.md`.

## Steps

### 1. Create a Google Cloud project

1. Open https://console.cloud.google.com/projectcreate
2. Name it `my-website-booking`. Click **Create**, then select the project.

### 2. Turn on the APIs

Open each link with the project selected and click **Enable**:

- https://console.cloud.google.com/apis/library/calendar-json.googleapis.com
- (Gmail API: enabled on 2026-10-02 but no longer used.)
- https://console.cloud.google.com/apis/library/sheets.googleapis.com

### 3. Configure the consent screen

1. Open https://console.cloud.google.com/auth/branding and click **Get started**.
2. App name: `My Website Booking`. Support email: your address.
3. **Audience:** choose **Internal** if it is offered. It is offered only when `ascension-marketing.ca` is a Google Workspace domain. Otherwise choose **External**.
4. Contact email: your address. Agree and click **Create**.

### 4. If you chose External: publish the app

An External app left in "Testing" gives a sign-in that expires after 7 days, and bookings would stop working.

1. Open https://console.cloud.google.com/auth/audience
2. Under **Publishing status**, click **Publish app** and confirm.

You do not need to submit the app for verification. It has one user, you. Google will show an "unverified app" warning when you sign in; that is expected.

Skip this step if you chose Internal.

### 5. Create the OAuth client

1. Open https://console.cloud.google.com/auth/clients?project=my-website-booking-510420 and click **Create client**. Check that the account shown top right is `zack@ascension-marketing.ca`.
2. Application type: **Desktop app**. Any name. Click **Create**.
3. Copy the **Client ID** and **Client secret**.

### 6. Create the lead sheet

1. Signed in as `zack@ascension-marketing.ca`, create a blank Google Sheet named `Website Leads`.
2. Copy its id from the address bar: the long string between `/d/` and `/edit`.

### 7. Fill in `.env`

Open `.env` in the project folder. The lines are already there; `GOOGLE_CALENDAR_ID` and `OWNER_EMAIL` are filled in. Paste the three values after the `=` signs:

```
GOOGLE_CLIENT_ID=<from step 5>
GOOGLE_CLIENT_SECRET=<from step 5>
GOOGLE_CALENDAR_ID=primary
OWNER_EMAIL=zack@ascension-marketing.ca
LEAD_SHEET_ID=<from step 6>
```

Leave `GOOGLE_REFRESH_TOKEN` out. The next step writes it.

### 8. Sign in once

The command must run in the project folder, the one that contains `package.json`. From anywhere else, name the folder with `--prefix`:

```bash
npm --prefix "/Users/ascensionmacbook/Ascension/Claude/Website Design/Ascension website" run google:auth
```

Open the link it prints, sign in as `zack@ascension-marketing.ca`, and allow every permission it asks for (three since 2026-10-02: Calendar events, Calendar free/busy, Sheets). The tool writes `GOOGLE_REFRESH_TOKEN` into `.env` and says so.

### 9. Run the probes

```bash
cd "/Users/ascensionmacbook/Ascension/Claude/Website Design/Ascension website"
npm run probe:calendar
npm run probe:sheets
```

Each prints one line starting with `GREEN` or `RED`. Email has its own probe; see `architecture/email-setup.md`.

## Edge cases

- **"Access blocked: this app's request is invalid"** at sign-in: the client is not a Desktop app client. Recreate it in step 5.
- **A permission checkbox was left unticked** at sign-in: the probe for that service prints `RED` and names the missing scope. Run step 8 again and tick every box.
- **Signed in with the wrong Google account:** the calendar probe prints `RED` with `signed in to the calendar "...", expected zack@ascension-marketing.ca`. Run step 8 again with the right account.
- **`.env` lines must be `NAME=value`.** Pasting a value over the name (leaving `value=`) makes the tool report the name as missing.

## Lessons

- **2026-10-02: an External app cannot be published straight after creating the consent screen.** The Publish app button is disabled until the Branding page is complete. Step 4 as written here ("click Publish app") does not work on a fresh project. Workaround for development: add the owner as a test user (Audience, Test users, Add users). The 7-day expiry then applies until the app is published or made Internal.
- **2026-10-02: choosing an organization on the New Project form attaches a billing account.** With `zack-org` selected the form adds a Billing account field with no "none" option. With "No organization" there is no billing, but the Internal audience is unavailable.
- **2026-10-02: check for existing projects before creating one.** The account already had two projects from earlier the same day.

- **2026-10-02: `npm run google:auth` failed with "Could not read package.json".** It was run from `~/Desktop/claude`, the parent folder, which has no `package.json`. The commands in this SOP now use `--prefix` so they work from any folder. The same applies to the probes in step 9.
- **2026-10-02: the sign-in tool needs steps 1 to 7 done first.** With `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` empty it prints `RED google sign-in: Missing in .env: ...` and stops.
