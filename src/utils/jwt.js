const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET || "dev-only-insecure-secret-change-me";

function generateToken(user) {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            role: user.role
        },
        SECRET,
        { expiresIn: "8h" }
    );
}

module.exports = { generateToken, SECRET };
