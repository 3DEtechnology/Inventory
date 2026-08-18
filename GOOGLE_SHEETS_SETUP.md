# Using Google Sheets as the database

This backend no longer uses PostgreSQL/Prisma. It reads and writes to a
Google Sheet instead, through the Google Sheets API. No code changes are
needed elsewhere — every controller still calls `prisma.item.findMany(...)`
etc.; `src/prisma/client.js` now points that same interface at Google Sheets.

## 1. Create a Google Cloud service account

1. Go to https://console.cloud.google.com/ and create (or pick) a project.
2. **APIs & Services > Library** → enable **Google Sheets API**.
3. **APIs & Services > Credentials** → **Create Credentials** → **Service account**.
4. Open the new service account → **Keys** → **Add Key** → **Create new key** → JSON.
   This downloads a `.json` file — keep it secret, it's a password.

## 2. Create the spreadsheet

1. Create a new Google Sheet (any name, e.g. "Inventory DB").
2. Click **Share**, and share it with the service account's email address
   (looks like `something@your-project.iam.gserviceaccount.com`, found in
   the downloaded JSON as `client_email`). Give it **Editor** access.
3. Copy the spreadsheet ID from its URL:
   `https://docs.google.com/spreadsheets/d/`**`THIS_PART`**`/edit`

You don't need to create tabs or headers yourself — the app creates a tab
per data type (`item`, `vendor`, `pricehistory`, `purchase`,
`stocktransaction`, `user`) and writes the header row automatically the
first time it's used.

## 3. Set environment variables

Locally, copy `.env.example` to `.env` and fill in:

```
GOOGLE_SHEET_ID="the id you copied above"
GOOGLE_SERVICE_ACCOUNT_KEY='paste the full contents of the downloaded JSON key here, on one line'
JWT_SECRET="pick any long random string"
```

On Render: **Environment** tab of your service → add the same two (or
three) variables. `GOOGLE_SERVICE_ACCOUNT_KEY` can be pasted as-is (raw
JSON) or, if your host is picky about newlines in the `private_key` field,
base64-encode the whole JSON file first (`base64 -w0 key.json`) and paste
that instead — the app detects and decodes it automatically.

You can now delete `DATABASE_URL` from Render's environment — it's no
longer used.

## 4. Seed an admin user

```
npm run seed
```

This creates `admin@example.com` / `Admin@123` in the `user` tab (skips if
it already exists). Change the password after first login, or run:

```
npm run reset-admin-password
```

## 5. Run it

```
npm install
npm start
```

## What changed, technically

- `prisma/` (schema, migrations, old seed scripts) removed.
- `src/sheets/schemas.js` — field list & types per "table" (sheet tab), plus
  the relations (`item.vendor`, `stocktransaction.item`, etc.) used by
  `include: {...}` in the controllers.
- `src/sheets/db.js` — a small query engine that implements the subset of
  the Prisma Client API this project actually uses: `findMany`,
  `findUnique`, `findFirst`, `create`, `update`, `delete`, `deleteMany`,
  `count`, and `$transaction` (run together, see caveat below), each
  supporting the `where` / `orderBy` / `include` / `take` shapes used in the
  controllers.
- `src/sheets/sheetsRaw.js` — the only file that actually calls the Google
  Sheets API (auth, ensuring tabs/headers exist, reading/writing rows).
- `src/prisma/client.js` — now builds and exports the Sheets-backed engine
  instead of a `PrismaClient`, so every controller's
  `require("../prisma/client")` keeps working unchanged.
- `test/db.test.js` — exercises the query engine against an in-memory fake
  adapter (no real Google credentials needed) — run with `npm test`.

## Trade-offs to know about

Google Sheets is not a real database, and this is a thin compatibility
layer, not a distributed one:

- **No real transactions.** `$transaction([...])` just waits for all the
  calls; if one fails partway, earlier writes are not rolled back. The one
  place this project uses it (deleting an item and its related rows) is low
  risk, but be aware of it if you add more `$transaction` calls elsewhere.
- **Single-process locking only.** Writes to the same sheet are serialized
  in-process to avoid two requests computing the same next `id`, but that
  only protects a single running server instance. If you ever scale to
  multiple instances, concurrent writes can race.
- **Every write rewrites the whole tab.** Simple and safe, but slower as
  data grows, and subject to Google Sheets API quotas (per-minute request
  limits) under heavy traffic — fine for a small internal inventory tool,
  not for high-volume usage.
- **No enforced unique constraints or foreign keys.** The old `@unique` on
  `itemCode`/`vendorCode`/`email` and the FK relations are no longer
  enforced by the "database" itself — only by whatever checks the
  controllers happen to do in application code.

If any of that becomes a real problem later, the cleanest fix is usually
switching to a free-tier hosted Postgres (e.g. Supabase, Neon) rather than
pushing Sheets further — happy to help with that if it comes up.
