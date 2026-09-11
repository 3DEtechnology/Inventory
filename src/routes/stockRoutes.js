const router = require("express").Router();

const stockController =
    require("../controllers/stockController");

const authMiddleware =
    require("../middleware/authMiddleware");

const { requireRole } =
    require("../middleware/roleMiddleware");

router.use(authMiddleware);

// Stock inward.
router.post(
    "/inward",
    requireRole("ADMIN", "STORE"),
    stockController.stockInward
);

// Stock outward.
router.post(
    "/outward",
    requireRole("ADMIN", "STORE", "STAFF"),
    stockController.stockOutward
);

// Stock return.
router.post(
    "/return",
    requireRole("ADMIN", "STORE", "STAFF"),
    stockController.stockReturn
);

module.exports = router;
