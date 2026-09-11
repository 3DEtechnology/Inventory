const router = require("express").Router();

const vendorController =
    require("../controllers/vendorController");

const authMiddleware =
    require("../middleware/authMiddleware");

const { requireRole } =
    require("../middleware/roleMiddleware");

router.use(authMiddleware);

// Everyone with application access can view vendors.
router.get(
    "/",
    vendorController.getVendors
);

// Only ADMIN and STORE can modify vendors.
router.post(
    "/",
    requireRole("ADMIN", "STORE"),
    vendorController.createVendor
);

router.put(
    "/:id",
    requireRole("ADMIN", "STORE"),
    vendorController.updateVendor
);

// Permanent deletion restricted to ADMIN.
router.delete(
    "/:id",
    requireRole("ADMIN"),
    vendorController.deleteVendor
);

module.exports = router;
