const ExcelJS = require("exceljs");
const prisma = require("../prisma/client");
const generateItemCode = require("../utils/generateItemCode");
const fs = require("fs");

// ============================================================
// IMPORT EXCEL
// ============================================================
exports.importExcel = async (req, res) => {
  let filePath = null;

  try {
    // --------------------------------------------------------
    // Validate uploaded file
    // --------------------------------------------------------
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "Please upload an Excel file"
      });
    }

    filePath = req.file.path;

    // --------------------------------------------------------
    // Read workbook
    // --------------------------------------------------------
    const workbook = new ExcelJS.Workbook();

    await workbook.xlsx.readFile(filePath);

    const worksheet = workbook.worksheets[0];

    if (!worksheet) {
      return res.status(400).json({
        success: false,
        error: "Excel file does not contain a worksheet"
      });
    }

    // --------------------------------------------------------
    // Read header row
    // --------------------------------------------------------
    const headerRow = worksheet.getRow(1);

    const headers = {};

    headerRow.eachCell((cell, colNumber) => {
      const value = String(cell.value || "")
        .trim()
        .toLowerCase();

      if (value) {
        headers[value] = colNumber;
      }
    });

    // --------------------------------------------------------
    // Helper for flexible column names
    // --------------------------------------------------------
    const findColumn = (...names) => {
      for (const name of names) {
        const column = headers[name.toLowerCase()];

        if (column) {
          return column;
        }
      }

      return null;
    };

    const particularColumn = findColumn(
      "particular",
      "particulars",
      "item",
      "item name",
      "name"
    );

    const uomColumn = findColumn(
      "uom",
      "unit",
      "unit of measure"
    );

    const itemCodeColumn = findColumn(
      "item code",
      "itemcode",
      "code"
    );

    const subsectionColumn = findColumn(
      "subsection",
      "sub section",
      "section"
    );

    const stockColumn = findColumn(
      "stock",
      "current stock",
      "quantity",
      "qty"
    );

    const priceColumn = findColumn(
      "price",
      "unit price",
      "rate"
    );

    const minimumStockColumn = findColumn(
      "minimum stock",
      "minimumstock",
      "min stock",
      "minstock"
    );

    const batchColumn = findColumn(
      "batch number",
      "batchnumber",
      "batch",
      "batch no"
    );

    const rackColumn = findColumn(
      "rack number",
      "racknumber",
      "rack",
      "rack no"
    );

    const expiryColumn = findColumn(
      "expiry date",
      "expirydate",
      "expiry"
    );

    const vendorColumn = findColumn(
      "vendor id",
      "vendorid",
      "vendor"
    );

    // --------------------------------------------------------
    // Required columns
    // --------------------------------------------------------
    if (!particularColumn) {
      return res.status(400).json({
        success: false,
        error: "Excel file must contain a Particular column"
      });
    }

    if (!uomColumn) {
      return res.status(400).json({
        success: false,
        error: "Excel file must contain a UOM column"
      });
    }

    // --------------------------------------------------------
    // Import counters
    // --------------------------------------------------------
    let created = 0;
    let updated = 0;
    let skipped = 0;

    const errors = [];

    // --------------------------------------------------------
    // Process rows
    // --------------------------------------------------------
    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber);

      try {
        const getValue = (column) => {
          if (!column) return null;

          const value = row.getCell(column).value;

          if (value === null || value === undefined) {
            return null;
          }

          if (typeof value === "object" && value.text) {
            return String(value.text).trim();
          }

          return String(value).trim();
        };

        const particular = getValue(particularColumn);
        const uom = getValue(uomColumn);

        // Empty row
        if (!particular && !uom) {
          continue;
        }

        if (!particular) {
          skipped++;

          errors.push({
            row: rowNumber,
            error: "Particular is required"
          });

          continue;
        }

        if (!uom) {
          skipped++;

          errors.push({
            row: rowNumber,
            error: "UOM is required"
          });

          continue;
        }

        const itemCode = getValue(itemCodeColumn);

        const subsection = getValue(subsectionColumn);
        const batchNumber = getValue(batchColumn);
        const rackNumber = getValue(rackColumn);

        // ----------------------------------------------------
        // Numeric values
        // ----------------------------------------------------
        const stockValue = getValue(stockColumn);
        const priceValue = getValue(priceColumn);
        const minimumStockValue = getValue(minimumStockColumn);
        const vendorValue = getValue(vendorColumn);

        const stock =
          stockValue === null || stockValue === ""
            ? 0
            : Number(stockValue);

        const price =
          priceValue === null || priceValue === ""
            ? 0
            : Number(priceValue);

        const minimumStock =
          minimumStockValue === null ||
          minimumStockValue === ""
            ? 10
            : Number(minimumStockValue);

        if (!Number.isFinite(stock) || stock < 0) {
          skipped++;

          errors.push({
            row: rowNumber,
            error: "Invalid stock quantity"
          });

          continue;
        }

        if (!Number.isFinite(price) || price < 0) {
          skipped++;

          errors.push({
            row: rowNumber,
            error: "Invalid price"
          });

          continue;
        }

        if (!Number.isFinite(minimumStock) || minimumStock < 0) {
          skipped++;

          errors.push({
            row: rowNumber,
            error: "Invalid minimum stock"
          });

          continue;
        }

        // ----------------------------------------------------
        // Expiry date
        // ----------------------------------------------------
        let expiryDate = null;

        const expiryValue = getValue(expiryColumn);

        if (expiryValue) {
          const parsedDate = new Date(expiryValue);

          if (Number.isNaN(parsedDate.getTime())) {
            skipped++;

            errors.push({
              row: rowNumber,
              error: "Invalid expiry date"
            });

            continue;
          }

          expiryDate = parsedDate;
        }

        // ----------------------------------------------------
        // Vendor ID
        // ----------------------------------------------------
        let vendorId = null;

        if (vendorValue) {
          const parsedVendorId = Number(vendorValue);

          if (
            Number.isInteger(parsedVendorId) &&
            parsedVendorId > 0
          ) {
            vendorId = parsedVendorId;
          }
        }

        // ----------------------------------------------------
        // Find existing item
        // ----------------------------------------------------
        let existingItem = null;

        if (itemCode) {
          existingItem = await prisma.item.findFirst({
            where: {
              itemCode
            }
          });
        }

        // If item code isn't supplied/found,
        // try matching by Particular.
        if (!existingItem) {
          existingItem = await prisma.item.findFirst({
            where: {
              particular
            }
          });
        }

        // ----------------------------------------------------
        // UPDATE EXISTING ITEM
        // ----------------------------------------------------
        if (existingItem) {
          /*
           * IMPORTANT:
           * Do NOT modify currentStock here.
           *
           * Stock is controlled only through:
           * INWARD
           * OUTWARD
           * RETURN
           *
           * This prevents Excel import from silently changing
           * actual inventory.
           */

          await prisma.item.update({
            where: {
              id: existingItem.id
            },
            data: {
              particular,
              uom,
              subsection: subsection || null,

              unitPrice: price,
              minimumStock,

              batchNumber: batchNumber || null,
              rackNumber: rackNumber || null,
              expiryDate,

              ...(vendorId !== null
                ? { vendorId }
                : {}),

              updatedAt: new Date()
            }
          });

          updated++;
          continue;
        }

        // ----------------------------------------------------
        // CREATE NEW ITEM
        // ----------------------------------------------------
        const newItemCode =
          itemCode || await generateItemCode();

        const newItem = await prisma.item.create({
          data: {
            itemCode: newItemCode,

            particular,
            uom,
            subsection: subsection || null,

            currentStock: stock,
            unitPrice: price,
            minimumStock,

            batchNumber: batchNumber || null,
            rackNumber: rackNumber || null,
            expiryDate,

            ...(vendorId !== null
              ? { vendorId }
              : {}),

            updatedAt: new Date()
          }
        });

        // ----------------------------------------------------
        // Opening transaction for imported stock
        // ----------------------------------------------------
        if (stock > 0) {
          await prisma.stocktransaction.create({
            data: {
              itemId: newItem.id,

              transactionType: "OPENING",

              quantity: stock,
              unitPrice: price,

              stockBefore: 0,
              stockAfter: stock,

              totalAmount: stock * price,

              batchNumber: batchNumber || null,
              expiryDate,

              remarks: "Opening Stock - Excel Import"
            }
          });
        }

        created++;
      } catch (rowError) {
        skipped++;

        errors.push({
          row: rowNumber,
          error: rowError.message
        });
      }
    }

    // --------------------------------------------------------
    // Response
    // --------------------------------------------------------
    res.json({
      success: true,
      message: "Excel import completed",
      created,
      updated,
      skipped,
      errors
    });
  } catch (error) {
    console.error("Excel Import Error:", error);

    res.status(500).json({
      success: false,
      error: "Excel import failed"
    });
  } finally {
    // --------------------------------------------------------
    // Remove uploaded temporary file
    // --------------------------------------------------------
    if (filePath) {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (cleanupError) {
        console.error(
          "Excel file cleanup error:",
          cleanupError.message
        );
      }
    }
  }
};
