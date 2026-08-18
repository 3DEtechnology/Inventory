const router =
require("express").Router();

const transactionController =
require(
    "../controllers/transactionController"
);

router.get(
    "/",
    transactionController.getTransactions
);

module.exports =
router;