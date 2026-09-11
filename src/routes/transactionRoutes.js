const router = require("express").Router();

const transactionController =
    require("../controllers/transactionController");

const authMiddleware =
    require("../middleware/authMiddleware");

router.use(authMiddleware);

router.get(
    "/",
    transactionController.getTransactions
);

module.exports = router;
