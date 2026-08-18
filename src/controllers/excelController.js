const ExcelJS = require("exceljs");
const prisma = require("../prisma/client");

exports.exportInventory = async (req, res) => {

    try {

        const workbook =
            new ExcelJS.Workbook();

        const worksheet =
            workbook.addWorksheet(
                "Inventory Report"
            );

        worksheet.columns = [

            { header: "Item ID", key: "itemCode", width: 20 },

            { header: "Particular", key: "particular", width: 30 },

            { header: "UOM", key: "uom", width: 10 },

            { header: "Subsection", key: "subsection", width: 20 },

            { header: "Current Stock", key: "currentStock", width: 15 },

            { header: "Unit Price", key: "unitPrice", width: 15 },

            { header: "Total Stock Value", key: "totalValue", width: 20 },

            { header: "Total Inward", key: "totalInward", width: 15 },

            { header: "Total Outward", key: "totalOutward", width: 15 },

            { header: "Price Difference", key: "priceDifference", width: 18 },

            { header: "Last Inward Date", key: "lastInwardDate", width: 22 },

            { header: "Last Outward Date", key: "lastOutwardDate", width: 22 },

            { header: "Last Employee", key: "lastEmployee", width: 20 },

            { header: "Department", key: "department", width: 20 },

            { header: "Status", key: "status", width: 15 }
        ];

        const items =
            await prisma.item.findMany();

        const transactions =
            await prisma.stocktransaction.findMany();

        const pricehistory =
            await prisma.pricehistory.findMany();

        let totalInventoryValue = 0;
        let totalStockQty = 0;

        for (const item of items) {

            const inwardQty =
                transactions
                    .filter(
                        t =>
                            t.itemId === item.id &&
                            t.transactionType === "INWARD"
                    )
                    .reduce(
                        (sum, t) => sum + t.quantity,
                        0
                    );

            const outwardQty =
                transactions
                    .filter(
                        t =>
                            t.itemId === item.id &&
                            t.transactionType === "OUTWARD"
                    )
                    .reduce(
                        (sum, t) => sum + t.quantity,
                        0
                    );

            const lastInward =
                transactions
                    .filter(
                        t =>
                            t.itemId === item.id &&
                            t.transactionType === "INWARD"
                    )
                    .sort(
                        (a, b) => b.id - a.id
                    )[0];

            const lastOutward =
                transactions
                    .filter(
                        t =>
                            t.itemId === item.id &&
                            t.transactionType === "OUTWARD"
                    )
                    .sort(
                        (a, b) => b.id - a.id
                    )[0];

            const latestPrice =
                pricehistory
                    .filter(
                        p =>
                            p.itemId === item.id
                    )
                    .sort(
                        (a, b) => b.id - a.id
                    )[0];

            const totalValue =
                item.currentStock *
                item.unitPrice;

            totalInventoryValue +=
                totalValue;

            totalStockQty +=
                item.currentStock;

            worksheet.addRow({

                itemCode:
                    item.itemCode,

                particular:
                    item.particular,

                uom:
                    item.uom,

                subsection:
                    item.subsection,

                currentStock:
                    item.currentStock,

                unitPrice:
                    item.unitPrice,

                totalValue,

                totalInward:
                    inwardQty,

                totalOutward:
                    outwardQty,

                priceDifference:
                    latestPrice
                        ? latestPrice.difference
                        : 0,

                lastInwardDate:
                    lastInward
                        ? lastInward.createdAt
                        : "",

                lastOutwardDate:
                    lastOutward
                        ? lastOutward.createdAt
                        : "",

                lastEmployee:
                    lastOutward
                        ? lastOutward.employeeName
                        : "",

                department:
                    lastOutward
                        ? lastOutward.department
                        : "",

                status:
                    item.currentStock <=
                    item.minimumStock
                        ? "LOW STOCK"
                        : "NORMAL"
            });
        }

        worksheet.addRow([]);

        worksheet.addRow({

            subsection: "GRAND TOTAL",

            currentStock:
                totalStockQty,

            totalValue:
                totalInventoryValue
        });

        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );

        res.setHeader(
            "Content-Disposition",
            "attachment; filename=Inventory_Report.xlsx"
        );

        await workbook.xlsx.write(res);

        res.end();

    } catch (error) {

        res.status(500).json({
            error: error.message
        });
    }
};