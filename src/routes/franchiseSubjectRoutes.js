const express = require("express");
const router = express.Router();
const franchiseAuth = require("../middleware/franchiseAuthMiddleware");
const Subject = require("../models/Subject");
const Franchise = require("../models/Franchise");
const Settings = require("../models/Settings");
const CreditTransaction = require("../models/CreditTransaction");

// All routes require franchise authentication
router.use(franchiseAuth);

// Helper function to deduct credits
async function deductCredits(franchiseId, amount, description) {
  const franchise = await Franchise.findById(franchiseId);
  const currentCredits = franchise.credits || 0;
  
  if (currentCredits >= amount) {
    franchise.credits = currentCredits - amount;
    franchise.totalCreditsUsed = (franchise.totalCreditsUsed || 0) + amount;
    await franchise.save();

    await CreditTransaction.create({
      franchise: franchiseId,
      type: 'deduction',
      amount: amount,
      description: description,
      balanceAfter: franchise.credits,
    });
    return true;
  }
  return false;
}

// Get subjects for this franchise (own subjects only)
router.get("/", async (req, res) => {
  try {
    const franchiseId = req.franchise._id;
    const subjects = await Subject.find({ createdBy: franchiseId }).populate('course', 'title name').lean();
    res.json(subjects);
  } catch (err) {
    console.error("Franchise get subjects error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get single subject (own subjects only)
router.get("/:id", async (req, res) => {
  try {
    const franchiseId = req.franchise._id;
    const subject = await Subject.findOne({ _id: req.params.id, createdBy: franchiseId }).populate('course', 'title name').lean();
    
    if (!subject) {
      return res.status(404).json({ message: "Subject not found" });
    }
    
    res.json(subject);
  } catch (err) {
    console.error("Franchise get subject error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Create subject for this franchise - DEDUCT 5 CREDITS
router.post("/", async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    const creditPricing = settings.creditPricing || {};
    const subjectCost = creditPricing.subject || 5;

    // Check if franchise has enough credits
    const franchise = await Franchise.findById(req.franchise._id);
    if ((franchise.credits || 0) < subjectCost) {
      return res.status(400).json({ 
        message: `Insufficient credits. You need ${subjectCost} credits to create a subject.` 
      });
    }

    const subjectData = {
      ...req.body,
      createdBy: req.franchise._id,
    };

    const subject = new Subject(subjectData);
    await subject.save();

    // Deduct credits
    await deductCredits(
      req.franchise._id, 
      subjectCost, 
      `Subject created: ${subjectData.name}`
    );

    res.status(201).json(subject);
  } catch (err) {
    console.error("Franchise create subject error:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
});

// Update subject
router.put("/:id", async (req, res) => {
  try {
    const subject = await Subject.findOneAndUpdate(
      { 
        _id: req.params.id,
        createdBy: req.franchise._id
      },
      req.body,
      { new: true }
    );

    if (!subject) {
      return res.status(404).json({ message: "Subject not found" });
    }

    res.json(subject);
  } catch (err) {
    console.error("Franchise update subject error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete subject
router.delete("/:id", async (req, res) => {
  try {
    const result = await Subject.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.franchise._id
    });

    if (!result) {
      return res.status(404).json({ message: "Subject not found" });
    }

    res.json({ message: "Subject deleted successfully" });
  } catch (err) {
    console.error("Franchise delete subject error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
