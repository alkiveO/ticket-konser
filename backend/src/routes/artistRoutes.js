const express = require("express");
const router = express.Router();

const artistController = require("../controllers/artistController");
const { verifyToken, isAdmin } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

// Public
router.get("/", artistController.getAllArtists);
router.get("/:id", artistController.getArtistById);

// Admin
router.post(
  "/",
  verifyToken,
  isAdmin,
  upload.single("photo"),
  artistController.createArtist
);

router.put(
  "/:id",
  verifyToken,
  isAdmin,
  upload.single("photo"),
  artistController.updateArtist
);

router.delete(
  "/:id",
  verifyToken,
  isAdmin,
  artistController.deleteArtist
);

module.exports = router;