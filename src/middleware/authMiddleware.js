const { verifyToken } = require("../utils/jwt");

module.exports = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            success: false,
            message: "Authentication required"
        });
    }

    const parts = authHeader.split(" ");

    if (
        parts.length !== 2 ||
        parts[0] !== "Bearer" ||
        !parts[1]
    ) {
        return res.status(401).json({
            success: false,
            message: "Invalid authorization header"
        });
    }

    try {
        const decoded = verifyToken(parts[1]);

        req.user = decoded;

        next();
    } catch (err) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token"
        });
    }
};
