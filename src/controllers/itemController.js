const prisma = require("../prisma/client");
const generateItemCode = require("../utils/generateItemCode");

/*
 * GET ALL ITEMS
 */
exports.getAllItems = async (req, res) => {
    try {
        const items = await prisma.item.findMany({
            orderBy: {
                id: "desc"
            }
        });

        return res.json(items);

    } catch (error) {
        console.error("Get All Items Error:", error);

        return res.status(500).json({
            error: error.message
        });
    }
};


/*
 * GET SINGLE ITEM
 */
exports.getItemById = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id)) {
            return res.status(400).json({
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
                error: "Item not found"
            });
        }

        return res.json(item);

    } catch (error) {
        console.error("Get Item Error:", error);

        return res.status(500).json({
            error: error.message
        });
    }
};


/*
 * CREATE ITEM
 *
 * currentStock is allowed during initial item creation.
 * After creation, stock changes must happen through:
 *
 *   INWARD
 *   OUTWARD
 *   RETURN
 */
exports.createItem = async (req, res) => {
    try {
        const {
            particular,
            uom,
            subsection,
            currentStock,
            unitPrice,
            minimumStock,
            vendorId,
            batchNumber,
            rackNumber,
            expiryDate
        } = req.body;

        if (!particular || !String(particular).trim()) {
            return res.status(400).json({
                error: "Particular/item name is required"
            });
        }

        if (!uom || !String(uom).trim()) {
            return res.status(400).json({
                error: "UOM is required"
            });
        }

        const stock = Number(currentStock ?? 0);
        const price = Number(unitPrice);
        const minStock = Number(minimumStock ?? 0);

        if (!Number.isFinite(stock) || stock < 0) {
            return res.status(400).json({
                error: "Invalid current stock"
            });
        }

        if (!Number.isFinite(price) || price < 0) {
            return res.status(400).json({
                error: "Invalid unit price"
            });
        }

        if (!Number.isFinite(minStock) || minStock < 0) {
            return res.status(400).json({
                error: "Invalid minimum stock"
            });
        }

        let parsedVendorId = null;

        if (
            vendorId !== undefined &&
            vendorId !== null &&
            vendorId !== ""
        ) {
            const number = Number(vendorId);

            if (!Number.isInteger(number)) {
                return res.status(400).json({
                    error: "Invalid vendor ID"
                });
            }

            parsedVendorId = number;
        }

        let parsedExpiryDate = null;

        if (expiryDate) {
            parsedExpiryDate = new Date(expiryDate);

            if (Number.isNaN(parsedExpiryDate.getTime())) {
                return res.status(400).json({
                    error: "Invalid expiry date"
                });
            }
        }

        const itemCode = await generateItemCode();

        const existing = await prisma.item.findUnique({
            where: {
                itemCode
            }
        });

        if (existing) {
            return res.status(409).json({
                error: "Generated item code already exists"
            });
        }

        const item = await prisma.item.create({
            data: {
                itemCode,
                particular: String(particular).trim(),
                uom: String(uom).trim(),
                subsection:
                    subsection
                        ? String(subsection).trim()
                        : null,

                currentStock: stock,

                unitPrice: price,

                minimumStock: minStock,

                vendorId: parsedVendorId,

                batchNumber:
                    batchNumber
                        ? String(batchNumber).trim()
                        : null,

                rackNumber:
                    rackNumber
                        ? String(rackNumber).trim()
                        : null,

                expiryDate: parsedExpiryDate,

                updatedAt: new Date()
            }
        });

        return res.status(201).json({
            success: true,
            item
        });

    } catch (error) {
        console.error("Create Item Error:", error);

        return res.status(500).json({
            error: error.message
        });
    }
};


/*
 * UPDATE ITEM
 *
 * IMPORTANT:
 * currentStock is intentionally NOT accepted here.
 *
 * Stock can only be changed through:
 *
 *   INWARD
 *   OUTWARD
 *   RETURN
 */
exports.updateItem = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id)) {
            return res.status(400).json({
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

        const price = Number(unitPrice);
        const minStock = Number(minimumStock);

        if (!Number.isFinite(price) || price < 0) {
            return res.status(400).json({
                error: "Invalid unit price"
            });
        }

        if (!Number.isFinite(minStock) || minStock < 0) {
            return res.status(400).json({
                error: "Invalid minimum stock"
            });
        }

        if (!particular || !String(particular).trim()) {
            return res.status(400).json({
                error: "Particular/item name is required"
            });
        }

        if (!uom || !String(uom).trim()) {
            return res.status(400).json({
                error: "UOM is required"
            });
        }

        let parsedExpiryDate = null;

        if (expiryDate) {
            parsedExpiryDate = new Date(expiryDate);

            if (Number.isNaN(parsedExpiryDate.getTime())) {
                return res.status(400).json({
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
                error: "Item not found"
            });
        }

        const item = await prisma.item.update({
            where: {
                id
            },

            data: {
                particular:
                    String(particular).trim(),

                uom:
                    String(uom).trim(),

                subsection:
                    subsection
                        ? String(subsection).trim()
                        : null,

                batchNumber:
                    batchNumber
                        ? String(batchNumber).trim()
                        : null,

                rackNumber:
                    rackNumber
                        ? String(rackNumber).trim()
                        : null,

                expiryDate:
                    parsedExpiryDate,

                unitPrice:
                    price,

                minimumStock:
                    minStock,

                updatedAt:
                    new Date()
            }
        });

        return res.json({
            success: true,
            item
        });

    } catch (error) {
        console.error("Update Item Error:", error);

        return res.status(500).json({
            error: error.message
        });
    }
};


/*
 * DELETE ITEM
 *
 * ADMIN only is enforced by itemRoutes.js.
 *
 * Do not delete stock history automatically.
 * If the item has transaction history, deleting it would
 * create orphaned historical records.
 */
exports.deleteItem = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id)) {
            return res.status(400).json({
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
                error: "Item not found"
            });
        }

        const transactions =
            await prisma.stocktransaction.findMany({
                where: {
                    itemId: id
                }
            });

        if (transactions.length > 0) {
            return res.status(409).json({
                error:
                    "This item cannot be deleted because stock transaction history exists. Deactivate or archive the item instead."
            });
        }

        const purchases =
            await prisma.purchase.findMany({
                where: {
                    itemId: id
                }
            });

        if (purchases.length > 0) {
            return res.status(409).json({
                error:
                    "This item cannot be deleted because purchase history exists. Deactivate or archive the item instead."
            });
        }

        await prisma.pricehistory.deleteMany({
            where: {
                itemId: id
            }
        });

        await prisma.item.delete({
            where: {
                id
            }
        });

        return res.json({
            success: true,
            message: "Item deleted successfully"
        });

    } catch (error) {
        console.error("Delete Item Error:", error);

        return res.status(500).json({
            error: error.message
        });
    }
};
