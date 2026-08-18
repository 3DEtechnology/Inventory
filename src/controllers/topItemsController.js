const prisma = require("../prisma/client");

exports.getTopConsumedItems =
async (req, res) => {

    try {

        const outward =
            await prisma.stocktransaction.findMany({

                where: {
                    transactionType:
                        "OUTWARD"
                },

                include: {
                    item: true
                }
            });

        const itemMap = {};

        outward.forEach(tx => {

            const key =
                tx.itemId;

            if (!itemMap[key]) {

                itemMap[key] = {

                    itemCode:
                        tx.item.itemCode,

                    particular:
                        tx.item.particular,

                    totalIssued: 0,

                    totalValue: 0
                };
            }

            itemMap[key]
                .totalIssued +=
                tx.quantity;

            itemMap[key]
                .totalValue +=
                tx.totalAmount;
        });

        const result =
            Object.values(itemMap)
                .sort(
                    (a, b) =>
                        b.totalIssued -
                        a.totalIssued
                );

        res.json(result);

    } catch (error) {

        res.status(500).json({

            error:
                error.message
        });
    }
};