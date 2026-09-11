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

        /*
         * IMPORTANT:
         * currentStock is intentionally NOT accepted here.
         *
         * Stock can only be changed through:
         *   INWARD
         *   OUTWARD
         *   RETURN
         */

        const item = await prisma.item.update({
            where: { id },
            data: {
                particular,
                uom,
                subsection,
                batchNumber: batchNumber || null,
                rackNumber: rackNumber || null,
                expiryDate: expiryDate
                    ? new Date(expiryDate)
                    : null,
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
            error: error.message
        });
    }
};
