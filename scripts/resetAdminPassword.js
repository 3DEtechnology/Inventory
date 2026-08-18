require("dotenv").config();

const bcrypt = require("bcrypt");
const prisma = require("../src/prisma/client");

// Edit these if needed, then run: node prisma/resetAdminPassword.js
const ADMIN_EMAIL = "admin@example.com";
const NEW_PASSWORD = "Admin@123";

async function main() {
    const user = await prisma.user.findUnique({
        where: { email: ADMIN_EMAIL }
    });

    if (!user) {
        console.log(`No user found with email ${ADMIN_EMAIL}.`);
        return;
    }

    const hashedPassword = await bcrypt.hash(NEW_PASSWORD, 10);

    await prisma.user.update({
        where: { email: ADMIN_EMAIL },
        data: { password: hashedPassword }
    });

    console.log("Password reset successfully:");
    console.log(`  email:    ${ADMIN_EMAIL}`);
    console.log(`  password: ${NEW_PASSWORD}`);
}

main()
    .catch((err) => {
        console.error(err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
