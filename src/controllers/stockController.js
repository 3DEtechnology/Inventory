const prisma = require("../prisma/client");

function parseOptionalDate(value) {
    if (!value) return null;

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date;
}

function parseOptionalInt(value) {
    if (value === undefined || value === null || value === "") {
        return null;
    }

    const number = Number(value);

    return Number.isInteger(number) ? number : null;
}


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
            expiryDate,
            vendorId,
            indentNumber
        } = req.body;

        const qty = Number(quantity);
        const price = Number(unitPrice);

        if (!Number.isFinite(qty) || qty <= 0) {
            return res.status(400).json({
                message: "Invalid quantity"
            });
        }

        if (!Number.isFinite(price) || price < 0) {
            return res.status(400).json({
                message: "Invalid unit price"
            });
        }

        if (!itemCode) {
            return res.status(400).json({
                message: "Item code is required"
            });
        }

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

        const parsedVendorId = parseOptionalInt(vendorId);
        const parsedExpiryDate = parseOptionalDate(expiryDate);

        let priceChanged = false;

        /*
         * PRICE HISTORY
         */
        if (price !== oldPrice) {
            priceChanged = true;

            const difference = price - oldPrice;

            const percentage =
                oldPrice === 0
                    ? null
                    : (difference / oldPrice) * 100;

            await prisma.pricehistory.create({
                data: {
                    itemId: item.id,
                    oldPrice,
                    newPrice: price,
                    difference,
                    percentage
                }
            });
        }

        /*
         * UPDATE ITEM STOCK
         */
        await prisma.item.update({
            where: { id: item.id },
            data: {
                currentStock: stockAfter,
                unitPrice: price,
                vendorId: parsedVendorId ?? item.vendorId,
                batchNumber: batchNumber || item.batchNumber || null,
                expiryDate: parsedExpiryDate || item.expiryDate || null,
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
                stockBefore,
                stockAfter,
                totalAmount: qty * price,

                remarks: remarks || null,

                batchNumber:
                    batchNumber || null,

                expiryDate:
                    parsedExpiryDate,

                userId:
                    req.user?.id || null,

                vendorId:
                    parsedVendorId,

                indentNumber:
                    indentNumber || null
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
            expiryDate,
            indentNumber
        } = req.body;

        const qty = Number(quantity);

        if (!Number.isFinite(qty) || qty <= 0) {
            return res.status(400).json({
                message: "Invalid quantity"
            });
        }

        if (!itemCode) {
            return res.status(400).json({
                message: "Item code is required"
            });
        }

        const item = await prisma.item.findUnique({
            where: { itemCode }
        });

        if (!item) {
            return res.status(404).json({
                message: "Item not found"
            });
        }

        const stockBefore = Number(item.currentStock);

        if (qty > stockBefore) {
            return res.status(400).json({
                message: `Insufficient stock. Available: ${stockBefore}`
            });
        }

        const stockAfter = stockBefore - qty;
        const price = Number(item.unitPrice);

        const parsedExpiryDate = parseOptionalDate(expiryDate);

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
                stockBefore,
                stockAfter,
                totalAmount: qty * price,

                employeeName:
                    employeeName || null,

                employeeId:
                    employeeId || null,

                department:
                    department || null,

                remarks:
                    remarks || null,

                batchNumber:
                    batchNumber || null,

                expiryDate:
                    parsedExpiryDate,

                userId:
                    req.user?.id || null,

                indentNumber:
                    indentNumber || null
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
            expiryDate,
            indentNumber,
            returnDate
        } = req.body;

        const qty = Number(quantity);

        if (!Number.isFinite(qty) || qty <= 0) {
            return res.status(400).json({
                message: "Invalid quantity"
            });
        }

        if (!itemCode) {
            return res.status(400).json({
                message: "Item code is required"
            });
        }

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

        const parsedExpiryDate = parseOptionalDate(expiryDate);
        const parsedReturnDate =
            parseOptionalDate(returnDate) || new Date();

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
                stockBefore,
                stockAfter,
                totalAmount: qty * price,

                employeeName:
                    employeeName || null,

                employeeId:
                    employeeId || null,

                department:
                    department || null,

                remarks:
                    remarks || null,

                batchNumber:
                    batchNumber || null,

                expiryDate:
                    parsedExpiryDate,

                userId:
                    req.user?.id || null,

                indentNumber:
                    indentNumber || null,

                returnDate:
                    parsedReturnDate
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
