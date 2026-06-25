const express = require("express");
const router = express.Router();
const verifyAdmin = require("../middleware/authMiddleware");
const FranchiseCertificate = require("../models/FranchiseCertificate");

// All routes are admin-only
router.use(verifyAdmin);

// Create franchise certificate
router.post("/", async (req, res) => {
  try {
    const { franchiseName, address, applicantName, atcCode, dateOfIssue, dateOfRenewal, certificateImage } = req.body;

    if (!franchiseName || !address || !applicantName || !atcCode || !dateOfIssue || !dateOfRenewal) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required: franchiseName, address, applicantName, atcCode, dateOfIssue, dateOfRenewal'
      });
    }

    const existing = await FranchiseCertificate.findOne({ atcCode: String(atcCode).trim() });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `ATC Code "${String(atcCode).trim()}" is already in use by another certificate.`,
      });
    }

    const franchiseCertificate = new FranchiseCertificate({
      franchiseName: String(franchiseName).trim(),
      address: String(address).trim(),
      applicantName: String(applicantName).trim(),
      atcCode: String(atcCode).trim(),
      dateOfIssue: new Date(dateOfIssue),
      dateOfRenewal: new Date(dateOfRenewal),
      certificateImage: certificateImage || null,
    });

    await franchiseCertificate.save();

    res.status(201).json({
      success: true,
      message: 'Franchise certificate created successfully',
      data: franchiseCertificate
    });
  } catch (err) {
    console.error('Create franchise certificate error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error while creating franchise certificate'
    });
  }
});

// Get all franchise certificates
router.get("/", async (req, res) => {
  try {
    const { search } = req.query;

    let query = {};
    if (search) {
      const rx = new RegExp(search, 'i');
      query = {
        $or: [
          { franchiseName: rx },
          { applicantName: rx },
          { atcCode: rx }
        ]
      };
    }

    const franchiseCertificates = await FranchiseCertificate.find(query).sort({ createdAt: -1 });
    res.json({
      success: true,
      data: franchiseCertificates
    });
  } catch (err) {
    console.error('Fetch franchise certificates error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching franchise certificates'
    });
  }
});

// Get single franchise certificate
router.get("/:id", async (req, res) => {
  try {
    const franchiseCertificate = await FranchiseCertificate.findById(req.params.id);
    if (!franchiseCertificate) {
      return res.status(404).json({
        success: false,
        message: 'Franchise certificate not found'
      });
    }
    res.json({
      success: true,
      data: franchiseCertificate
    });
  } catch (err) {
    console.error('Fetch franchise certificate error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching franchise certificate'
    });
  }
});

// Update franchise certificate
router.put("/:id", async (req, res) => {
  try {
    const { franchiseName, address, applicantName, atcCode, dateOfIssue, dateOfRenewal, certificateImage } = req.body;

    const update = {};
    if (franchiseName != null) update.franchiseName = String(franchiseName).trim();
    if (address != null) update.address = String(address).trim();
    if (applicantName != null) update.applicantName = String(applicantName).trim();
    if (atcCode != null) update.atcCode = String(atcCode).trim();
    if (dateOfIssue != null) update.dateOfIssue = new Date(dateOfIssue);
    if (dateOfRenewal != null) update.dateOfRenewal = new Date(dateOfRenewal);
    if (certificateImage != null) update.certificateImage = certificateImage;

    if (update.atcCode) {
      const existing = await FranchiseCertificate.findOne({
        atcCode: update.atcCode,
        _id: { $ne: req.params.id },
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `ATC Code "${update.atcCode}" is already in use by another certificate.`,
        });
      }
    }

    const franchiseCertificate = await FranchiseCertificate.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true }
    );

    if (!franchiseCertificate) {
      return res.status(404).json({
        success: false,
        message: 'Franchise certificate not found'
      });
    }

    res.json({
      success: true,
      message: 'Franchise certificate updated successfully',
      data: franchiseCertificate
    });
  } catch (err) {
    console.error('Update franchise certificate error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error while updating franchise certificate'
    });
  }
});

// Delete franchise certificate
router.delete("/:id", async (req, res) => {
  try {
    const franchiseCertificate = await FranchiseCertificate.findByIdAndDelete(req.params.id);
    if (!franchiseCertificate) {
      return res.status(404).json({
        success: false,
        message: 'Franchise certificate not found'
      });
    }

    res.json({
      success: true,
      message: 'Franchise certificate deleted successfully'
    });
  } catch (err) {
    console.error('Delete franchise certificate error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting franchise certificate'
    });
  }
});

module.exports = router;