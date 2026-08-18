const prisma = require("../prisma/client");

exports.getDashboardStats = async (req, res) => {

    try {

        const items =
            await prisma.item.findMany();

        const today =
            new Date();

        today.setHours(
            0,0,0,0
        );

        const transactions =
            await prisma.stocktransaction.findMany({

                where: {

                    createdAt: {

                        gte: today
                    }
                }
            });

        const totalItems =
            items.length;

        const totalStock =
            items.reduce(

                (sum,item) =>

                    sum +
                    item.currentStock,

                0
            );

        const inventoryValue =
            items.reduce(

                (sum,item) =>

                    sum +
                    (
                        item.currentStock *
                        item.unitPrice
                    ),

                0
            );

        const lowStockItems =
            items.filter(

                item =>

                    item.currentStock <=
                    item.minimumStock

            ).length;

        const todayInward =
            transactions
                .filter(

                    t =>

                        t.transactionType ===
                        "INWARD"

                )
                .reduce(

                    (sum,t) =>

                        sum +
                        t.quantity,

                    0
                );

        const todayOutward =
            transactions
                .filter(

                    t =>

                        t.transactionType ===
                        "OUTWARD"

                )
                .reduce(

                    (sum,t) =>

                        sum +
                        t.quantity,

                    0
                );

        res.json({

            totalItems,

            totalStock,

            inventoryValue,

            lowStockItems,

            todayInward,

            todayOutward
        });

    } catch(error){

        res.status(500).json({

            error:
            error.message
        });
    }
};