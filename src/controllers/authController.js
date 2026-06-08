// server/src/controllers/authController.js
const jwt = require("jsonwebtoken");
const Student = require("../models/Student");
const AdminUser = require("../models/AdminUser");
const bcrypt = require("bcryptjs");
const Franchise = require("../models/Franchise");


const JWT_SECRET = process.env.JWT_SECRET || "CHANGE_THIS_SECRET";
const EXPIRES = "7d";

/* ================= ADMIN LOGIN ================= */
exports.adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body || {};


    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required"

      });
    }

    // ⛔ IMPORTANT: explicitly include password
    const admin = await AdminUser.findOne({
      username: username.toLowerCase().trim(),
    }).select("+password");


    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const ok = await admin.comparePassword(password);
    if (!ok) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const token = jwt.sign(
      { id: admin._id, role: admin.role },
      JWT_SECRET,
      { expiresIn: EXPIRES }
    );

    // Remove password before sending response
    const adminSafe = admin.toObject();
    delete adminSafe.password;

    return res.json({
      success: true,
      data: {
        token,
        user: adminSafe,
      },
    });
  } catch (err) {
    console.error("adminLogin error:", err);
    return res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
};

/* ================= STUDENT LOGIN ================= */
exports.studentLogin = async (req, res) => {
  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required",
      });
    }

    // case-insensitive username lookup
    const student = await Student.findOne({
      username: { $regex: new RegExp(`^${username}$`, "i") },
    });

    if (!student || !student.password) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password",
      });
    }

    // bcrypt check
    const ok = await student.comparePassword(password);
    if (!ok) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password",
      });
    }

    const token = jwt.sign(
      { id: student._id, role: "student" },
      JWT_SECRET,
      { expiresIn: EXPIRES }
    );

    res.json({
      success: true,
      data: {
        token,
        user: student.toJSON(),
      },
    });
  } catch (err) {
    console.error("studentLogin error:", err);
    res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
};

/* ================= FRANCHISE LOGIN ================= */

exports.franchiseLogin = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: "Username/email and password are required",
      });
    }

    // Find franchise by username or email
    const franchise = await Franchise.findOne({
      $or: [
        { username: identifier.toLowerCase() },
        { email: identifier.toLowerCase() },
      ],
      status: "approved", // ONLY approved franchises can login
    });

    if (!franchise) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials or franchise not approved",
      });
    }

    const isMatch = await bcrypt.compare(password, franchise.passwordHash);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const token = jwt.sign(
      {
        id: franchise._id,
        role: "franchise",
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: franchise._id,
          instituteId: franchise.instituteId,
          instituteName: franchise.instituteName,
          ownerName: franchise.ownerName,
          role: "franchise",
        },
      },
    });
  } catch (err) {
    console.error("Franchise login error:", err);
    res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
};





