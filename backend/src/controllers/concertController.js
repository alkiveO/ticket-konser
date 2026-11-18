const fs = require("fs");
const path = require("path");
const concertModel = require("../models/concertModel");

const uploadDir = path.join(__dirname, "..", "public", "uploads", "posters");

const removeFile = (filename) => {
  if (!filename) return;
  // filename yang tersimpan formatnya "/uploads/posters/xxx.jpg"
  const onlyName = path.basename(filename);
  const filePath = path.join(uploadDir, onlyName);
  fs.unlink(filePath, () => {});
};

const getAllConcerts = async (req, res) => {
  try {
    const concerts = await concertModel.getAll();
    res.json({ success: true, data: concerts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getConcertById = async (req, res) => {
  try {
    const concert = await concertModel.getById(req.params.id);
    if (!concert) {
      return res.status(404).json({ success: false, message: "Concert tidak ditemukan" });
    }
    res.json({ success: true, data: concert });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createConcert = async (req, res) => {
  try {
    const banner = req.file ? `/uploads/posters/${req.file.filename}` : null;

    const id = await concertModel.create({
      title: req.body.title,
      description: req.body.description || "",
      banner,
      seat_map: req.body.seat_map || null,
      location: req.body.venue,
      concert_date: req.body.date,
      concert_time: req.body.time || "00:00:00",
      concert_type: req.body.concert_type || "single",   
      status: req.body.status,
      created_by: req.user.id,
    });

    res.status(201).json({
      success: true,
      message: "Concert berhasil ditambahkan",
      id,
    });
  } catch (error) {
    if (req.file) removeFile(req.file.filename);

    res.status(500).json({ success: false, message: error.message });
  }
};

const updateConcert = async (req, res) => {
  try {
    const existing = await concertModel.getById(req.params.id);

    if (!existing) {
      if (req.file) removeFile(req.file.filename);
      return res.status(404).json({ success: false, message: "Concert tidak ditemukan" });
    }

    // kalau ada foto baru, pakai foto baru; kalau tidak, tetap pakai yang lama
    const banner = req.file
      ? `/uploads/posters/${req.file.filename}`
      : existing.banner;

    await concertModel.update(req.params.id, {
      title: req.body.title ?? existing.title,
      description: req.body.description ?? existing.description,
      banner,
      seat_map: req.body.seat_map ?? existing.seat_map,
      location: req.body.venue ?? existing.location,
      concert_date: req.body.date ?? existing.concert_date,
      concert_time: req.body.time ?? existing.concert_time,
      concert_type: req.body.concert_type ?? existing.concert_type,
      status: req.body.status ?? existing.status,
    });

    // hapus foto lama HANYA kalau ada foto baru yang menggantikan
    if (req.file && existing.banner) {
      removeFile(existing.banner);
    }

    res.json({ success: true, message: "Concert berhasil diupdate" });
  } catch (error) {
    if (req.file) removeFile(req.file.filename);

    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteConcert = async (req, res) => {
  try {
    const existing = await concertModel.getById(req.params.id);

    await concertModel.remove(req.params.id);

    if (existing?.banner) {
      removeFile(existing.banner);
    }

    res.json({ success: true, message: "Concert berhasil dihapus" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const uploadSeatMap = async (req, res) => {
  try {
    const existing = await concertModel.getById(req.params.id);
    if (!existing) {
      if (req.file) removeFile(req.file.filename);
      return res.status(404).json({ success: false, message: "Concert tidak ditemukan" });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "Gambar seat map wajib diupload" });
    }

    const seatMap = `/uploads/posters/${req.file.filename}`;

    await concertModel.updateSeatMap(req.params.id, seatMap);

    // hapus seat_map lama kalau ada
    if (existing.seat_map) removeFile(existing.seat_map);

    res.json({ success: true, message: "Seat map berhasil diupload", seat_map: seatMap });
  } catch (error) {
    if (req.file) removeFile(req.file.filename);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAllConcerts,
  getConcertById,
  createConcert,
  updateConcert,
  deleteConcert,
  uploadSeatMap,
};