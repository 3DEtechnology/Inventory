const prisma = require("../prisma/client");
const bcrypt = require("bcrypt");

// Never send the password hash back to the client.
function sanitize(user) {
    const { password, ...safe } = user;
    return safe;
}

exports.getUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            orderBy: { name: "asc" }
        });

        res.json(users.map(sanitize));

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.createUser = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                message: "name, email and password are required"
            });
        }

        const existing = await prisma.user.findUnique({ where: { email } });

        if (existing) {
            return res.status(409).json({
                message: "A user with this email already exists"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: role || "STAFF",
                isActive: true,
                updatedAt: new Date()
            }
        });

        res.json(sanitize(user));

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { name, email, password, role, isActive } = req.body;

        const data = {
            updatedAt: new Date()
        };

        if (name !== undefined) data.name = name;
        if (email !== undefined) data.email = email;
        if (role !== undefined) data.role = role;
        if (isActive !== undefined) data.isActive = isActive;

        // Only rehash/update password if a new one was actually provided.
        if (password) {
            data.password = await bcrypt.hash(password, 10);
        }

        const user = await prisma.user.update({
            where: { id },
            data
        });

        res.json(sanitize(user));

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const id = Number(req.params.id);

        // Prevent an admin from deleting their own account while logged in with it.
        if (req.user && req.user.id === id) {
            return res.status(400).json({
                message: "You cannot delete your own account while logged in"
            });
        }

        await prisma.user.delete({ where: { id } });

        res.json({ success: true, message: "User deleted" });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
