const express = require("express");
const router = express.Router();
const franchiseAuth = require("../middleware/franchiseAuthMiddleware");
const Certificate = require("../models/Certificate");
const Franchise = require("../models/Franchise");
const Settings = require("../models/Settings");
const CreditTransaction = require("../models/CreditTransaction");

router.use(franchiseAuth);

// GET / — certificates belonging to this franchise
router.get("/", async (req, res) => {
  try {
    const franchiseId = req.franchise._id.toString();
    const certs = await Certificate.find({ franchiseId }).sort({ createdAt: -1 });
    res.json(certs);
  } catch (err) {
    console.error("Franchise get certificates error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /:id — single certificate
router.get("/:id", async (req, res) => {
  try {
    const franchiseId = req.franchise._id.toString();
    const cert = await Certificate.findOne({ _id: req.params.id, franchiseId });
    if (!cert) return res.status(404).json({ message: "Certificate not found" });
    res.json(cert);
  } catch (err) {
    console.error("Franchise get certificate error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST / — create certificate (stored in shared Certificate model so /verify/:certNo works)
router.post("/", async (req, res) => {
  try {
    const franchise = await Franchise.findById(req.franchise._id);
    if (!franchise) return res.status(404).json({ message: "Franchise not found" });

    const franchiseId = franchise._id.toString();
    const centerName = franchise.instituteName || "";

    const {
      enrollmentNumber,
      name,
      fatherName,
      courseName,
      sessionFrom,
      sessionTo,
      grade,
      certificateNumber,
      issueDate,
      courseDuration,
      coursePeriodFrom,
      coursePeriodTo,
      dob,
      photo,
    } = req.body;

    if (!enrollmentNumber || !name || !fatherName || !courseName || !sessionFrom || !sessionTo || !grade || !certificateNumber || !issueDate) {
      return res.status(400).json({ message: "All required fields must be provided" });
    }

    // Enforce globally unique certificate number — same number = same QR URL
    const existing = await Certificate.findOne({ certificateNumber: certificateNumber.trim() });
    if (existing) {
      return res.status(400).json({
        message: "Certificate number already exists. Use a unique certificate number to ensure each QR code links to a different certificate.",
      });
    }

    // Deduct credits
    try {
      const settings = await Settings.getSettings();
      const certCost = ((settings.creditPricing || {}).certificate) || 20;
      const currentCredits = franchise.credits || 0;
      if (currentCredits >= certCost) {
        franchise.credits = currentCredits - certCost;
        franchise.totalCreditsUsed = (franchise.totalCreditsUsed || 0) + certCost;
        await franchise.save();
        await CreditTransaction.create({
          franchise: franchise._id,
          type: "deduction",
          amount: certCost,
          description: `Certificate issued: ${name} (${certificateNumber})`,
          balanceAfter: franchise.credits,
        });
      }
    } catch (creditErr) {
      console.error("Credit deduction error:", creditErr);
    }

    const cert = new Certificate({
      enrollmentNumber: enrollmentNumber.trim(),
      name: name.trim(),
      fatherName: fatherName.trim(),
      courseName: courseName.trim(),
      sessionFrom: parseInt(sessionFrom, 10),
      sessionTo: parseInt(sessionTo, 10),
      grade: grade.trim(),
      certificateNumber: certificateNumber.trim(),
      issueDate: new Date(issueDate),
      courseDuration: courseDuration ? courseDuration.trim() : "",
      coursePeriodFrom: coursePeriodFrom ? new Date(coursePeriodFrom) : null,
      coursePeriodTo: coursePeriodTo ? new Date(coursePeriodTo) : null,
      dob: dob ? new Date(dob) : null,
      centerName,
      atcName: centerName,
      photo: photo || "",
      franchiseId,
    });

    await cert.save();
    res.status(201).json(cert);
  } catch (err) {
    console.error("Franchise create certificate error:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
});

// PUT /:id — update certificate details
router.put("/:id", async (req, res) => {
  try {
    const franchiseId = req.franchise._id.toString();

    // Prevent ownership or centerName changes via PUT
    const update = { ...req.body };
    delete update.franchiseId;
    delete update.centerName;
    delete update.atcName;

    if (update.sessionFrom) update.sessionFrom = parseInt(update.sessionFrom, 10);
    if (update.sessionTo) update.sessionTo = parseInt(update.sessionTo, 10);
    if (update.issueDate) update.issueDate = new Date(update.issueDate);
    if (update.coursePeriodFrom) update.coursePeriodFrom = new Date(update.coursePeriodFrom);
    if (update.coursePeriodTo) update.coursePeriodTo = new Date(update.coursePeriodTo);
    if (update.dob) update.dob = new Date(update.dob);

    const cert = await Certificate.findOneAndUpdate(
      { _id: req.params.id, franchiseId },
      update,
      { new: true }
    );
    if (!cert) return res.status(404).json({ message: "Certificate not found" });
    res.json(cert);
  } catch (err) {
    console.error("Franchise update certificate error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// PATCH /:id/image — save rendered certificate image so /verify/:certNo can serve it
router.patch("/:id/image", async (req, res) => {
  try {
    const franchiseId = req.franchise._id.toString();
    const { certificateImage } = req.body;
    if (!certificateImage) return res.status(400).json({ message: "certificateImage is required" });

    const cert = await Certificate.findOneAndUpdate(
      { _id: req.params.id, franchiseId },
      { certificateImage },
      { new: true, select: "_id certificateNumber" }
    );
    if (!cert) return res.status(404).json({ message: "Certificate not found" });
    res.json({ success: true, certificateNumber: cert.certificateNumber });
  } catch (err) {
    console.error("Franchise save certificate image error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /:id
router.delete("/:id", async (req, res) => {
  try {
    const franchiseId = req.franchise._id.toString();
    const cert = await Certificate.findOneAndDelete({ _id: req.params.id, franchiseId });
    if (!cert) return res.status(404).json({ message: "Certificate not found" });
    res.json({ message: "Certificate deleted" });
  } catch (err) {
    console.error("Franchise delete certificate error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
