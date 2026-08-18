const assert = require("assert");
const { buildDb } = require("../src/sheets/db");

// Fake in-memory adapter mimicking sheetsRaw.js's interface, so we can
// exercise db.js's query logic without hitting the real Google Sheets API.
function makeFakeRaw() {
  const store = {};
  return {
    async ensureSheet(model) {
      if (!store[model]) store[model] = [];
    },
    async readRows(model) {
      return store[model].map((r) => [...r]);
    },
    async writeRows(model, rows) {
      store[model] = rows.map((r) => [...r]);
    },
    _dump() {
      return store;
    }
  };
}

async function main() {
  const raw = makeFakeRaw();
  const db = buildDb(raw);

  // --- vendor + item create ---
  const vendor = await db.vendor.create({
    data: { vendorCode: "VEN001", vendorName: "Acme Supplies" }
  });
  assert.strictEqual(vendor.id, 1);
  assert.ok(vendor.createdAt instanceof Date);

  const item = await db.item.create({
    data: {
      itemCode: "3DE-MT-001",
      particular: "Bolt",
      uom: "pcs",
      subsection: "Hardware",
      currentStock: 100,
      unitPrice: 5,
      minimumStock: 10,
      vendorId: vendor.id,
      updatedAt: new Date()
    }
  });
  assert.strictEqual(item.id, 1);
  assert.strictEqual(item.currentStock, 100);

  const item2 = await db.item.create({
    data: {
      itemCode: "3DE-MT-002",
      particular: "Nut",
      uom: "pcs",
      subsection: "Hardware",
      currentStock: 5,
      unitPrice: 2,
      minimumStock: 10,
      updatedAt: new Date()
    }
  });
  assert.strictEqual(item2.id, 2);

  // --- findMany + orderBy ---
  const items = await db.item.findMany({ orderBy: { id: "asc" } });
  assert.strictEqual(items.length, 2);
  assert.strictEqual(items[0].itemCode, "3DE-MT-001");

  // --- findUnique ---
  const found = await db.item.findUnique({ where: { itemCode: "3DE-MT-002" } });
  assert.strictEqual(found.particular, "Nut");

  // --- findFirst with orderBy desc (mimics generateItemCode.js) ---
  const last = await db.item.findFirst({ orderBy: { id: "desc" } });
  assert.strictEqual(last.itemCode, "3DE-MT-002");

  // --- update (stock inward) ---
  const updated = await db.item.update({
    where: { id: item.id },
    data: { currentStock: 150, updatedAt: new Date() }
  });
  assert.strictEqual(updated.currentStock, 150);

  // --- stocktransaction create + include item (nested pricehistory) ---
  await db.pricehistory.create({
    data: { itemId: item.id, oldPrice: 5, newPrice: 6, difference: 1, percentage: 20 }
  });
  await db.stocktransaction.create({
    data: {
      itemId: item.id,
      transactionType: "INWARD",
      quantity: 50,
      unitPrice: 6,
      stockBefore: 100,
      stockAfter: 150,
      totalAmount: 300
    }
  });

  const txs = await db.stocktransaction.findMany({
    include: {
      item: {
        include: {
          pricehistory: { orderBy: { createdAt: "desc" }, take: 1 }
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });
  assert.strictEqual(txs.length, 1);
  assert.strictEqual(txs[0].item.itemCode, "3DE-MT-001");
  assert.strictEqual(txs[0].item.pricehistory.length, 1);
  assert.strictEqual(txs[0].item.pricehistory[0].newPrice, 6);

  // --- where with gte on dates ---
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todaysTx = await db.stocktransaction.findMany({ where: { createdAt: { gte: today } } });
  assert.strictEqual(todaysTx.length, 1);

  // --- count ---
  const vendorCount = await db.vendor.count();
  assert.strictEqual(vendorCount, 1);

  // --- $transaction (deleteMany + deleteMany + delete), mimics deleteItem ---
  await db.$transaction([
    db.stocktransaction.deleteMany({ where: { itemId: item2.id } }),
    db.pricehistory.deleteMany({ where: { itemId: item2.id } }),
    db.item.delete({ where: { id: item2.id } })
  ]);
  const remainingItems = await db.item.findMany({ orderBy: { id: "asc" } });
  assert.strictEqual(remainingItems.length, 1);
  assert.strictEqual(remainingItems[0].id, item.id);

  // --- delete non-existent -> should throw ---
  let threw = false;
  try {
    await db.item.delete({ where: { id: 999 } });
  } catch (e) {
    threw = true;
  }
  assert.ok(threw, "deleting a non-existent row should throw");

  console.log("All db.js logic tests passed.");
}

main().catch((err) => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
