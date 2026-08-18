/**
 * Drop-in replacement for the old PrismaClient export.
 *
 * The project now uses Google Sheets as its "database" instead of
 * PostgreSQL. Every controller still does:
 *
 *   const prisma = require("../prisma/client");
 *   prisma.item.findMany(...)
 *
 * so this file keeps that exact same shape — it just builds it on top of
 * the Sheets-backed engine in src/sheets/db.js instead of @prisma/client.
 */

const raw = require("../sheets/sheetsRaw");
const { buildDb } = require("../sheets/db");

const db = buildDb(raw);

module.exports = db;
