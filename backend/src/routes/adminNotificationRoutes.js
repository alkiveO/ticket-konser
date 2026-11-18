const express = require("express");
const router = express.Router();

const adminNotificationController = require("../controllers/adminNotificationController");
const { verifyToken, isAdmin } = require("../middleware/authMiddleware");

router.get("/my", verifyToken, isAdmin, adminNotificationController.getMyNotifications);
router.put("/read-all", verifyToken, isAdmin, adminNotificationController.markAllAsRead);

module.exports = router;