const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET;

if (!SECRET) {
    throw new Error(
        "JWT_SECRET environment variable is required"
    );
}

function generateToken(user) {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            role: user.role
        },
        SECRET,
        {
            expiresIn: "8h"
        }
    );
}

function verifyToken(token) {
    return jwt.verify(token, SECRET);
}

module.exports = {
    generateToken,
    verifyToken,
    SECRET
};
