const express = require("express");
const router = express.Router();

const notificationController = require("../controllers/notificationController");
const { verifyToken, isAdmin } = require("../middleware/authMiddleware");

// Customer
router.get("/my", verifyToken, notificationController.getMyNotifications);
router.put("/read-all", verifyToken, notificationController.markAllAsRead);
router.put("/:id/read", verifyToken, notificationController.markAsRead);


// Admin
router.post("/", verifyToken, isAdmin, notificationController.sendNotification);
router.get("/concert/:concertId", verifyToken, isAdmin, notificationController.getByConcert);

module.exports = router;