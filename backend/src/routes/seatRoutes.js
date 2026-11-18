const express = require("express");
const router = express.Router();
const seatController = require("../controllers/seatController");
// const { verifyToken, isAdmin } = require("../middleware/auth"); // pasang sesuai auth punya lu

// ADMIN
router.post(
  "/admin/ticket-categories/:ticket_category_id/seat-prefixes",
  // verifyToken, isAdmin,
  seatController.generateSeats
);

router.get(
  "/admin/ticket-categories/:ticket_category_id/seats",
  // verifyToken, isAdmin,
  seatController.getSeatsByTicketCategory
);

router.delete(
  "/admin/seat-prefixes/:id",
  // verifyToken, isAdmin,
  seatController.deletePrefix
);

// USER
router.get(
  "/concerts/:concert_id/seats",
  seatController.getSeatMapByConcert
);

router.post(
  "/order-items/:order_item_id/seats",
  // verifyToken,
  seatController.selectSeats
);

router.put(
  "/admin/seat-prefixes/:id",
  // verifyToken, isAdmin,
  seatController.updatePrefix
);

router.put(
  "/admin/seat-prefixes/:id/position",
  seatController.updatePrefixPosition
);

router.get(
  "/admin/concerts/:concert_id/seat-layout",
  seatController.getSeatMapLayout
);
module.exports = router;