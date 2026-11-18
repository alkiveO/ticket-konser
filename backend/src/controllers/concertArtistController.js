const concertArtistModel = require("../models/concertArtistModel");

// GET
const getArtists = async (req, res) => {
  try {
    const artists = await concertArtistModel.getByConcert(
      req.params.concert_id
    );

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

// POST
const assignArtists = async (req, res) => {
  try {
    const { concert_id, artist_ids } = req.body;

    await concertArtistModel.assignArtists(
      concert_id,
      artist_ids
    );

    res.status(201).json({
      success: true,
      message: "Artist berhasil ditambahkan",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// PUT
const updateArtists = async (req, res) => {
  try {
    const { artist_ids } = req.body;

    await concertArtistModel.updateArtists(
      req.params.concert_id,
      artist_ids
    );

    res.json({
      success: true,
      message: "Artist concert berhasil diupdate",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// DELETE
const deleteArtist = async (req, res) => {
  try {
    await concertArtistModel.deleteArtist(
      req.params.concert_id,
      req.params.artist_id
    );

    res.json({
      success: true,
      message: "Artist berhasil dihapus dari concert",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getArtists,
  assignArtists,
  updateArtists,
  deleteArtist,
};