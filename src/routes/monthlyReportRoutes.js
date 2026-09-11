const router = require("express").Router();

const monthlyReportController =
    require("../controllers/monthlyReportController");

const authMiddleware =
    require("../middleware/authMiddleware");

router.use(authMiddleware);

router.get(
    "/summary",
    monthlyReportController.monthlySummary
);

module.exports = router;
