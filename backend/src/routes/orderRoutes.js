const express = require("express");
const router = express.Router();

const orderController = require("../controllers/orderController");

const {
  verifyToken,
  isAdmin,
} = require("../middleware/authMiddleware");

// ============================
// CUSTOMER
// ============================

// Checkout
router.post(
  "/",
  verifyToken,
  orderController.checkout
);

// My Orders
router.get(
  "/my-orders",
  verifyToken,
  orderController.getMyOrders
);

// Detail Order
router.get(
  "/:id",
  verifyToken,
  orderController.getOrderDetail
);

// Cancel Order
router.put(
  "/:id/cancel",
  verifyToken,
  orderController.cancelOrder
);

// ============================
// ADMIN
// ============================

// Get All Orders
router.get(
  "/",
  verifyToken,
  isAdmin,
  orderController.getAllOrders
);

// Update Status
router.put(
  "/:id/status",
  verifyToken,
  isAdmin,
  orderController.updateStatus
);

router.delete(
  "/:id",
  verifyToken,
  isAdmin,
  orderController.deleteOrder
);

module.exports = router;