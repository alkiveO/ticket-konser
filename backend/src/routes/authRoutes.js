const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");
const uploadAvatar = require("../middleware/uploadAvatarMiddleware");

const {
  verifyToken,
  isAdmin,
} = require("../middleware/authMiddleware");

// Register
router.post("/register", authController.register);

// Login
router.post("/login", authController.login);

// Profile
router.get("/profile", verifyToken, authController.getProfile);

router.put("/profile", verifyToken, authController.updateProfile);

router.put(
  "/profile/password",
  verifyToken,
  authController.updatePassword
);

router.post(
  "/profile/avatar",
  verifyToken,
  uploadAvatar.single("avatar"),
  authController.uploadAvatar
);

// Admin Only
router.get("/admin", verifyToken, isAdmin, (req, res) => {
  res.json({
    success: true,
    message: "Selamat datang Admin!",
  });
});

module.exports = router;