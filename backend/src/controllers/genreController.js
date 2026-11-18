const genreModel = require("../models/genreModel");

// GET semua genre
const getAllGenres = async (req, res) => {
  try {
    const genres = await genreModel.getAllGenres();

    res.json({
      success: true,
      data: genres,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GET genre berdasarkan ID
const getGenreById = async (req, res) => {
  try {
    const genre = await genreModel.getGenreById(req.params.id);

    if (!genre) {
      return res.status(404).json({
        success: false,
        message: "Genre tidak ditemukan",
      });
    }

    res.json({
      success: true,
      data: genre,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// POST tambah genre
const createGenre = async (req, res) => {
  try {
    const { name } = req.body;

    await genreModel.createGenre(name);

    res.status(201).json({
      success: true,
      message: "Genre berhasil ditambahkan",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// PUT update genre
const updateGenre = async (req, res) => {
  try {
    const { name } = req.body;

    await genreModel.updateGenre(req.params.id, name);

    res.json({
      success: true,
      message: "Genre berhasil diupdate",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// DELETE genre
const deleteGenre = async (req, res) => {
  try {
    await genreModel.deleteGenre(req.params.id);

    res.json({
      success: true,
      message: "Genre berhasil dihapus",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getAllGenres,
  getGenreById,
  createGenre,
  updateGenre,
  deleteGenre,
};