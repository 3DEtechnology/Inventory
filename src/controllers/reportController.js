const prisma = require("../prisma/client");

exports.dailyReport = async (req, res) => {

    try {

        const today = new Date();

        today.setHours(0, 0, 0, 0);

        const transactions =
            await prisma.stocktransaction.findMany({

                where: {
                    createdAt: {
                        gte: today
                    }
                },

                include: {
                    item: true
                },

                orderBy: {
                    createdAt: "desc"
                }
            });

        res.json(transactions);

    } catch (error) {

        res.status(500).json({
            error: error.message
        });
    }
};

exports.lowStockReport = async (req, res) => {

    try {

        const items =
            await prisma.item.findMany();

        const lowStock =
            items.filter(item =>
                item.currentStock <=
                item.minimumStock
            );

        res.json(lowStock);

    } catch (error) {

        res.status(500).json({
            error: error.message
        });
    }
};

exports.pricehistoryReport = async (req, res) => {

    try {

        const history =
            await prisma.pricehistory.findMany({

                include: {
                    item: true
                },

                orderBy: {
                    createdAt: "desc"
                }
            });

        res.json(history);

    } catch (error) {

        res.status(500).json({
            error: error.message
        });
    }
};