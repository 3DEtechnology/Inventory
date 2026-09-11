const ExcelJS = require("exceljs");
const prisma = require("../prisma/client");
const fs = require("fs");

/*
 * IMPORT EXCEL FILE
 *
 * Expected Excel columns:
 *
 * Item Code
 * Particular
 * UOM
 * Subsection
 * Current Stock
 * Unit Price
 * Minimum Stock
 * Vendor ID
 * Batch Number
 * Rack Number
 * Expiry Date
 *
 * Existing item codes are updated.
 * New item codes are created.
 *
 * IMPORTANT:
 * currentStock is imported only for NEW items.
 * Existing item stock is NOT overwritten by Excel import.
 * Stock changes for existing items must happen through
 * INWARD / OUTWARD / RETURN transactions.
 */
exports.importExcel = async (req, res) => {
    let filePath = null;

    try {
        if (!req.file) {
            return res.status(400).json({
                error: "Excel file is required"
            });
        }

        filePath = req.file.path;

        const workbook = new ExcelJS.Workbook();

        await workbook.xlsx.readFile(filePath);

        const worksheet = workbook.worksheets[0];

        if (!worksheet) {
            return res.status(400).json({
                error: "Excel workbook contains no worksheet"
            });
        }

        if (worksheet.rowCount < 2) {
            return res.status(400).json({
                error: "Excel file contains no data"
            });
        }

        const headerRow = worksheet.getRow(1);

        const headers = headerRow.values
            .slice(1)
            .map(value =>
                String(value || "")
                    .trim()
                    .toLowerCase()
            );

        const column = {};

        headers.forEach((header, index) => {
            column[header] = index + 1;
        });

        const getColumn = (...names) => {
            for (const name of names) {
                if (column[name]) {
                    return column[name];
                }
            }

            return null;
        };

        const itemCodeColumn =
            getColumn(
                "item code",
                "itemcode",
                "item_code",
                "code"
            );

        const particularColumn =
            getColumn(
                "particular",
                "item",
                "item name",
                "itemname"
            );

        const uomColumn =
            getColumn(
                "uom",
                "unit",
                "unit of measure"
            );

        const subsectionColumn =
            getColumn(
                "subsection",
                "section"
            );

        const currentStockColumn =
            getColumn(
                "current stock",
                "currentstock",
                "stock",
                "quantity",
                "qty"
            );

        const unitPriceColumn =
            getColumn(
                "unit price",
                "unitprice",
                "price"
            );

        const minimumStockColumn =
            getColumn(
                "minimum stock",
                "minimumstock",
                "min stock",
                "minstock"
            );

        const vendorIdColumn =
            getColumn(
                "vendor id",
                "vendorid",
                "vendor"
            );

        const batchNumberColumn =
            getColumn(
                "batch number",
                "batchnumber",
                "batch"
            );

        const rackNumberColumn =
            getColumn(
                "rack number",
                "racknumber",
                "rack"
            );

        const expiryDateColumn =
            getColumn(
                "expiry date",
                "expirydate",
                "expiry"
            );

        if (!particularColumn) {
            return res.status(400).json({
                error:
                    "Excel file must contain a Particular column"
            });
        }

        if (!uomColumn) {
            return res.status(400).json({
                error:
                    "Excel file must contain a UOM column"
            });
        }

        let created = 0;
        let updated = 0;
        let skipped = 0;
        const errors = [];

        for (
            let rowNumber = 2;
            rowNumber <= worksheet.rowCount;
            rowNumber++
        ) {
            const row = worksheet.getRow(rowNumber);

            try {
                const value = columnNumber => {
                    if (!columnNumber) {
                        return null;
                    }

                    return row.getCell(columnNumber).value;
                };

                const particular =
                    value(particularColumn);

                const uom =
                    value(uomColumn);

                if (
                    particular === null ||
                    particular === undefined ||
                    String(particular).trim() === ""
                ) {
                    skipped++;

                    continue;
                }

                if (
                    uom === null ||
                    uom === undefined ||
                    String(uom).trim() === ""
                ) {
                    skipped++;

                    errors.push({
                        row: rowNumber,
                        error: "UOM is required"
                    });

                    continue;
                }

                let itemCode =
                    itemCodeColumn
                        ? value(itemCodeColumn)
                        : null;

                itemCode =
                    itemCode !== null &&
                    itemCode !== undefined &&
                    String(itemCode).trim() !== ""
                        ? String(itemCode).trim()
                        : null;

                const stockValue =
                    currentStockColumn
                        ? value(currentStockColumn)
                        : 0;

                const priceValue =
                    unitPriceColumn
                        ? value(unitPriceColumn)
                        : 0;

                const minimumStockValue =
                    minimumStockColumn
                        ? value(minimumStockColumn)
                        : 0;

                const stock =
                    Number(stockValue || 0);

                const unitPrice =
                    Number(priceValue || 0);

                const minimumStock =
                    Number(minimumStockValue || 0);

                if (
                    !Number.isFinite(stock) ||
                    stock < 0
                ) {
                    throw new Error(
                        "Invalid current stock"
                    );
                }

                if (
                    !Number.isFinite(unitPrice) ||
                    unitPrice < 0
                ) {
                    throw new Error(
                        "Invalid unit price"
                    );
                }

                if (
                    !Number.isFinite(minimumStock) ||
                    minimumStock < 0
                ) {
                    throw new Error(
                        "Invalid minimum stock"
                    );
                }

                const subsectionValue =
                    subsectionColumn
                        ? value(subsectionColumn)
                        : null;

                const batchValue =
                    batchNumberColumn
                        ? value(batchNumberColumn)
                        : null;

                const rackValue =
                    rackNumberColumn
                        ? value(rackNumberColumn)
                        : null;

                const vendorValue =
                    vendorIdColumn
                        ? value(vendorIdColumn)
                        : null;

                let vendorId = null;

                if (
                    vendorValue !== null &&
                    vendorValue !== undefined &&
                    String(vendorValue).trim() !== ""
                ) {
                    vendorId = Number(vendorValue);

                    if (!Number.isInteger(vendorId)) {
                        throw new Error(
                            "Invalid vendor ID"
                        );
                    }
                }

                let expiryDate = null;

                if (expiryDateColumn) {
                    const expiryValue =
                        value(expiryDateColumn);

                    if (
                        expiryValue instanceof Date
                    ) {
                        expiryDate = expiryValue;
                    } else if (
                        expiryValue !== null &&
                        expiryValue !== undefined &&
                        String(expiryValue).trim() !== ""
                    ) {
                        expiryDate =
                            new Date(expiryValue);

                        if (
                            Number.isNaN(
                                expiryDate.getTime()
                            )
                        ) {
                            throw new Error(
                                "Invalid expiry date"
                            );
                        }
                    }
                }

                let existing = null;

                if (itemCode) {
                    existing =
                        await prisma.item.findUnique({
                            where: {
                                itemCode
                            }
                        });
                }

                if (existing) {
                    /*
                     * Existing stock is deliberately NOT
                     * changed by an import.
                     */
                    await prisma.item.update({
                        where: {
                            id: existing.id
                        },

                        data: {
                            particular:
                                String(particular).trim(),

                            uom:
                                String(uom).trim(),

                            subsection:
                                subsectionValue
                                    ? String(
                                          subsectionValue
                                      ).trim()
                                    : null,

                            unitPrice,

                            minimumStock,

                            vendorId,

                            batchNumber:
                                batchValue
                                    ? String(
                                          batchValue
                                      ).trim()
                                    : null,

                            rackNumber:
                                rackValue
                                    ? String(
                                          rackValue
                                      ).trim()
                                    : null,

                            expiryDate,

                            updatedAt:
                                new Date()
                        }
                    });

                    updated++;
                } else {
                    if (!itemCode) {
                        itemCode =
                            await generateItemCode();
                    }

                    await prisma.item.create({
                        data: {
                            itemCode,

                            particular:
                                String(
                                    particular
                                ).trim(),

                            uom:
                                String(
                                    uom
                                ).trim(),

                            subsection:
                                subsectionValue
                                    ? String(
                                          subsectionValue
                                      ).trim()
                                    : null,

                            currentStock:
                                stock,

                            unitPrice,

                            minimumStock,

                            vendorId,

                            batchNumber:
                                batchValue
                                    ? String(
                                          batchValue
                                      ).trim()
                                    : null,

                            rackNumber:
                                rackValue
                                    ? String(
                                          rackValue
                                      ).trim()
                                    : null,

                            expiryDate,

                            updatedAt:
                                new Date()
                        }
                    });

                    created++;
                }
            } catch (rowError) {
                errors.push({
                    row: rowNumber,
                    error: rowError.message
                });
            }
        }

        return res.json({
            success: true,
            message: "Excel import completed",
            created,
            updated,
            skipped,
            errors
        });

    } catch (error) {
        console.error(
            "Excel Import Error:",
            error
        );

        return res.status(500).json({
            error: error.message
        });

    } finally {
        if (filePath) {
            try {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            } catch (cleanupError) {
                console.error(
                    "Import file cleanup error:",
                    cleanupError.message
                );
            }
        }
    }
};
