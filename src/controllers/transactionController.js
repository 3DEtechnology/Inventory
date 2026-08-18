const prisma = require("../prisma/client");

exports.getTransactions = async (req, res) => {

    try {

        const {
            type,
            itemCode,
            employeeId
        } = req.query;

        const transactions =
    await prisma.stocktransaction.findMany({

        include: {

            item: {

                include: {

                    pricehistory: {
                        orderBy: {
                            createdAt: "desc"
                        },
                        take: 1
                    }

                }

            }

        },

        orderBy: {
            createdAt: "desc"
        }
    });

        let result =
            transactions;

        if (type) {

            result =
                result.filter(
                    t =>
                        t.transactionType ===
                        type
                );
        }

        if (itemCode) {

            result =
                result.filter(
                    t =>
                        t.item.itemCode ===
                        itemCode
                );
        }

        if (employeeId) {

            result =
                result.filter(
                    t =>
                        t.employeeId ===
                        employeeId
                );
        }

        res.json(result);

    } catch (error) {

        res.status(500).json({
            error:
                error.message
        });
    }
};