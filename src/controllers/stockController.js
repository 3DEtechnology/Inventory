const prisma = require("../prisma/client");

/*
 * STOCK INWARD
 */
exports.stockInward = async (req, res) => {
    try {
        const {
            itemCode,
            quantity,
            unitPrice,
            remarks,
            batchNumber,
            expiryDate
        } = req.body;

        const qty = Number(quantity);
        const price = Number(unitPrice);

        // Validate quantity
        if (!Number.isFinite(qty) || qty <= 0) {
            return res.status(400).json({
                message: "Invalid quantity"
            });
        }

        // Validate price
        if (!Number.isFinite(price) || price < 0) {
            return res.status(400).json({
                message: "Invalid unit price"
            });
        }

        // Find item
        const item = await prisma.item.findUnique({
            where: { itemCode }
        });

        if (!item) {
            return res.status(404).json({
                message: "Item not found"
            });
        }

        const oldPrice = Number(item.unitPrice);
        const stockBefore = Number(item.currentStock);
        const stockAfter = stockBefore + qty;

        let priceChanged = false;

        /*
         * PRICE HISTORY
         */
        if (price !== oldPrice) {
            priceChanged = true;

            const difference = price - oldPrice;

            // If old price is 0, percentage is undefined.
            // Store NULL instead of Infinity.
            const percentage =
                oldPrice === 0
                    ? null
                    : (difference / oldPrice) * 100;

            await prisma.pricehistory.create({
                data: {
                    itemId: item.id,
                    oldPrice: oldPrice,
                    newPrice: price,
                    difference: difference,
                    percentage: percentage
                }
            });
        }

        /*
         * UPDATE ITEM
         */
        await prisma.item.update({
            where: { id: item.id },
            data: {
                currentStock: stockAfter,
                unitPrice: price,
                updatedAt: new Date()
            }
        });

        /*
         * CREATE INWARD TRANSACTION
         */
        await prisma.stocktransaction.create({
            data: {
                itemId: item.id,
                transactionType: "INWARD",
                quantity: qty,
                unitPrice: price,
                stockBefore: stockBefore,
                stockAfter: stockAfter,
                totalAmount: qty * price,
                remarks: remarks || null,
                batchNumber: batchNumber || null,
                expiryDate: expiryDate
                    ? new Date(expiryDate)
                    : null
            }
        });

        return res.json({
            success: true,
            priceChanged,
            stockBefore,
            stockAfter
        });

    } catch (error) {
        console.error("Stock Inward Error:", error);

        return res.status(500).json({
            error: error.message
        });
    }
};


/*
 * STOCK OUTWARD
 */
exports.stockOutward = async (req, res) => {
    try {
        const {
            itemCode,
            quantity,
            employeeName,
            employeeId,
            department,
            remarks,
            batchNumber,
            expiryDate
        } = req.body;

        const qty = Number(quantity);

        // Validate quantity
        if (!Number.isFinite(qty) || qty <= 0) {
            return res.status(400).json({
                message: "Invalid quantity"
            });
        }

        // Find item
        const item = await prisma.item.findUnique({
            where: { itemCode }
        });

        if (!item) {
            return res.status(404).json({
                message: "Item not found"
            });
        }

        const stockBefore = Number(item.currentStock);

        // Check available stock
        if (qty > stockBefore) {
            return res.status(400).json({
                message: "Insufficient stock"
            });
        }

        const stockAfter = stockBefore - qty;
        const price = Number(item.unitPrice);

        /*
         * UPDATE STOCK
         */
        await prisma.item.update({
            where: { id: item.id },
            data: {
                currentStock: stockAfter,
                updatedAt: new Date()
            }
        });

        /*
         * CREATE OUTWARD TRANSACTION
         */
        await prisma.stocktransaction.create({
            data: {
                itemId: item.id,
                transactionType: "OUTWARD",
                quantity: qty,
                unitPrice: price,
                stockBefore: stockBefore,
                stockAfter: stockAfter,
                totalAmount: qty * price,
                employeeName: employeeName || null,
                employeeId: employeeId || null,
                department: department || null,
                remarks: remarks || null,
                batchNumber: batchNumber || null,
                expiryDate: expiryDate
                    ? new Date(expiryDate)
                    : null
            }
        });

        return res.json({
            success: true,
            stockBefore,
            stockAfter
        });

    } catch (error) {
        console.error("Stock Outward Error:", error);

        return res.status(500).json({
            error: error.message
        });
    }
};


/*
 * STOCK RETURN
 */
exports.stockReturn = async (req, res) => {
    try {
        const {
            itemCode,
            quantity,
            employeeName,
            employeeId,
            department,
            remarks,
            batchNumber,
            expiryDate
        } = req.body;

        const qty = Number(quantity);

        // Validate quantity
        if (!Number.isFinite(qty) || qty <= 0) {
            return res.status(400).json({
                message: "Invalid quantity"
            });
        }

        // Find item
        const item = await prisma.item.findUnique({
            where: { itemCode }
        });

        if (!item) {
            return res.status(404).json({
                message: "Item not found"
            });
        }

        const stockBefore = Number(item.currentStock);
        const stockAfter = stockBefore + qty;
        const price = Number(item.unitPrice);

        /*
         * UPDATE STOCK
         */
        await prisma.item.update({
            where: { id: item.id },
            data: {
                currentStock: stockAfter,
                updatedAt: new Date()
            }
        });

        /*
         * CREATE RETURN TRANSACTION
         */
        await prisma.stocktransaction.create({
            data: {
                itemId: item.id,
                transactionType: "RETURN",
                quantity: qty,
                unitPrice: price,
                stockBefore: stockBefore,
                stockAfter: stockAfter,
                totalAmount: qty * price,
                employeeName: employeeName || null,
                employeeId: employeeId || null,
                department: department || null,
                remarks: remarks || null,
                batchNumber: batchNumber || null,
                expiryDate: expiryDate
                    ? new Date(expiryDate)
                    : null
            }
        });

        return res.json({
            success: true,
            stockBefore,
            stockAfter
        });

    } catch (error) {
        console.error("Stock Return Error:", error);

        return res.status(500).json({
            error: error.message
        });
    }
};
