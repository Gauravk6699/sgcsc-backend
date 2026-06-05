const express = require("express");
const router = express.Router();
const franchiseAuth = require("../middleware/franchiseAuthMiddleware");
const AdmitCard = require("../models/AdmitCard");

router.use(franchiseAuth);

function parseDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? null : d;
}

// GET / — list this franchise's admit cards
router.get("/", async (req, res) => {
  try {
    const franchiseId = req.franchise._id.toString();
    const { search } = req.query;
    const filter = { franchiseId };
    if (search?.trim()) {
      const rx = new RegExp(search.trim(), "i");
      filter.$and = [
        { franchiseId },
        { $or: [{ studentName: rx }, { rollNumber: rx }, { courseName: rx }] },
      ];
      delete filter.franchiseId;
    }
    const cards = await AdmitCard.find(filter).sort({ examDate: -1, createdAt: -1 }).lean();
    res.json({ success: true, data: cards });
  } catch (err) {
    console.error("franchise get admit-cards error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// GET /:id — single admit card
router.get("/:id", async (req, res) => {
  try {
    const franchiseId = req.franchise._id.toString();
    const card = await AdmitCard.findOne({ _id: req.params.id, franchiseId }).lean();
    if (!card) return res.status(404).json({ success: false, message: "Admit card not found" });
    res.json({ success: true, data: card });
  } catch (err) {
    console.error("franchise get admit-card error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// POST / — create admit card (instituteName auto-set from franchise)
router.post("/", async (req, res) => {
  try {
    const franchise = req.franchise;
    const franchiseId = franchise._id.toString();
    const instituteName = franchise.instituteName || "";

    const {
      rollNumber, studentName, fatherName, motherName, courseName,
      examCenterAddress, examDate, examTime, reportingTime, examDuration, photo,
    } = req.body;

    if (!rollNumber || !studentName || !fatherName || !motherName || !courseName ||
        !examCenterAddress || !examDate || !examTime || !reportingTime || !examDuration) {
      return res.status(400).json({
        success: false,
        message: "rollNumber, studentName, fatherName, motherName, courseName, examCenterAddress, examDate, examTime, reportingTime, examDuration are required",
      });
    }

    const parsedExamDate = parseDate(examDate);
    if (!parsedExamDate) return res.status(400).json({ success: false, message: "Invalid examDate format" });

    const card = await AdmitCard.create({
      rollNumber: String(rollNumber).trim(),
      studentName: String(studentName).trim(),
      fatherName: String(fatherName).trim(),
      motherName: String(motherName).trim(),
      courseName: String(courseName).trim(),
      instituteName,
      examCenterAddress: String(examCenterAddress).trim(),
      examDate: parsedExamDate,
      examTime: String(examTime).trim(),
      reportingTime: String(reportingTime).trim(),
      examDuration: String(examDuration).trim(),
      photo: photo || "",
      franchiseId,
    });

    res.status(201).json({ success: true, data: card });
  } catch (err) {
    console.error("franchise create admit-card error:", err);
    res.status(500).json({ success: false, message: err.message || "Server error" });
  }
});

// PUT /:id — update admit card
router.put("/:id", async (req, res) => {
  try {
    const franchiseId = req.franchise._id.toString();
    const update = { ...req.body };
    delete update.franchiseId;
    delete update.instituteName;

    if (update.examDate) {
      const parsed = parseDate(update.examDate);
      if (!parsed) return res.status(400).json({ success: false, message: "Invalid examDate format" });
      update.examDate = parsed;
    }

    const card = await AdmitCard.findOneAndUpdate(
      { _id: req.params.id, franchiseId },
      update,
      { new: true }
    );
    if (!card) return res.status(404).json({ success: false, message: "Admit card not found" });
    res.json({ success: true, data: card });
  } catch (err) {
    console.error("franchise update admit-card error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// DELETE /:id
router.delete("/:id", async (req, res) => {
  try {
    const franchiseId = req.franchise._id.toString();
    const card = await AdmitCard.findOneAndDelete({ _id: req.params.id, franchiseId });
    if (!card) return res.status(404).json({ success: false, message: "Admit card not found" });
    res.json({ success: true, message: "Admit card deleted" });
  } catch (err) {
    console.error("franchise delete admit-card error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
