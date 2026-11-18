const express = require("express");
const router = express.Router();

const ticketCategoryController = require("../controllers/ticketCategoryController");
const { verifyToken, isAdmin } = require("../middleware/authMiddleware");

// Public
router.get("/", ticketCategoryController.getAllTicketCategories);
router.get("/:id", ticketCategoryController.getTicketCategoryById);

// Admin
router.post(
  "/",
  verifyToken,
  isAdmin,
  ticketCategoryController.createTicketCategory
);

router.put(
  "/:id",
  verifyToken,
  isAdmin,
  ticketCategoryController.updateTicketCategory
);

router.delete(
  "/:id",
  verifyToken,
  isAdmin,
  ticketCategoryController.deleteTicketCategory
);

module.exports = router;