const router =
require("express").Router();

const stockController =
require("../controllers/stockController");

router.post(
    "/inward",
    stockController.stockInward
);

router.post(
    "/outward",
    stockController.stockOutward
);

router.post(
    "/return",
    stockController.stockReturn

)

module.exports = router;