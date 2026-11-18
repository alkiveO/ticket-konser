const express = require("express");
const router = express.Router();

const concertArtistController = require("../controllers/concertArtistController");

const {
  verifyToken,
  isAdmin,
} = require("../middleware/authMiddleware");

// GET
router.get(
  "/:concert_id",
  concertArtistController.getArtists
);

// POST
router.post(
  "/",
  verifyToken,
  isAdmin,
  concertArtistController.assignArtists
);

// PUT
router.put(
  "/:concert_id",
  verifyToken,
  isAdmin,
  concertArtistController.updateArtists
);

// DELETE
router.delete(
  "/:concert_id/:artist_id",
  verifyToken,
  isAdmin,
  concertArtistController.deleteArtist
);

module.exports = router;