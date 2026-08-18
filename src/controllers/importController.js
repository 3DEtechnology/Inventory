const XLSX = require("xlsx");

const prisma =
require("../prisma/client");

const generateItemCode =
require("../utils/generateItemCode");

exports.importExcel =
async (req,res) => {

    try {

        const workbook =
        XLSX.readFile(
            req.file.path
        );

        const sheetName =
        workbook.SheetNames[0];

        const sheet =
        workbook.Sheets[sheetName];

        const data =
        XLSX.utils.sheet_to_json(
            sheet
        );

        let imported = 0;

        for (
            const row of data
        ) {

            const existing =
            await prisma.item.findFirst({

                where: {

                    particular:
                    row.Particular
                }
            });

            if(existing){

                await prisma.item.update({

                    where:{
                        id:
                        existing.id
                    },

                    data:{

                        currentStock:
                        Number(
                            row.Stock
                        ),

                        unitPrice:
                        Number(
                            row.Price
                        ),
                        updatedAt: new Date()
                    }
                });

            } else {

                const itemCode =
                await generateItemCode();

                await prisma.item.create({

                    data:{

                        itemCode,

                        particular:
                        row.Particular,

                        uom:
                        row.UOM,

                        subsection:
                        row.Subsection,

                        currentStock:
                        Number(
                            row.Stock
                        ),

                        unitPrice:
                        Number(
                            row.Price
                        ),

                        minimumStock:
                        10,
                        updatedAt: new Date()
                    }
                });
            }

            imported++;
        }

        res.json({

            success:true,

            imported
        });

    } catch(error){

        res.status(500).json({

            error:
            error.message
        });
    }
};