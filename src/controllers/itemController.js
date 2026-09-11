const prisma = require("../prisma/client");
const generateItemCode = require("../utils/generateItemCode");

exports.getAllItems = async (req, res) => {
    try {
        const items = await prisma.item.findMany({
            orderBy: { id: "asc" }
        });
        res.json(items);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getItemById = async (req, res) => {
    try {
        const item = await prisma.item.findUnique({
            where: { id: Number(req.params.id) }
        });
        if (!item) {
            return res.status(404).json({ message: "Item not found" });
        }
        res.json(item);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

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

        const itemCode = await generateItemCode();

        const item = await prisma.item.create({
            data: {
                itemCode,
                particular,
                uom,
                subsection,

                batchNumber,
                rackNumber,
                expiryDate: expiryDate ? new Date(expiryDate) : null,

                currentStock: Number(currentStock),
                unitPrice: Number(unitPrice),
                minimumStock: Number(minimumStock),
                updatedAt: new Date()
            }
        });

        await prisma.stocktransaction.create({
            data: {
                itemId: item.id,
                transactionType: "OPENING",

                quantity: Number(currentStock),
                unitPrice: Number(unitPrice),

                batchNumber,

                stockBefore: 0,
                stockAfter: Number(currentStock),

                totalAmount:
                    Number(currentStock) *
                    Number(unitPrice),

                remarks: "Opening Stock",
                userId: req.user?.id || null
            }
        });

        res.status(201).json({
            success: true,
            item
        });

    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
};

exports.updateItem = async (req, res) => {
    try {
        const id = Number(req.params.id);
        const {
            particular,
            uom,
            subsection,
            batchNumber,
            rackNumber,
            expiryDate,
            currentStock,
            unitPrice,
            minimumStock
        } = req.body;

        const item = await prisma.item.update({
            where: { id },
            data: {
                particular,
                uom,
                subsection,
                batchNumber,
                rackNumber,
                expiryDate: expiryDate ? new Date(expiryDate) : null,
                currentStock: Number(currentStock),
                unitPrice:    Number(unitPrice),
                minimumStock: Number(minimumStock),
                updatedAt: new Date()
            }
        });

        res.json(item);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.deleteItem = async (req, res) => {
    try {
        const id = Number(req.params.id);

        // The item table has foreign keys from stocktransaction and pricehistory,
        // so those child rows must be removed first or MySQL will reject the delete.
        await prisma.$transaction([
            prisma.stocktransaction.deleteMany({ where: { itemId: id } }),
            prisma.pricehistory.deleteMany({ where: { itemId: id } }),
            prisma.item.delete({ where: { id } })
        ]);

        res.json({
            success: true,
            message: "Item deleted successfully"
        });

    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
};
