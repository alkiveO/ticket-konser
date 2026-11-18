const notificationModel = require("../models/notificationModel");

// ADMIN: kirim notifikasi
const sendNotification = async (req, res) => {
  try {
    const { concert_id, type, title, message, target } = req.body;

    if (!concert_id || !type || !title || !message || !target) {
      return res.status(400).json({
        success: false,
        message: "concert_id, type, title, message, dan target wajib diisi",
      });
    }

    const result = await notificationModel.create({
      concert_id,
      type,
      title,
      message,
      target,
      created_by: req.user.id,
    });

    res.status(201).json({
      success: true,
      message: `Notifikasi berhasil dikirim ke ${result.total_recipients} user`,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// USER: liat notifikasi sendiri
const getMyNotifications = async (req, res) => {
  try {
    const data = await notificationModel.getMyNotifications(req.user.id);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// USER: tandai notifikasi dibaca
const markAsRead = async (req, res) => {
  try {
    await notificationModel.markAsRead(req.params.id, req.user.id);

    res.json({
      success: true,
      message: "Notifikasi ditandai sudah dibaca",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ADMIN: liat riwayat notifikasi per concert
const getByConcert = async (req, res) => {
  try {
    const data = await notificationModel.getByConcert(req.params.concertId);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// USER: tandai semua notifikasi dibaca
const markAllAsRead = async (req, res) => {
  try {
    await notificationModel.markAllAsRead(req.user.id);

    res.json({
      success: true,
      message: "Semua notifikasi ditandai sudah dibaca",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  sendNotification,
  getMyNotifications,
  markAsRead,
  getByConcert,
  markAllAsRead,
};