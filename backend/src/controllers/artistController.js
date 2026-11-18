const fs = require("fs");
const path = require("path");
const artistModel = require("../models/artistModel");

const uploadDir = path.join(__dirname, "..", "public", "uploads", "artists");

const removeFile = (filename) => {
  if (!filename) return;
  const filePath = path.join(uploadDir, filename);
  fs.unlink(filePath, () => {}); // diamkan kalau file tidak ada
};

const getAllArtists = async (req, res) => {
  try {
    const artists = await artistModel.getAll();

    res.json({
      success: true,
      data: artists,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getArtistById = async (req, res) => {
  try {
    const artist = await artistModel.getById(req.params.id);

    if (!artist) {
      return res.status(404).json({
        success: false,
        message: "Artist tidak ditemukan",
      });
    }

    res.json({
      success: true,
      data: artist,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const createArtist = async (req, res) => {
  try {
    const { genre_id, name, description } = req.body;
    // Kalau ada file yang diupload, pakai nama filenya. Kalau tidak, kosong.
    const photo = req.file ? req.file.filename : null;

    const id = await artistModel.create({
      genre_id,
      name,
      description,
      photo,
    });

    res.status(201).json({
      success: true,
      message: "Artist berhasil ditambahkan",
      id,
    });
  } catch (error) {
    // Kalau gagal simpan ke DB, hapus file yang sudah terlanjur diupload
    if (req.file) removeFile(req.file.filename);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateArtist = async (req, res) => {
  try {
    const { genre_id, name, description } = req.body;

    const existing = await artistModel.getById(req.params.id);
    if (!existing) {
      if (req.file) removeFile(req.file.filename);
      return res.status(404).json({
        success: false,
        message: "Artist tidak ditemukan",
      });
    }

    // Kalau admin upload foto baru, pakai foto baru & hapus foto lama.
    // Kalau tidak, tetap pakai foto yang lama.
    const photo = req.file ? req.file.filename : existing.photo;

    await artistModel.update(req.params.id, {
      genre_id,
      name,
      description,
      photo,
    });

    if (req.file && existing.photo) {
      removeFile(existing.photo);
    }

    res.json({
      success: true,
      message: "Artist berhasil diupdate",
    });
  } catch (error) {
    if (req.file) removeFile(req.file.filename);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteArtist = async (req, res) => {
  try {
    const existing = await artistModel.getById(req.params.id);

    await artistModel.remove(req.params.id);

    if (existing?.photo) {
      removeFile(existing.photo);
    }

    res.json({
      success: true,
      message: "Artist berhasil dihapus",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getAllArtists,
  getArtistById,
  createArtist,
  updateArtist,
  deleteArtist,
};