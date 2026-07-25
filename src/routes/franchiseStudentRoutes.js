const express = require("express");
const router = express.Router();
const franchiseAuth = require("../middleware/franchiseAuthMiddleware");
const { uploadImage } = require("../middleware/upload");
const Student = require("../models/Student");
const Franchise = require("../models/Franchise");
const Settings = require("../models/Settings");
const CreditTransaction = require("../models/CreditTransaction");

function buildNumbers(seq) {
  return {
    rollNumber: String(seq),
    enrollmentNo: `SG${seq}`,
    certificateNo: `SGCSC${seq}`,
  };
}

// All routes require franchise authentication
router.use(franchiseAuth);

// Purely derived from the highest roll/enrollment/certificate number
// actually saved on a student — viewing/abandoning the form never advances
// anything, only a real student being created does.
router.get("/next-numbers", async (req, res) => {
  try {
    const seq = await Student.getNextSeq();
    res.json({ success: true, data: buildNumbers(seq) });
  } catch (err) {
    console.error("franchise next-numbers error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get students for this franchise
router.get("/", async (req, res) => {
  try {
    const franchiseName = req.franchise.instituteName;
    // Find students by centerName matching the franchise's instituteName
    const students = await Student.find({ centerName: franchiseName }).lean();
    
    res.json(students);
  } catch (err) {
    console.error("Franchise get students error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get single student
router.get("/:id", async (req, res) => {
  try {
    const franchiseName = req.franchise.instituteName;
    const student = await Student.findOne({
      _id: req.params.id,
      centerName: franchiseName
    }).lean();
    
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }
    
    res.json(student);
  } catch (err) {
    console.error("Franchise get student error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Create student for this franchise
router.post("/", uploadImage.single("photo"), async (req, res) => {
  try {
    // Parse courses if it's a string
    let coursesData = req.body.courses;
    if (typeof coursesData === "string") {
      try { coursesData = JSON.parse(coursesData); } catch (e) { coursesData = []; }
    }

    const franchiseName = req.franchise.instituteName;

    // Auto-generate numbers if not provided by user
    let { rollNumber, enrollmentNo, certificateNo } = req.body;
    const needsAutoGen = !rollNumber || !rollNumber.trim();

    if (needsAutoGen) {
      const seq = await Student.getNextSeq();
      const gen = buildNumbers(seq);
      rollNumber    = gen.rollNumber;
      enrollmentNo  = gen.enrollmentNo;
      certificateNo = gen.certificateNo;
    } else {
      rollNumber    = rollNumber.trim();
      enrollmentNo  = enrollmentNo  ? enrollmentNo.trim()  : `SG${rollNumber}`;
      certificateNo = certificateNo ? certificateNo.trim() : `SGCSC${rollNumber}`;
    }

    // Per-franchise uniqueness check for roll number
    const rollConflict = await Student.findOne({ rollNumber, centerName: franchiseName }).lean();
    if (rollConflict) {
      return res.status(400).json({ message: `Roll number "${rollNumber}" already exists in your center.` });
    }

    // Global uniqueness for enrollment and certificate numbers
    const [enrollConflict, certConflict] = await Promise.all([
      enrollmentNo  ? Student.findOne({ enrollmentNo }).lean()  : null,
      certificateNo ? Student.findOne({ certificateNo }).lean() : null,
    ]);
    if (enrollConflict) return res.status(400).json({ message: `Enrollment number "${enrollmentNo}" is already in use.` });
    if (certConflict)  return res.status(400).json({ message: `Certificate number "${certificateNo}" is already in use.` });

    const studentData = {
      ...req.body,
      courses: coursesData,
      centerName: franchiseName,
      rollNumber,
      enrollmentNo,
      certificateNo,
      username: req.body.username && req.body.username.trim() ? req.body.username.trim() : undefined,
      joinDate: req.body.sessionStart || new Date(),
    };

    if (req.file) studentData.photo = req.file.path;

    const student = new Student(studentData);
    await student.save();

    // Deduct credits for student creation
    try {
      const settings = await Settings.getSettings();
      const creditPricing = settings.creditPricing || { student: 10 };
      const studentCost = creditPricing.student || 10;

      // Get current franchise credits
      const franchise = await Franchise.findById(req.franchise._id);
      const currentCredits = franchise.credits || 0;

      if (currentCredits >= studentCost) {
        // Deduct credits
        franchise.credits = currentCredits - studentCost;
        franchise.totalCreditsUsed = (franchise.totalCreditsUsed || 0) + studentCost;
        await franchise.save();

        // Create transaction record
        await CreditTransaction.create({
          franchise: franchise._id,
          type: 'deduction',
          amount: studentCost,
          description: `Student enrollment: ${studentData.name} (${studentData.rollNumber || studentData.enrollmentNo})`,
          balanceAfter: franchise.credits,
        });
      }
    } catch (creditErr) {
      console.error("Error deducting credits:", creditErr);
      // Continue even if credit deduction fails - student is still created
    }

    res.status(201).json(student);
  } catch (err) {
    console.error("Franchise create student error:", err);
    
    if (err.code === 11000) {
      const key = Object.keys(err.keyPattern || {})[0];
      const messages = {
        rollNumber:   "Roll number already exists on another student on this platform.",
        enrollmentNo: "Enrollment number already exists on another student on this platform.",
        username:     "Username already taken.",
      };
      return res.status(400).json({ message: messages[key] || "A student with this information already exists." });
    }
    
    res.status(500).json({ message: err.message || "Server error" });
  }
});

// Update student
router.put("/:id", uploadImage.single("photo"), async (req, res) => {
  try {
    const franchiseName = req.franchise.instituteName;

    const existing = await Student.findOne({ _id: req.params.id, centerName: franchiseName });
    if (!existing) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Platform-wide uniqueness checks when the field is being changed
    if (req.body.rollNumber && req.body.rollNumber.trim() !== existing.rollNumber) {
      const conflict = await Student.findOne({ rollNumber: req.body.rollNumber.trim(), _id: { $ne: existing._id } }).lean();
      if (conflict) {
        return res.status(400).json({
          message: `Roll number "${req.body.rollNumber.trim()}" is already assigned to another student on this platform.`,
        });
      }
    }

    if (req.body.enrollmentNo && req.body.enrollmentNo.trim() !== existing.enrollmentNo) {
      const conflict = await Student.findOne({ enrollmentNo: req.body.enrollmentNo.trim(), _id: { $ne: existing._id } }).lean();
      if (conflict) {
        return res.status(400).json({
          message: `Enrollment number "${req.body.enrollmentNo.trim()}" is already assigned to another student on this platform.`,
        });
      }
    }

    // Parse courses if it's a string
    let coursesData = req.body.courses;
    if (typeof coursesData === "string") {
      try {
        coursesData = JSON.parse(coursesData);
      } catch (e) {
        coursesData = undefined;
      }
    }

    const updateData = {
      ...req.body,
      courses: coursesData,
      updatedAt: new Date(),
    };

    // Add photo URL if uploaded
    if (req.file) {
      updateData.photo = req.file.path;
    }

    const student = await Student.findOneAndUpdate(
      { _id: req.params.id, centerName: franchiseName },
      updateData,
      { new: true }
    );

    res.json(student);
  } catch (err) {
    console.error("Franchise update student error:", err);
    if (err.code === 11000) {
      const key = Object.keys(err.keyPattern || {})[0];
      const messages = {
        rollNumber:   "Roll number already exists on another student on this platform.",
        enrollmentNo: "Enrollment number already exists on another student on this platform.",
        username:     "Username already taken.",
      };
      return res.status(400).json({ message: messages[key] || "A student with this information already exists." });
    }
    res.status(500).json({ message: err.message || "Server error" });
  }
});

// Delete student
router.delete("/:id", async (req, res) => {
  try {
    const franchiseName = req.franchise.instituteName;
    const result = await Student.findOneAndDelete({
      _id: req.params.id,
      centerName: franchiseName
    });

    if (!result) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.json({ message: "Student deleted successfully" });
  } catch (err) {
    console.error("Franchise delete student error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
