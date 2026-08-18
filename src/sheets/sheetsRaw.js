/**
 * Low-level Google Sheets access. This is the only file that talks to the
 * Google Sheets API directly — everything else (db.js) works against the
 * three functions exported here, so it stays testable without real network
 * access.
 *
 * Required environment variables:
 *   GOOGLE_SHEET_ID            - the spreadsheet ID (from its URL)
 *   GOOGLE_SERVICE_ACCOUNT_KEY - the full service-account JSON key, either
 *                                as a raw JSON string or base64-encoded.
 *                                The service account's email must be shared
 *                                on the target spreadsheet as an Editor.
 */

const { google } = require("googleapis");

let sheetsClientPromise = null;
const ensuredSheets = new Set();

function getCredentials() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_KEY environment variable is not set. " +
      "Paste your Google service account JSON key (or its base64 encoding) into this variable."
    );
  }
  const trimmed = raw.trim();
  const jsonText = trimmed.startsWith("{") ? trimmed : Buffer.from(trimmed, "base64").toString("utf8");
  try {
    return JSON.parse(jsonText);
  } catch (e) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY does not contain valid JSON (checked raw and base64-decoded).");
  }
}

function spreadsheetId() {
  const id = process.env.GOOGLE_SHEET_ID;
  if (!id) {
    throw new Error("GOOGLE_SHEET_ID environment variable is not set.");
  }
  return id;
}

async function getSheets() {
  if (!sheetsClientPromise) {
    const credentials = getCredentials();
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"]
    });
    sheetsClientPromise = auth.getClient().then((client) => google.sheets({ version: "v4", auth: client }));
  }
  return sheetsClientPromise;
}

function colLetter(n) {
  let s = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - m) / 26);
  }
  return s;
}

/**
 * Makes sure a tab named `model` exists and its header row matches
 * `headerFields`. Cheap no-op after the first successful call per process.
 */
async function ensureSheet(model, headerFields) {
  if (ensuredSheets.has(model)) return;

  const sheets = await getSheets();
  const ssId = spreadsheetId();

  const meta = await sheets.spreadsheets.get({ spreadsheetId: ssId });
  const existing = (meta.data.sheets || []).find((s) => s.properties.title === model);

  if (!existing) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: ssId,
      requestBody: { requests: [{ addSheet: { properties: { title: model } } }] }
    });
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId: ssId,
    range: `${model}!A1:${colLetter(headerFields.length)}1`,
    valueInputOption: "RAW",
    requestBody: { values: [headerFields] }
  });

  ensuredSheets.add(model);
}

/** Returns all data rows (everything after the header) as arrays of strings. */
async function readRows(model) {
  const sheets = await getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheetId(),
    range: `${model}!A2:ZZ`
  });
  return res.data.values || [];
}

/** Overwrites the entire data area (below the header) with `rows`. */
async function writeRows(model, rows) {
  const sheets = await getSheets();
  const ssId = spreadsheetId();

  await sheets.spreadsheets.values.clear({
    spreadsheetId: ssId,
    range: `${model}!A2:ZZ`
  });

  if (rows.length === 0) return;

  await sheets.spreadsheets.values.update({
    spreadsheetId: ssId,
    range: `${model}!A2`,
    valueInputOption: "RAW",
    requestBody: { values: rows }
  });
}

module.exports = { ensureSheet, readRows, writeRows };
