const adminModel = require("../models/adminModel");

// ============================
// DASHBOARD
// ============================
const dashboard = async (req, res) => {
  try {
    const data = await adminModel.dashboard();

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ============================
// GET ALL USERS (admin + customer)
// ============================
const getAllAdmins = async (req, res) => {
  try {
    const admins = await adminModel.getAllAdmins();

    res.json({
      success: true,
      data: admins,
      currentAdminId: req.user.id, // asumsi verifyToken set req.user dari JWT payload
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ============================
// GET ADMIN BY ID
// ============================
const getAdminById = async (req, res) => {
  try {
    const admin = await adminModel.getAdminById(req.params.id);

    res.json({
      success: true,
      data: admin,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ============================
// CREATE ADMIN
// ============================
const createAdmin = async (req, res) => {
  try {
    await adminModel.createAdmin(req.body);

    res.status(201).json({
      success: true,
      message: "Admin berhasil ditambahkan",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ============================
// UPDATE ADMIN
// ============================
const updateAdmin = async (req, res) => {
  try {
    await adminModel.updateAdmin(req.params.id, req.body);

    res.json({
      success: true,
      message: "Admin berhasil diupdate",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ============================
// DELETE ADMIN / USER
// ============================
const deleteAdmin = async (req, res) => {
  try {
    await adminModel.deleteAdmin(req.params.id);

    res.json({
      success: true,
      message: "Akun berhasil dihapus",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports = {
  dashboard,
  getAllAdmins,
  getAdminById,
  createAdmin,
  updateAdmin,
  deleteAdmin,
};