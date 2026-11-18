const jwt = require("jsonwebtoken");
const path = require("path");
const fs = require("fs");
const authModel = require("../models/authModel");

// ======================
// REGISTER
// ======================
const register = async (req, res) => {
  const { full_name, email, password } = req.body;

  try {
    if (!full_name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Semua field wajib diisi",
      });
    }

    const id = await authModel.register(full_name, email, password);

    res.status(201).json({
      success: true,
      message: "Register berhasil",
      id,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================
// LOGIN
// ======================
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await authModel.login(email, password);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Email atau password salah",
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    res.status(200).json({
      success: true,
      message: "Login berhasil",
      token,
      data: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================
// GET PROFILE (data lengkap dari DB, bukan cuma isi token)
// ======================
const getProfile = async (req, res) => {
  try {
    const user = await authModel.getById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User tidak ditemukan",
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================
// UPDATE PROFILE (nama & email)
// ======================
const updateProfile = async (req, res) => {
  const { full_name, email } = req.body;

  try {
    if (!full_name || !email) {
      return res.status(400).json({
        success: false,
        message: "Nama dan email wajib diisi",
      });
    }

    await authModel.updateProfile(req.user.id, full_name, email);

    const updatedUser = await authModel.getById(req.user.id);

    res.json({
      success: true,
      message: "Profil berhasil diupdate",
      data: updatedUser,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================
// UPDATE PASSWORD
// ======================
const updatePassword = async (req, res) => {
  const { current_password, new_password } = req.body;

  try {
    if (!current_password || !new_password) {
      return res.status(400).json({
        success: false,
        message: "Password saat ini dan password baru wajib diisi",
      });
    }

    if (new_password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password baru minimal 6 karakter",
      });
    }

    await authModel.updatePassword(
      req.user.id,
      current_password,
      new_password
    );

    res.json({
      success: true,
      message: "Password berhasil diupdate",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================
// UPLOAD AVATAR
// ======================
const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "File foto profil wajib diupload",
      });
    }

    const avatarPath = `/uploads/avatars/${req.file.filename}`;
    const oldAvatar = await authModel.updateAvatar(req.user.id, avatarPath);

    // Hapus file avatar lama kalau ada
    if (oldAvatar) {
      const oldFullPath = path.join(__dirname, "..", "public", oldAvatar);
      fs.unlink(oldFullPath, () => {});
    }

    res.json({
      success: true,
      message: "Foto profil berhasil diupdate",
      avatar: avatarPath,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  updatePassword,
  uploadAvatar,
};