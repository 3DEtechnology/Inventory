const router =
require("express").Router();

const employeeReportController =
require(
    "../controllers/employeeReportController"
);

router.get(
    "/consumption",
    employeeReportController.employeeConsumption
);

module.exports =
router;