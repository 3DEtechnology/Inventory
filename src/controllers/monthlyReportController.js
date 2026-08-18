const prisma = require("../prisma/client");

exports.monthlySummary = async (req, res) => {

    try {

        const currentYear =
            new Date().getFullYear();

        const transactions =
            await prisma.stocktransaction.findMany({

                where: {

                    createdAt: {

                        gte: new Date(
                            `${currentYear}-01-01`
                        )
                    }
                }
            });

        const months = {};

        for (let i = 0; i < 12; i++) {

            months[i] = {

                month: i + 1,

                inward: 0,

                outward: 0
            };
        }

        transactions.forEach(tx => {

            const month =
                new Date(
                    tx.createdAt
                ).getMonth();

            if (
                tx.transactionType ===
                "INWARD"
            ) {

                months[month]
                    .inward +=
                    tx.quantity;
            }

            if (
                tx.transactionType ===
                "OUTWARD"
            ) {

                months[month]
                    .outward +=
                    tx.quantity;
            }
        });

        res.json(
            Object.values(months)
        );

    } catch (error) {

        res.status(500).json({
            error:
                error.message
        });
    }
};