const router = require("express").Router();

const itemController =
    require("../controllers/itemController");

const authMiddleware =
    require("../middleware/authMiddleware");

const { requireRole } =
    require("../middleware/roleMiddleware");

// All item routes require login.
router.use(authMiddleware);

// View inventory.
router.get(
    "/",
    itemController.getAllItems
);

router.get(
    "/:id",
    itemController.getItemById
);

// Create/edit inventory.
router.post(
    "/",
    requireRole("ADMIN", "STORE"),
    itemController.createItem
);

router.put(
    "/:id",
    requireRole("ADMIN", "STORE"),
    itemController.updateItem
);

// Only ADMIN can permanently delete an item.
router.delete(
    "/:id",
    requireRole("ADMIN"),
    itemController.deleteItem
);

module.exports = router;
