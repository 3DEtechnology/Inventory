/**
 * A small Prisma-compatible query engine backed by Google Sheets.
 *
 * It implements exactly the subset of the Prisma Client API this project
 * actually uses (findMany/findUnique/findFirst/create/update/delete/
 * deleteMany/count/$transaction, with where/orderBy/include/take), so the
 * rest of the codebase (controllers, seed scripts, etc.) doesn't need to
 * change — they still do `const prisma = require("../prisma/client")` and
 * call `prisma.item.findMany(...)` etc.
 *
 * The actual reading/writing of spreadsheet cells is delegated to a `raw`
 * adapter (see sheetsRaw.js) so this file can be unit-tested with an
 * in-memory fake adapter.
 */

const { models: SCHEMAS, relations: RELATIONS } = require("./schemas");

function serializeValue(val, type) {
  if (val === undefined || val === null || val === "") return "";
  switch (type) {
    case "date": {
      const d = val instanceof Date ? val : new Date(val);
      return isNaN(d.getTime()) ? "" : d.toISOString();
    }
    case "bool":
      return val ? "TRUE" : "FALSE";
    case "int":
      return Number.isFinite(Number(val)) ? String(Math.trunc(Number(val))) : "";
    case "float":
      return Number.isFinite(Number(val)) ? String(Number(val)) : "";
    default:
      return String(val);
  }
}

function parseValue(raw, type) {
  if (raw === undefined || raw === null || raw === "") {
    if (type === "bool") return false;
    return null;
  }
  switch (type) {
    case "date": {
      const d = new Date(raw);
      return isNaN(d.getTime()) ? null : d;
    }
    case "bool":
      return String(raw).trim().toUpperCase() === "TRUE";
    case "int": {
      const n = parseInt(raw, 10);
      return Number.isNaN(n) ? null : n;
    }
    case "float": {
      const n = parseFloat(raw);
      return Number.isNaN(n) ? null : n;
    }
    default:
      return String(raw);
  }
}

function rowArrayToObject(model, arr) {
  const schema = SCHEMAS[model];
  const obj = {};
  schema.fields.forEach((field, i) => {
    obj[field] = parseValue(arr[i], schema.types[field] || "string");
  });
  return obj;
}

function objectToRowArray(model, obj) {
  const schema = SCHEMAS[model];
  return schema.fields.map((field) => serializeValue(obj[field], schema.types[field] || "string"));
}

function buildDb(raw) {
  const cache = {}; // model -> { ts, rows }
  const locks = {}; // model -> promise chain, serializes writes per model
  const CACHE_MS = 2000;

  function withLock(model, fn) {
    const prev = locks[model] || Promise.resolve();
    const run = prev.then(fn, fn);
    locks[model] = run.catch(() => {});
    return run;
  }

  async function loadAll(model, { fresh = false } = {}) {
    const now = Date.now();
    if (!fresh && cache[model] && now - cache[model].ts < CACHE_MS) {
      return cache[model].rows;
    }
    const schema = SCHEMAS[model];
    await raw.ensureSheet(model, schema.fields);
    const rawRows = await raw.readRows(model);
    const rows = rawRows
      .filter((r) => r.some((c) => c !== undefined && c !== ""))
      .map((r) => rowArrayToObject(model, r));
    cache[model] = { ts: Date.now(), rows };
    return rows;
  }

  async function persist(model, rows) {
    const arrays = rows.map((r) => objectToRowArray(model, r));
    await raw.writeRows(model, arrays);
    cache[model] = { ts: Date.now(), rows };
  }

  function compareOp(op, a, b) {
    const av = a instanceof Date ? a.getTime() : a;
    const bv = b instanceof Date ? b.getTime() : b;
    switch (op) {
      case "gte": return av >= bv;
      case "gt": return av > bv;
      case "lte": return av <= bv;
      case "lt": return av < bv;
      case "equals": return av === bv;
      case "not": return av !== bv;
      default: return true;
    }
  }

  function matchWhere(row, where) {
    if (!where) return true;
    return Object.entries(where).every(([key, cond]) => {
      const val = row[key];
      if (cond !== null && typeof cond === "object" && !(cond instanceof Date)) {
        return Object.entries(cond).every(([op, opVal]) => compareOp(op, val, opVal));
      }
      if (cond instanceof Date) {
        return val instanceof Date && val.getTime() === cond.getTime();
      }
      return val === cond;
    });
  }

  function applyOrderBy(rows, orderBy) {
    if (!orderBy) return rows;
    const [field] = Object.keys(orderBy);
    const dir = orderBy[field] === "desc" ? -1 : 1;
    return [...rows].sort((a, b) => {
      let av = a[field];
      let bv = b[field];
      if (av instanceof Date) av = av.getTime();
      if (bv instanceof Date) bv = bv.getTime();
      if (typeof av === "string") av = av.toLowerCase();
      if (typeof bv === "string") bv = bv.toLowerCase();
      if (av == null && bv == null) return 0;
      if (av == null) return -1 * dir;
      if (bv == null) return 1 * dir;
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }

  async function attachInclude(model, rows, include) {
    const relDefs = RELATIONS[model];
    if (!relDefs || rows.length === 0) return rows;

    for (const [relName, relOpts] of Object.entries(include)) {
      const relDef = relDefs[relName];
      if (!relDef) continue;

      const nestedInclude = relOpts && typeof relOpts === "object" && relOpts.include;
      const relatedAll = await loadAll(relDef.table);

      for (const row of rows) {
        if (relDef.type === "belongsTo") {
          const match = relatedAll.find((r) => r[relDef.foreignKey] === row[relDef.localKey]);
          row[relName] = match ? { ...match } : null;
          if (row[relName] && nestedInclude) {
            await attachInclude(relDef.table, [row[relName]], nestedInclude);
          }
        } else {
          let matches = relatedAll
            .filter((r) => r[relDef.foreignKey] === row[relDef.localKey])
            .map((r) => ({ ...r }));
          if (relOpts && relOpts.orderBy) matches = applyOrderBy(matches, relOpts.orderBy);
          if (relOpts && relOpts.take) matches = matches.slice(0, relOpts.take);
          row[relName] = matches;
          if (nestedInclude) await attachInclude(relDef.table, row[relName], nestedInclude);
        }
      }
    }
    return rows;
  }

  function makeModel(model) {
    const schema = SCHEMAS[model];

    return {
      async findMany(args = {}) {
        let rows = (await loadAll(model)).map((r) => ({ ...r }));
        rows = rows.filter((r) => matchWhere(r, args.where));
        if (args.orderBy) rows = applyOrderBy(rows, args.orderBy);
        if (args.take) rows = rows.slice(0, args.take);
        if (args.include) await attachInclude(model, rows, args.include);
        return rows;
      },

      async findUnique(args = {}) {
        const rows = await loadAll(model);
        const row = rows.find((r) => matchWhere(r, args.where));
        if (!row) return null;
        const result = { ...row };
        if (args.include) await attachInclude(model, [result], args.include);
        return result;
      },

      async findFirst(args = {}) {
        let rows = (await loadAll(model)).filter((r) => matchWhere(r, args.where));
        if (args.orderBy) rows = applyOrderBy(rows, args.orderBy);
        const row = rows[0];
        if (!row) return null;
        const result = { ...row };
        if (args.include) await attachInclude(model, [result], args.include);
        return result;
      },

      async count(args = {}) {
        const rows = (await loadAll(model)).filter((r) => matchWhere(r, args && args.where));
        return rows.length;
      },

      create(args) {
        return withLock(model, async () => {
          const rows = await loadAll(model, { fresh: true });
          const newRow = { ...args.data };

          const maxId = rows.reduce((m, r) => Math.max(m, r.id || 0), 0);
          newRow.id = maxId + 1;

          if (schema.defaults) {
            for (const [field, def] of Object.entries(schema.defaults)) {
              if (newRow[field] === undefined || newRow[field] === null) {
                newRow[field] = def === "now" ? new Date() : def;
              }
            }
          }
          schema.fields.forEach((f) => {
            if (!(f in newRow)) newRow[f] = null;
          });

          rows.push(newRow);
          await persist(model, rows);
          return { ...newRow };
        });
      },

      update(args) {
        return withLock(model, async () => {
          const rows = await loadAll(model, { fresh: true });
          const idx = rows.findIndex((r) => matchWhere(r, args.where));
          if (idx === -1) {
            const err = new Error(`No ${model} record found for the given where clause (update).`);
            err.code = "P2025";
            throw err;
          }
          const updated = { ...rows[idx], ...args.data };
          rows[idx] = updated;
          await persist(model, rows);
          return { ...updated };
        });
      },

      delete(args) {
        return withLock(model, async () => {
          const rows = await loadAll(model, { fresh: true });
          const idx = rows.findIndex((r) => matchWhere(r, args.where));
          if (idx === -1) {
            const err = new Error(`No ${model} record found for the given where clause (delete).`);
            err.code = "P2025";
            throw err;
          }
          const [removed] = rows.splice(idx, 1);
          await persist(model, rows);
          return removed;
        });
      },

      deleteMany(args = {}) {
        return withLock(model, async () => {
          const rows = await loadAll(model, { fresh: true });
          const remaining = rows.filter((r) => !matchWhere(r, args.where));
          const count = rows.length - remaining.length;
          await persist(model, remaining);
          return { count };
        });
      }
    };
  }

  const db = {};
  Object.keys(SCHEMAS).forEach((model) => {
    db[model] = makeModel(model);
  });

  // Not a real transaction (Sheets has no such concept) — the individual
  // calls have already started running by the time they're passed in here
  // (that's how Prisma's array-form $transaction is normally invoked too),
  // so this just waits for all of them. Good enough for this project's one
  // use case (deleting a group of related rows), but it is NOT atomic:
  // if one call fails, earlier ones in the array are not rolled back.
  db.$transaction = async (ops) => Promise.all(ops);
  db.$disconnect = async () => {};

  return db;
}

module.exports = { buildDb, rowArrayToObject, objectToRowArray };
