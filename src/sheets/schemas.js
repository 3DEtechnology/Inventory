/**
 * Schema definitions for the Google-Sheets-backed data layer.
 *
 * Each key under `models` becomes one tab (sheet) in the spreadsheet, with
 * `fields` as the header row (column order matters — it's the row layout).
 *
 * `types` controls how values are converted between JS and sheet cells:
 *   - "int"    -> whole number
 *   - "float"  -> decimal number
 *   - "date"   -> JS Date <-> ISO string
 *   - "bool"   -> JS boolean <-> "TRUE"/"FALSE"
 *   - (absent) -> plain string
 *
 * `defaults` are applied on create() when the field isn't provided.
 * `unique` is informational only (used for nicer error messages).
 */

const models = {
  item: {
    fields: [
      "id", "itemCode", "particular", "uom", "subsection",
      "currentStock", "unitPrice", "minimumStock",
      "createdAt", "updatedAt",
      "vendorId", "batchNumber", "rackNumber", "expiryDate"
    ],
    types: {
      id: "int",
      currentStock: "float",
      unitPrice: "float",
      minimumStock: "float",
      createdAt: "date",
      updatedAt: "date",
      vendorId: "int",
      expiryDate: "date"
    },
    defaults: { createdAt: "now" },
    unique: ["itemCode"]
  },

  vendor: {
    fields: [
      "id", "vendorCode", "vendorName", "contactPerson",
      "phone", "email", "gstNumber", "address", "createdAt"
    ],
    types: { id: "int", createdAt: "date" },
    defaults: { createdAt: "now" },
    unique: ["vendorCode"]
  },

  pricehistory: {
    fields: ["id", "itemId", "oldPrice", "newPrice", "difference", "percentage", "createdAt"],
    types: {
      id: "int", itemId: "int",
      oldPrice: "float", newPrice: "float", difference: "float", percentage: "float",
      createdAt: "date"
    },
    defaults: { createdAt: "now" }
  },

  purchase: {
    fields: [
      "id", "itemId", "vendorId", "quantity", "unitPrice", "totalAmount",
      "invoiceNo", "purchaseDate", "remarks", "createdAt"
    ],
    types: {
      id: "int", itemId: "int", vendorId: "int",
      quantity: "float", unitPrice: "float", totalAmount: "float",
      purchaseDate: "date", createdAt: "date"
    },
    defaults: { createdAt: "now" }
  },

stocktransaction: {
    fields: [
      "id",
      "itemId",
      "transactionType",
      "quantity",
      "unitPrice",
      "stockBefore",
      "stockAfter",
      "totalAmount",
      "employeeName",
      "employeeId",
      "department",
      "remarks",
      "createdAt",
      "batchNumber",
      "expiryDate",
      "userId",
      "vendorId",
      "indentNumber",
      "returnDate"
    ],

    types: {
      id: "int",
      itemId: "int",
      quantity: "float",
      unitPrice: "float",
      stockBefore: "float",
      stockAfter: "float",
      totalAmount: "float",
      createdAt: "date",
      expiryDate: "date",
      userId: "int",
      vendorId: "int",
      returnDate: "date"
    },

    defaults: {
      createdAt: "now"
    }
},

  user: {
    fields: ["id", "name", "email", "password", "role", "isActive", "createdAt", "updatedAt"],
    types: { id: "int", isActive: "bool", createdAt: "date", updatedAt: "date" },
    defaults: { createdAt: "now", role: "STAFF" },
    unique: ["email"]
  }
};

// Relation map used to fulfil Prisma-style `include: {...}` options.
// type "belongsTo": one related row, matched where related[foreignKey] === row[localKey]
// type "hasMany":   many related rows, matched the same way
const relations = {
  item: {
    vendor: { table: "vendor", type: "belongsTo", localKey: "vendorId", foreignKey: "id" },
    pricehistory: { table: "pricehistory", type: "hasMany", localKey: "id", foreignKey: "itemId" },
    stocktransaction: { table: "stocktransaction", type: "hasMany", localKey: "id", foreignKey: "itemId" }
  },
  pricehistory: {
    item: { table: "item", type: "belongsTo", localKey: "itemId", foreignKey: "id" }
  },
  purchase: {
    item: { table: "item", type: "belongsTo", localKey: "itemId", foreignKey: "id" },
    vendor: { table: "vendor", type: "belongsTo", localKey: "vendorId", foreignKey: "id" }
  },
  stocktransaction: {
  item: {
    table: "item",
    type: "belongsTo",
    localKey: "itemId",
    foreignKey: "id"
  },

  user: {
    table: "user",
    type: "belongsTo",
    localKey: "userId",
    foreignKey: "id"
  },

  vendor: {
    table: "vendor",
    type: "belongsTo",
    localKey: "vendorId",
    foreignKey: "id"
  }
},
  vendor: {
    item: { table: "item", type: "hasMany", localKey: "id", foreignKey: "vendorId" }
  }
};

module.exports = { models, relations };
