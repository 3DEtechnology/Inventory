const prisma = require("../prisma/client");
const bcrypt = require("bcrypt");
const { generateToken } = require("../utils/jwt");

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        console.log("Login attempt:", email);

        const user = await prisma.user.findUnique({
            where: { email }
        });

        console.log("User found:", user);

        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const valid = await bcrypt.compare(password, user.password);

        if (!valid) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const token = generateToken(user);

        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            error: err.message
        });
    }
};