const express = require("express");
const router = express.Router();

const adminController = require("../controllers/adminController");

const {
  verifyToken,
  isAdmin,
} = require("../middleware/authMiddleware");

// ============================
// DASHBOARD
// ============================
router.get(
  "/dashboard",
  verifyToken,
  isAdmin,
  adminController.dashboard
);

// ============================
// ADMIN CRUD
// ============================
router.get(
  "/",
  verifyToken,
  isAdmin,
  adminController.getAllAdmins
);

router.get(
  "/:id",
  verifyToken,
  isAdmin,
  adminController.getAdminById
);

router.post(
  "/",
  verifyToken,
  isAdmin,
  adminController.createAdmin
);

router.put(
  "/:id",
  verifyToken,
  isAdmin,
  adminController.updateAdmin
);

router.delete(
  "/:id",
  verifyToken,
  isAdmin,
  adminController.deleteAdmin
);

module.exports = router;