const express = require("express");
const router = express.Router();
const franchiseAuth = require("../middleware/franchiseAuthMiddleware");
const TypingCertificate = require("../models/TypingCertificate");
const Franchise = require("../models/Franchise");

// All routes require franchise authentication
router.use(franchiseAuth);

// Get typing certificates created by this franchise
router.get("/", async (req, res) => {
  try {
    // Find certificates created by this franchise (you might want to add a franchise field to track this)
    // For now, return all typing certificates since this is franchise-specific content
    const certificates = await TypingCertificate.find({}).sort({ createdAt: -1 });
    res.json(certificates);
  } catch (err) {
    console.error("Franchise get typing certificates error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get single typing certificate
router.get("/:id", async (req, res) => {
  try {
    const certificate = await TypingCertificate.findById(req.params.id);
    if (!certificate) {
      return res.status(404).json({ message: "Typing certificate not found" });
    }
    res.json(certificate);
  } catch (err) {
    console.error("Franchise get typing certificate error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Create typing certificate
router.post("/", async (req, res) => {
  try {
    const { certificateNo } = req.body;
    if (certificateNo) {
      const duplicate = await TypingCertificate.findOne({ certificateNo: String(certificateNo).trim() });
      if (duplicate) {
        return res.status(400).json({ message: 'Certificate number already exists. Use a unique certificate number.' });
      }
    }

    const franchise = await Franchise.findById(req.franchise._id);
    const certificateData = {
      ...req.body,
      // Optionally track which franchise created it
      // createdByFranchise: req.franchise._id
    };

    const certificate = new TypingCertificate(certificateData);
    await certificate.save();

    res.status(201).json(certificate);
  } catch (err) {
    console.error("Franchise create typing certificate error:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
});

// Update typing certificate
router.put("/:id", async (req, res) => {
  try {
    const certificate = await TypingCertificate.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!certificate) {
      return res.status(404).json({ message: "Typing certificate not found" });
    }

    res.json(certificate);
  } catch (err) {
    console.error("Franchise update typing certificate error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete typing certificate
router.delete("/:id", async (req, res) => {
  try {
    const certificate = await TypingCertificate.findByIdAndDelete(req.params.id);

    if (!certificate) {
      return res.status(404).json({ message: "Typing certificate not found" });
    }

    res.json({ message: "Typing certificate deleted successfully" });
  } catch (err) {
    console.error("Franchise delete typing certificate error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;