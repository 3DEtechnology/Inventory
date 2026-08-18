require("dotenv").config();

const bcrypt = require("bcrypt");
const prisma = require("../src/prisma/client");

// Default admin credentials — change these after first login.
const ADMIN_EMAIL = "admin@example.com";
const ADMIN_PASSWORD = "Admin@123";
const ADMIN_NAME = "Administrator";

async function main() {
    const existing = await prisma.user.findUnique({
        where: { email: ADMIN_EMAIL }
    });

    if (existing) {
        console.log(`User with email ${ADMIN_EMAIL} already exists. Skipping.`);
        return;
    }

    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

    const user = await prisma.user.create({
        data: {
            name: ADMIN_NAME,
            email: ADMIN_EMAIL,
            password: hashedPassword,
            role: "ADMIN",
            isActive: true,
            updatedAt: new Date()
        }
    });

    console.log("Created admin user:");
    console.log(`  email:    ${user.email}`);
    console.log(`  password: ${ADMIN_PASSWORD}`);
}

main()
    .catch((err) => {
        console.error(err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
