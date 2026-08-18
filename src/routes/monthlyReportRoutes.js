const router =
require("express").Router();

const monthlyReportController =
require(
    "../controllers/monthlyReportController"
);

router.get(
    "/summary",
    monthlyReportController.monthlySummary
);

module.exports = router;