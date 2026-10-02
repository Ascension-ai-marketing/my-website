# SOP: Google credentials setup

## Goal

Give the booking system permission to act as the calendar owner (`zack@ascension-marketing.ca`): read availability, create events, send email, and append rows to the lead sheet.

These steps are done by the owner, signed in to Google as `zack@ascension-marketing.ca`. Claude never types or sees the credentials.

## Why OAuth and not a service account

A service account cannot invite guests to a calendar event without domain-wide delegation. Inviting the visitor is part of the payload. See `memory/findings.md`.

## Steps

### 1. Create a Google Cloud project

1. Open https://console.cloud.google.com/projectcreate
2. Name it `my-website-booking`. Click **Create**, then select the project.

### 2. Turn on the three APIs

Open each link with the project selected and click **Enable**:

- https://console.cloud.google.com/apis/library/calendar-json.googleapis.com
- https://console.cloud.google.com/apis/library/gmail.googleapis.com
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

1. Open https://console.cloud.google.com/auth/clients and click **Create client**.
2. Application type: **Desktop app**. Name: `my-website-local`. Click **Create**.
3. Copy the **Client ID** and **Client secret**.

### 6. Create the lead sheet

1. Signed in as `zack@ascension-marketing.ca`, create a blank Google Sheet named `Website Leads`.
2. Copy its id from the address bar: the long string between `/d/` and `/edit`.

### 7. Fill in `.env`

Open `.env` in the project folder and set these lines (template in `.env.example`):

```
GOOGLE_CLIENT_ID=<from step 5>
GOOGLE_CLIENT_SECRET=<from step 5>
GOOGLE_CALENDAR_ID=zack@ascension-marketing.ca
OWNER_EMAIL=zack@ascension-marketing.ca
LEAD_SHEET_ID=<from step 6>
```

Leave `GOOGLE_REFRESH_TOKEN` out. The next step writes it.

### 8. Sign in once

From the project folder:

```bash
npm run google:auth
```

Open the link it prints, sign in as `zack@ascension-marketing.ca`, and allow all four permissions. The tool writes `GOOGLE_REFRESH_TOKEN` into `.env` and says so.

### 9. Run the probes

```bash
npm run probe:calendar
npm run probe:sheets
npm run probe:gmail
```

Each prints one line starting with `GREEN` or `RED`. The Gmail probe sends you one test email.

## Edge cases

- **"Access blocked: this app's request is invalid"** at sign-in: the client is not a Desktop app client. Recreate it in step 5.
- **A permission checkbox was left unticked** at sign-in: the probe for that service prints `RED` and names the missing scope. Run step 8 again and tick all four.
- **Signed in with the wrong Google account:** the calendar probe prints `RED` with "notFound", because `GOOGLE_CALENDAR_ID` names the owner's calendar by its email address and another account cannot see it. Run step 8 again with the right account.

## Lessons

None yet.
