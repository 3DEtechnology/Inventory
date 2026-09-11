const router = require("express").Router();

const excelController =
    require("../controllers/excelController");

const authMiddleware =
    require("../middleware/authMiddleware");

router.use(authMiddleware);

router.get(
    "/export",
    excelController.exportInventory
);

module.exports = router;
