const prisma = require("../prisma/client");
const generateItemCode = require("../utils/generateItemCode");

/*
 * GET ALL ITEMS
 */
exports.getAllItems = async (req, res) => {
    try {
        const items = await prisma.item.findMany({
            orderBy: {
                id: "asc"
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
 * GET ITEM BY ID
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
                message: "Item not found"
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
 * currentStock is allowed when creating a new item.
 * After creation, stock changes should happen through
 * INWARD, OUTWARD or RETURN transactions.
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
            batchNumber,
            rackNumber,
            expiryDate
        } = req.body;

        if (!particular || !String(particular).trim()) {
            return res.status(400).json({
                error: "Particular is required"
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
                error: "Generated item code already exists. Please try again."
            });
        }

        const item = await prisma.item.create({
            data: {
                itemCode,
                particular: String(particular).trim(),
                uom: String(uom).trim(),

                subsection: subsection
                    ? String(subsection).trim()
                    : null,

                batchNumber: batchNumber
                    ? String(batchNumber).trim()
                    : null,

                rackNumber: rackNumber
                    ? String(rackNumber).trim()
                    : null,

                expiryDate: parsedExpiryDate,

                currentStock: stock,
                unitPrice: price,
                minimumStock: minStock,

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

        if (!particular || !String(particular).trim()) {
            return res.status(400).json({
                error: "Particular is required"
            });
        }

        if (!uom || !String(uom).trim()) {
            return res.status(400).json({
                error: "UOM is required"
            });
        }

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
                particular: String(particular).trim(),

                uom: String(uom).trim(),

                subsection: subsection
                    ? String(subsection).trim()
                    : null,

                batchNumber: batchNumber
                    ? String(batchNumber).trim()
                    : null,

                rackNumber: rackNumber
                    ? String(rackNumber).trim()
                    : null,

                expiryDate: parsedExpiryDate,

                unitPrice: price,

                minimumStock: minStock,

                updatedAt: new Date()

                // currentStock intentionally NOT updated.
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
 * ADMIN permission is enforced by itemRoutes.js.
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
                },
                select: {
                    id: true
                }
            });

        if (transactions.length > 0) {
            return res.status(409).json({
                error:
                    "This item cannot be deleted because stock transaction history exists."
            });
        }

        await prisma.$transaction([
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
