const router = require("express").Router();

const topItemsController =
    require("../controllers/topItemsController");

const authMiddleware =
    require("../middleware/authMiddleware");

router.use(authMiddleware);

router.get(
    "/",
    topItemsController.getTopConsumedItems
);

module.exports = router;
