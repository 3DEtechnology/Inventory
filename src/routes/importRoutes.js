const router = require("express").Router();

const upload =
    require("../middleware/uploadMiddleware");

const importController =
    require("../controllers/importController");

const authMiddleware =
    require("../middleware/authMiddleware");

const { requireRole } =
    require("../middleware/roleMiddleware");

router.use(authMiddleware);

router.post(
    "/",
    requireRole("ADMIN", "STORE"),
    upload.single("file"),
    importController.importExcel
);

module.exports = router;
