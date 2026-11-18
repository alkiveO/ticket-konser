const adminNotificationModel = require("../models/adminNotificationModel");

const getMyNotifications = async (req, res) => {
  try {
    const data = await adminNotificationModel.getAll();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    await adminNotificationModel.markAllAsRead();
    res.json({ success: true, message: "Semua notifikasi ditandai sudah dibaca" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getMyNotifications, markAllAsRead };