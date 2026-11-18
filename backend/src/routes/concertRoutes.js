const express = require("express");
const router = express.Router();

const concertController = require("../controllers/concertController");
const { verifyToken, isAdmin } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadPosterMiddleware");

// Public
router.get("/", concertController.getAllConcerts);
router.get("/:id", concertController.getConcertById);

// Admin
router.post(
  "/",
  verifyToken,
  isAdmin,
  upload.single("poster"),
  concertController.createConcert
);

router.put(
  "/:id",
  verifyToken,
  isAdmin,
  upload.single("poster"),
  concertController.updateConcert
);

router.delete(
  "/:id",
  verifyToken,
  isAdmin,
  concertController.deleteConcert
);

router.post(
  "/:id/seat-map",
  verifyToken,
  isAdmin,
  upload.single("poster"),
  concertController.uploadSeatMap
);

module.exports = router;