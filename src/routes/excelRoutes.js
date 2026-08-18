const router =
require("express").Router();

const excelController =
require("../controllers/excelController");

router.get(
    "/export",
    excelController.exportInventory
);

module.exports = router;