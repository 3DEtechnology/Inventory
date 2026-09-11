const prisma = require("../prisma/client");
const generateItemCode = require("../utils/generateItemCode");

// ============================================================
// GET ALL ITEMS
// ============================================================
exports.getAllItems = async (req, res) => {
  try {
    const items = await prisma.item.findMany({
      orderBy: {
        id: "asc"
      }
    });

    res.json(items);
  } catch (error) {
    console.error("Get Items Error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch items"
    });
  }
};

// ============================================================
// GET ITEM BY ID
// ============================================================
exports.getItemById = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid item ID"
      });
    }

    const item = await prisma.item.findUnique({
      where: {
        id
      }
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        error: "Item not found"
      });
    }

    res.json(item);
  } catch (error) {
    console.error("Get Item Error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch item"
    });
  }
};

// ============================================================
// CREATE ITEM
// ============================================================
exports.createItem = async (req, res) => {
  try {
    const {
      particular,
      uom,
      subsection,
      currentStock,
      unitPrice,
      minimumStock,
      batchNumber,
      rackNumber,
      expiryDate
    } = req.body;

    // -------------------------
    // Validation
    // -------------------------
    if (!particular || !String(particular).trim()) {
      return res.status(400).json({
        success: false,
        error: "Particular is required"
      });
    }

    if (!uom || !String(uom).trim()) {
      return res.status(400).json({
        success: false,
        error: "UOM is required"
      });
    }

    const stock = Number(currentStock);
    const price = Number(unitPrice);
    const minStock = Number(minimumStock);

    if (!Number.isFinite(stock) || stock < 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid current stock"
      });
    }

    if (!Number.isFinite(price) || price < 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid unit price"
      });
    }

    if (!Number.isFinite(minStock) || minStock < 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid minimum stock"
      });
    }

    let parsedExpiryDate = null;

    if (expiryDate) {
      parsedExpiryDate = new Date(expiryDate);

      if (Number.isNaN(parsedExpiryDate.getTime())) {
        return res.status(400).json({
          success: false,
          error: "Invalid expiry date"
        });
      }
    }

    // -------------------------
    // Generate item code
    // -------------------------
    const itemCode = await generateItemCode();

    // -------------------------
    // Create item
    // -------------------------
    const item = await prisma.item.create({
      data: {
        itemCode,
        particular: String(particular).trim(),
        uom: String(uom).trim(),
        subsection: subsection || null,

        currentStock: stock,
        unitPrice: price,
        minimumStock: minStock,

        batchNumber: batchNumber || null,
        rackNumber: rackNumber || null,
        expiryDate: parsedExpiryDate,

        updatedAt: new Date()
      }
    });

    // -------------------------
    // Create opening transaction
    // -------------------------
    if (stock > 0) {
      await prisma.stocktransaction.create({
        data: {
          itemId: item.id,
          transactionType: "OPENING",

          quantity: stock,
          unitPrice: price,

          stockBefore: 0,
          stockAfter: stock,

          totalAmount: stock * price,

          batchNumber: batchNumber || null,
          expiryDate: parsedExpiryDate,

          remarks: "Opening Stock"
        }
      });
    }

    res.status(201).json({
      success: true,
      item
    });
  } catch (error) {
    console.error("Create Item Error:", error);

    res.status(500).json({
      success: false,
      error: "Failed to create item"
    });
  }
};

// ============================================================
// UPDATE ITEM
// ============================================================
// IMPORTANT:
// currentStock is deliberately NOT accepted here.
// Stock must change through INWARD / OUTWARD / RETURN.
// ============================================================
exports.updateItem = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid item ID"
      });
    }

    const {
      particular,
      uom,
      subsection,
      batchNumber,
      rackNumber,
      expiryDate,
      unitPrice,
      minimumStock
    } = req.body;

    if (!particular || !String(particular).trim()) {
      return res.status(400).json({
        success: false,
        error: "Particular is required"
      });
    }

    if (!uom || !String(uom).trim()) {
      return res.status(400).json({
        success: false,
        error: "UOM is required"
      });
    }

    const price = Number(unitPrice);
    const minStock = Number(minimumStock);

    if (!Number.isFinite(price) || price < 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid unit price"
      });
    }

    if (!Number.isFinite(minStock) || minStock < 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid minimum stock"
      });
    }

    let parsedExpiryDate = null;

    if (expiryDate) {
      parsedExpiryDate = new Date(expiryDate);

      if (Number.isNaN(parsedExpiryDate.getTime())) {
        return res.status(400).json({
          success: false,
          error: "Invalid expiry date"
        });
      }
    }

    const existingItem = await prisma.item.findUnique({
      where: {
        id
      }
    });

    if (!existingItem) {
      return res.status(404).json({
        success: false,
        error: "Item not found"
      });
    }

    // currentStock intentionally excluded.
    const item = await prisma.item.update({
      where: {
        id
      },
      data: {
        particular: String(particular).trim(),
        uom: String(uom).trim(),
        subsection: subsection || null,

        batchNumber: batchNumber || null,
        rackNumber: rackNumber || null,
        expiryDate: parsedExpiryDate,

        unitPrice: price,
        minimumStock: minStock,

        updatedAt: new Date()
      }
    });

    res.json({
      success: true,
      item
    });
  } catch (error) {
    console.error("Update Item Error:", error);

    res.status(500).json({
      success: false,
      error: "Failed to update item"
    });
  }
};

// ============================================================
// DELETE ITEM
// ============================================================
exports.deleteItem = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid item ID"
      });
    }

    const item = await prisma.item.findUnique({
      where: {
        id
      }
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        error: "Item not found"
      });
    }

    await prisma.$transaction([
      prisma.stocktransaction.deleteMany({
        where: {
          itemId: id
        }
      }),

      prisma.pricehistory.deleteMany({
        where: {
          itemId: id
        }
      }),

      prisma.item.delete({
        where: {
          id
        }
      })
    ]);

    res.json({
      success: true,
      message: "Item deleted successfully"
    });
  } catch (error) {
    console.error("Delete Item Error:", error);

    res.status(500).json({
      success: false,
      error: "Failed to delete item"
    });
  }
};
