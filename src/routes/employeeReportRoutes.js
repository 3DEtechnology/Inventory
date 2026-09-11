const router = require("express").Router();

const employeeReportController =
    require("../controllers/employeeReportController");

const authMiddleware =
    require("../middleware/authMiddleware");

router.use(authMiddleware);

router.get(
    "/consumption",
    employeeReportController.employeeConsumption
);

module.exports = router;
