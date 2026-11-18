const express = require("express");
const router = express.Router();

const genreController = require("../controllers/genreController");
const {
  verifyToken,
  isAdmin,
} = require("../middleware/authMiddleware");

// GET semua genre
router.get("/", verifyToken, isAdmin, genreController.getAllGenres);

// GET genre berdasarkan ID
router.get("/:id", verifyToken, isAdmin, genreController.getGenreById);

// POST tambah genre
router.post("/", verifyToken, isAdmin, genreController.createGenre);

// PUT update genre
router.put("/:id", verifyToken, isAdmin, genreController.updateGenre);

// DELETE hapus genre
router.delete("/:id", verifyToken, isAdmin, genreController.deleteGenre);

module.exports = router;