const prisma = require("../prisma/client");

exports.employeeConsumption = async (req, res) => {

    try {

        const outwardTransactions =
            await prisma.stocktransaction.findMany({

                where: {
                    transactionType: "OUTWARD"
                }
            });

        const employeeMap = {};

        outwardTransactions.forEach(tx => {

            const key =
                `${tx.employeeId}`;

            if (!employeeMap[key]) {

                employeeMap[key] = {

                    employeeName:
                        tx.employeeName,

                    employeeId:
                        tx.employeeId,

                    department:
                        tx.department,

                    totalTransactions: 0,

                    totalQuantity: 0
                };
            }

            employeeMap[key]
                .totalTransactions++;

            employeeMap[key]
                .totalQuantity +=
                tx.quantity;
        });

        res.json(
            Object.values(employeeMap)
        );

    } catch (error) {

        res.status(500).json({

            error:
                error.message
        });
    }
};