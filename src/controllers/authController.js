const prisma = require("../prisma/client");
const bcrypt = require("bcrypt");
const { generateToken } = require("../utils/jwt");

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        const normalizedEmail =
            String(email).trim().toLowerCase();

        const user = await prisma.user.findUnique({
            where: {
                email: normalizedEmail
            }
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        // Prevent inactive/deactivated users from logging in.
        if (user.isActive === false) {
            return res.status(403).json({
                success: false,
                message: "Your account has been deactivated"
            });
        }

        const valid = await bcrypt.compare(
            password,
            user.password
        );

        if (!valid) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const token = generateToken(user);

        return res.json({
            success: true,
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                isActive: user.isActive
            }
        });

    } catch (err) {
        console.error(
            "Login error:",
            err.message
        );

        return res.status(500).json({
            success: false,
            message: "Unable to process login"
        });
    }
};
