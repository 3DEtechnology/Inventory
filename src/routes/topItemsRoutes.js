const router =
require("express").Router();

const topItemsController =
require(
    "../controllers/topItemsController"
);

router.get(
    "/",
    topItemsController.getTopConsumedItems
);

module.exports =
router;