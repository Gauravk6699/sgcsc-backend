const express = require("express");
const router = express.Router();
const franchiseAuth = require("../middleware/franchiseAuthMiddleware");
const IDCard = require("../models/IDCard");

router.use(franchiseAuth);

// GET / — list this franchise's ID cards
router.get("/", async (req, res) => {
  try {
    const franchiseId = req.franchise._id.toString();
    const { search } = req.query;
    const filter = { franchiseId };
    if (search?.trim()) {
      const rx = new RegExp(search.trim(), "i");
      filter.$and = [{ franchiseId }, { $or: [{ studentName: rx }, { enrollmentNo: rx }, { courseName: rx }] }];
      delete filter.franchiseId;
    }
    const cards = await IDCard.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: cards });
  } catch (err) {
    console.error("franchise get id-cards error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// GET /:id — single ID card
router.get("/:id", async (req, res) => {
  try {
    const franchiseId = req.franchise._id.toString();
    const card = await IDCard.findOne({ _id: req.params.id, franchiseId }).lean();
    if (!card) return res.status(404).json({ success: false, message: "ID card not found" });
    res.json({ success: true, data: card });
  } catch (err) {
    console.error("franchise get id-card error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// POST / — create ID card (centerName auto-set from franchise)
router.post("/", async (req, res) => {
  try {
    const franchise = req.franchise;
    const franchiseId = franchise._id.toString();
    const centerName = franchise.instituteName || "";

    const {
      studentName, fatherName, motherName, enrollmentNo, dateOfBirth,
      contactNo, address, mobileNo, centerMobileNo, courseName,
      sessionFrom, sessionTo, photo, student
    } = req.body;

    if (!studentName?.trim() || !fatherName?.trim() || !motherName?.trim() || !enrollmentNo?.trim() || !dateOfBirth) {
      return res.status(400).json({ success: false, message: "studentName, fatherName, motherName, enrollmentNo, dateOfBirth are required" });
    }

    const idCard = await IDCard.create({
      studentName: studentName.trim(),
      fatherName: fatherName.trim(),
      motherName: motherName.trim(),
      enrollmentNo: enrollmentNo.trim(),
      dateOfBirth,
      contactNo: contactNo?.trim() || "",
      address: address?.trim() || "",
      mobileNo: mobileNo?.trim() || "",
      centerMobileNo: centerMobileNo?.trim() || "",
      courseName: courseName?.trim() || "",
      centerName,
      sessionFrom: sessionFrom?.trim() || "",
      sessionTo: sessionTo?.trim() || "",
      photo: photo || "",
      student: student || null,
      franchiseId,
    });

    res.status(201).json({ success: true, data: idCard });
  } catch (err) {
    console.error("franchise create id-card error:", err);
    res.status(500).json({ success: false, message: err.message || "Server error" });
  }
});

// PUT /:id — update ID card
router.put("/:id", async (req, res) => {
  try {
    const franchiseId = req.franchise._id.toString();
    const update = { ...req.body };
    delete update.franchiseId;
    delete update.centerName;

    const card = await IDCard.findOneAndUpdate(
      { _id: req.params.id, franchiseId },
      update,
      { new: true }
    );
    if (!card) return res.status(404).json({ success: false, message: "ID card not found" });
    res.json({ success: true, data: card });
  } catch (err) {
    console.error("franchise update id-card error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// DELETE /:id
router.delete("/:id", async (req, res) => {
  try {
    const franchiseId = req.franchise._id.toString();
    const card = await IDCard.findOneAndDelete({ _id: req.params.id, franchiseId });
    if (!card) return res.status(404).json({ success: false, message: "ID card not found" });
    res.json({ success: true, message: "ID card deleted" });
  } catch (err) {
    console.error("franchise delete id-card error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
