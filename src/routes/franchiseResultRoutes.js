const express = require("express");
const router = express.Router();
const franchiseAuth = require("../middleware/franchiseAuthMiddleware");
const Result = require("../models/Result");
const Student = require("../models/Student");
const Course = require("../models/Course");
const Subject = require("../models/Subject");
const Franchise = require("../models/Franchise");
const Settings = require("../models/Settings");
const CreditTransaction = require("../models/CreditTransaction");

// All routes require franchise authentication
router.use(franchiseAuth);

// Same grading scale as resultController.js — keep these identical.
function calculateGrade(percentage) {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C';
  if (percentage >= 40) return 'D';
  return 'F';
}

// Resolves each subject from the Subject collection (ignoring any client-sent
// maxMarks/minMarks) and computes per-subject + overall grade/percentage/status,
// mirroring resultController.js's addResult/updateResult.
async function processSubjects(subjects) {
  let totalMaxMarks = 0;
  let totalObtained = 0;
  const processedSubjects = [];

  for (const sub of subjects) {
    const subjectDoc = await Subject.findById(sub.subject || sub.subjectId);
    if (!subjectDoc) {
      throw new Error(`Subject not found: ${sub.subject || sub.subjectId}`);
    }

    const maxMarks = subjectDoc.maxMarks || 100;
    const maxPracticalMarks = subjectDoc.maxPracticalMarks || 0;
    const marksObtained = Number(sub.marksObtained) || 0;
    const practicalMarks = Number(sub.practicalMarks) || 0;

    const subjectTotal = maxMarks + maxPracticalMarks;
    const obtainedTotal = marksObtained + practicalMarks;
    const subjectPercentage = subjectTotal > 0 ? (obtainedTotal / subjectTotal) * 100 : 0;

    totalMaxMarks += subjectTotal;
    totalObtained += obtainedTotal;

    processedSubjects.push({
      subject: subjectDoc._id,
      subjectName: subjectDoc.name,
      maxMarks,
      minMarks: subjectDoc.minMarks || 0,
      marksObtained,
      practicalMarks,
      maxPracticalMarks,
      grade: calculateGrade(subjectPercentage),
      status: obtainedTotal >= (subjectDoc.minMarks || 0) ? 'pass' : 'fail'
    });
  }

  const percentage = totalMaxMarks > 0 ? (totalObtained / totalMaxMarks) * 100 : 0;
  const overallGrade = calculateGrade(percentage);
  const resultStatus = processedSubjects.every((s) => s.status === 'pass') ? 'pass' : 'fail';

  return {
    subjects: processedSubjects,
    totalMarks: totalMaxMarks,
    totalObtained,
    percentage: Math.round(percentage * 100) / 100,
    overallGrade,
    resultStatus,
  };
}

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

// Get results for this franchise's students
router.get("/", async (req, res) => {
  try {
    // Get franchise's institute name
    const franchise = await Franchise.findById(req.franchise._id);
    const centerName = franchise.instituteName;
    
    // Find results for students from this franchise
    const results = await Result.find({ centerName }).lean();
    res.json(results);
  } catch (err) {
    console.error("Franchise get results error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get single result
router.get("/:id", async (req, res) => {
  try {
    const franchise = await Franchise.findById(req.franchise._id);
    const centerName = franchise.instituteName;
    
    const result = await Result.findOne({
      _id: req.params.id,
      centerName: centerName
    }).lean();
    
    if (!result) {
      return res.status(404).json({ message: "Result not found" });
    }
    
    res.json(result);
  } catch (err) {
    console.error("Franchise get result error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Create result for this franchise - DEDUCT 15 CREDITS
router.post("/", async (req, res) => {
  try {
    const {
      student: studentId,
      rollNumber,
      enrollmentNumber,
      dob,
      course: courseId,
      subjects = [],
      examSession = '',
      examDate,
      remarks = '',
    } = req.body || {};

    if (!studentId) {
      return res.status(400).json({ message: "Student is required" });
    }
    if (!rollNumber || !String(rollNumber).trim()) {
      return res.status(400).json({ message: "Roll Number is required" });
    }
    if (!courseId) {
      return res.status(400).json({ message: "Course is required" });
    }
    if (!subjects || subjects.length === 0) {
      return res.status(400).json({ message: "At least one subject with marks is required" });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const settings = await Settings.getSettings();
    const creditPricing = settings.creditPricing || {};
    const resultCost = creditPricing.result || 15;

    // Check if franchise has enough credits
    const franchise = await Franchise.findById(req.franchise._id);
    if ((franchise.credits || 0) < resultCost) {
      return res.status(400).json({
        message: `Insufficient credits. You need ${resultCost} credits to add a result.`
      });
    }

    let computed;
    try {
      computed = await processSubjects(subjects);
    } catch (subErr) {
      return res.status(404).json({ message: subErr.message });
    }

    const result = new Result({
      student: studentId,
      rollNumber: String(rollNumber).trim(),
      enrollmentNumber,
      dob: dob || null,
      course: courseId,
      ...computed,
      examSession,
      examDate: examDate ? new Date(examDate) : undefined,
      remarks,
      centerName: franchise.instituteName,
    });
    await result.save();

    // Deduct credits
    await deductCredits(
      req.franchise._id,
      resultCost,
      `Result added for: ${student.name || rollNumber}`
    );

    res.status(201).json(result);
  } catch (err) {
    console.error("Franchise create result error:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
});

// Update result
router.put("/:id", async (req, res) => {
  try {
    const franchise = await Franchise.findById(req.franchise._id);
    const centerName = franchise.instituteName;

    const result = await Result.findOne({ _id: req.params.id, centerName });
    if (!result) {
      return res.status(404).json({ message: "Result not found" });
    }

    const { subjects, examSession, examDate, remarks } = req.body || {};

    if (subjects && subjects.length > 0) {
      let computed;
      try {
        computed = await processSubjects(subjects);
      } catch (subErr) {
        return res.status(404).json({ message: subErr.message });
      }
      Object.assign(result, computed);
    }

    if (examSession !== undefined) result.examSession = examSession;
    if (examDate !== undefined) result.examDate = examDate ? new Date(examDate) : null;
    if (remarks !== undefined) result.remarks = remarks;

    await result.save();

    res.json(result);
  } catch (err) {
    console.error("Franchise update result error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete result
router.delete("/:id", async (req, res) => {
  try {
    const franchise = await Franchise.findById(req.franchise._id);
    const centerName = franchise.instituteName;
    
    const result = await Result.findOneAndDelete({
      _id: req.params.id,
      centerName: centerName
    });

    if (!result) {
      return res.status(404).json({ message: "Result not found" });
    }

    res.json({ message: "Result deleted successfully" });
  } catch (err) {
    console.error("Franchise delete result error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
