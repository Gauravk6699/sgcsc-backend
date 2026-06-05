const express = require("express");
const router = express.Router();
const Student = require("../models/Student");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // 1️⃣ Find student by roll number or username
    const student = await Student.findOne({
      $or: [{ rollNumber: username }, { username }],
    });
    if (!student) {
      return res.status(401).json({
        success: false,
        message: "Invalid roll number or password",
      });
    }

    // 2️⃣ Compare hashed password
    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password",
      });
    }

    // 3️⃣ Generate token
    const token = jwt.sign(
      { studentId: student._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // 4️⃣ Respond
    res.json({
      success: true,
      token,
    });
  } catch (err) {
    console.error("Student login error:", err);
    res.status(500).json({ success: false });
  }
});

module.exports = router;
