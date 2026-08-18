const router =
require("express").Router();

const reportController =
require("../controllers/reportController");

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