const express = require("express");
const router = express.Router();
const franchiseAuth = require("../middleware/franchiseAuthMiddleware");
const { uploadImage } = require("../middleware/upload");
const Course = require("../models/Course");
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

// Get courses for this franchise (own courses only)
router.get("/", async (req, res) => {
  try {
    const franchiseId = req.franchise._id;
    const courses = await Course.find({ createdBy: franchiseId }).lean();
    res.json(courses);
  } catch (err) {
    console.error("Franchise get courses error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get single course (own courses only)
router.get("/:id", async (req, res) => {
  try {
    const franchiseId = req.franchise._id;
    const course = await Course.findOne({ _id: req.params.id, createdBy: franchiseId }).lean();
    
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    
    res.json(course);
  } catch (err) {
    console.error("Franchise get course error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Create course for this franchise - DEDUCT 20 CREDITS
router.post("/", async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    const creditPricing = settings.creditPricing || {};
    const courseCost = creditPricing.course || 20;

    // Check if franchise has enough credits
    const franchise = await Franchise.findById(req.franchise._id);
    if ((franchise.credits || 0) < courseCost) {
      return res.status(400).json({ 
        message: `Insufficient credits. You need ${courseCost} credits to create a course.` 
      });
    }

    const courseData = {
      ...req.body,
      createdBy: req.franchise._id,
    };

    const course = new Course(courseData);
    await course.save();

    // Deduct credits
    await deductCredits(
      req.franchise._id, 
      courseCost, 
      `Course created: ${courseData.name}`
    );

    res.status(201).json(course);
  } catch (err) {
    console.error("Franchise create course error:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
});

// Update course
router.put("/:id", async (req, res) => {
  try {
    const course = await Course.findOneAndUpdate(
      { 
        _id: req.params.id,
        createdBy: req.franchise._id
      },
      req.body,
      { new: true }
    );

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    res.json(course);
  } catch (err) {
    console.error("Franchise update course error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete course
router.delete("/:id", async (req, res) => {
  try {
    const result = await Course.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.franchise._id
    });

    if (!result) {
      return res.status(404).json({ message: "Course not found" });
    }

    res.json({ message: "Course deleted successfully" });
  } catch (err) {
    console.error("Franchise delete course error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
