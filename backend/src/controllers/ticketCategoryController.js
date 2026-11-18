const ticketCategoryModel = require("../models/ticketCategoryModel");

const getAllTicketCategories = async (req, res) => {
  try {
    const data = await ticketCategoryModel.getAll();

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

const getTicketCategoryById = async (req, res) => {
  try {
    const data = await ticketCategoryModel.getById(req.params.id);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Kategori tiket tidak ditemukan",
      });
    }

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

const createTicketCategory = async (req, res) => {
  try {
    const id = await ticketCategoryModel.create(req.body);

    res.status(201).json({
      success: true,
      message: "Kategori tiket berhasil ditambahkan",
      id,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateTicketCategory = async (req, res) => {
  try {
    await ticketCategoryModel.update(req.params.id, req.body);

    res.json({
      success: true,
      message: "Kategori tiket berhasil diupdate",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteTicketCategory = async (req, res) => {
  try {
    await ticketCategoryModel.remove(req.params.id);

    res.json({
      success: true,
      message: "Kategori tiket berhasil dihapus",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getAllTicketCategories,
  getTicketCategoryById,
  createTicketCategory,
  updateTicketCategory,
  deleteTicketCategory,
};