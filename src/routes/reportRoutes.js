const router = require("express").Router();

const reportController =
    require("../controllers/reportController");

const authMiddleware =
    require("../middleware/authMiddleware");

router.use(authMiddleware);

router.get(
    "/daily",
    reportController.dailyReport
);

router.get(
    "/low-stock",
    reportController.lowStockReport
);

router.get(
    "/price-history",
    reportController.pricehistoryReport
);

module.exports = router;
