const prisma = require("../prisma/client");

async function generateItemCode() {

    const lastItem = await prisma.item.findFirst({
        orderBy: {
            id: "desc"
        }
    });

    let nextNumber = 1;

    if (lastItem) {

        const parts =
            lastItem.itemCode.split("-");

        nextNumber =
            parseInt(parts[2]) + 1;
    }

    return `3DE-MT-${String(nextNumber).padStart(3,"0")}`;
}

module.exports = generateItemCode;