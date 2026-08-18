const router =
require("express").Router();

const upload =
require(
"../middleware/uploadMiddleware"
);

const importController =
require(
"../controllers/importController"
);

router.post(

    "/",

    upload.single(
        "file"
    ),

    importController.importExcel
);

module.exports =
router;