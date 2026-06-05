const express = require("express");
const router = express.Router();
const franchiseAuth = require("../middleware/franchiseAuthMiddleware");
const Marksheet = require("../models/Marksheet");
const Student = require("../models/Student");

router.use(franchiseAuth);

function parseDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? null : d;
}

function calculateGrade(pct) {
  if (pct >= 85) return "A+";
  if (pct >= 70) return "A";
  if (pct >= 55) return "B";
  if (pct >= 40) return "C";
  return "F";
}

// GET /student/:enrollmentNo — auto-fill lookup for franchise students only
router.get("/student/:enrollmentNo", async (req, res) => {
  try {
    const franchise = req.franchise;
    const student = await Student.findOne({
      $or: [
        { enrollmentNo: req.params.enrollmentNo, centerName: franchise.instituteName },
        { rollNumber: req.params.enrollmentNo, centerName: franchise.instituteName },
      ],
    }).lean();

    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found in your franchise" });
    }

    return res.json({
      success: true,
      data: {
        studentName: student.name || "",
        fatherName: student.fatherName || "",
        motherName: student.motherName || "",
        rollNumber: student.rollNumber || "",
        dob: student.dob || null,
        courseName: student.courseName || "",
        instituteName: franchise.instituteName || "",
        studentId: student._id,
      },
    });
  } catch (err) {
    console.error("franchise marksheet student lookup error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// GET / — list this franchise's marksheets
router.get("/", async (req, res) => {
  try {
    const franchiseId = req.franchise._id.toString();
    const { search } = req.query;
    const filter = { franchiseId };
    if (search?.trim()) {
      const rx = new RegExp(search.trim(), "i");
      filter.$and = [
        { franchiseId },
        { $or: [{ enrollmentNo: rx }, { studentName: rx }, { courseName: rx }, { rollNumber: rx }] },
      ];
      delete filter.franchiseId;
    }
    const marksheets = await Marksheet.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: marksheets });
  } catch (err) {
    console.error("franchise get marksheets error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// GET /:id — single marksheet
router.get("/:id", async (req, res) => {
  try {
    const franchiseId = req.franchise._id.toString();
    const marksheet = await Marksheet.findOne({ _id: req.params.id, franchiseId }).lean();
    if (!marksheet) return res.status(404).json({ success: false, message: "Marksheet not found" });
    res.json({ success: true, data: marksheet });
  } catch (err) {
    console.error("franchise get marksheet error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// POST / — create marksheet (instituteName auto-set from franchise)
router.post("/", async (req, res) => {
  try {
    const franchise = req.franchise;
    const franchiseId = franchise._id.toString();
    const instituteName = franchise.instituteName || "";

    const {
      enrollmentNo, studentName, fatherName, motherName, courseName,
      rollNumber, dob, coursePeriodFrom, coursePeriodTo, courseDuration,
      dateOfIssue, subjects, studentId, courseId,
    } = req.body;

    if (!enrollmentNo || !studentName || !fatherName || !motherName || !courseName ||
        !rollNumber || !dob || !coursePeriodFrom || !coursePeriodTo || !courseDuration ||
        !dateOfIssue || !Array.isArray(subjects) || subjects.length === 0) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const parsedDob = parseDate(dob);
    const parsedFrom = parseDate(coursePeriodFrom);
    const parsedTo = parseDate(coursePeriodTo);
    const parsedIssue = parseDate(dateOfIssue);

    if (!parsedDob || !parsedFrom || !parsedTo || !parsedIssue) {
      return res.status(400).json({ success: false, message: "Invalid date format" });
    }

    let totalTheory = 0, totalPractical = 0, totalCombined = 0, maxTotal = 0;

    const processedSubjects = subjects.map((s) => {
      const theory = Number(s.theoryMarks) || 0;
      const practical = Number(s.practicalMarks) || 0;
      const maxTheory = Number(s.maxTheoryMarks) || 100;
      const maxPractical = Number(s.maxPracticalMarks) || 0;
      const combined = theory + practical;
      const maxCombined = maxTheory + maxPractical;
      totalTheory += theory;
      totalPractical += practical;
      totalCombined += combined;
      maxTotal += maxCombined;
      return {
        subjectName: s.subjectName?.trim() || "",
        theoryMarks: theory,
        practicalMarks: practical,
        maxTheoryMarks: maxTheory,
        maxPracticalMarks: maxPractical,
        combinedMarks: combined,
        maxCombinedMarks: maxCombined,
        grade: s.grade?.trim() || "",
      };
    });

    const percentage = maxTotal > 0 ? (totalCombined / maxTotal) * 100 : 0;
    const overallGrade = calculateGrade(percentage);

    let studentDoc = null;
    if (studentId) {
      studentDoc = await Student.findById(studentId);
    }

    const marksheet = await Marksheet.create({
      enrollmentNo: String(enrollmentNo).trim(),
      studentName: String(studentName).trim(),
      fatherName: String(fatherName).trim(),
      motherName: String(motherName).trim(),
      courseName: String(courseName).trim(),
      instituteName,
      rollNumber: String(rollNumber).trim(),
      dob: parsedDob,
      coursePeriodFrom: parsedFrom,
      coursePeriodTo: parsedTo,
      courseDuration: String(courseDuration).trim(),
      dateOfIssue: parsedIssue,
      subjects: processedSubjects,
      totalTheoryMarks: totalTheory,
      totalPracticalMarks: totalPractical,
      totalCombinedMarks: totalCombined,
      maxTotalMarks: maxTotal,
      percentage: Math.round(percentage * 100) / 100,
      overallGrade,
      student: studentDoc ? studentDoc._id : null,
      course: courseId || null,
      franchiseId,
    });

    res.status(201).json({ success: true, data: marksheet });
  } catch (err) {
    console.error("franchise create marksheet error:", err);
    res.status(500).json({ success: false, message: err.message || "Server error" });
  }
});

// PUT /:id — update marksheet
router.put("/:id", async (req, res) => {
  try {
    const franchiseId = req.franchise._id.toString();
    const update = { ...req.body };
    delete update.franchiseId;
    delete update.instituteName;

    if (update.dob) { const p = parseDate(update.dob); if (!p) return res.status(400).json({ success: false, message: "Invalid dob" }); update.dob = p; }
    if (update.coursePeriodFrom) { const p = parseDate(update.coursePeriodFrom); if (!p) return res.status(400).json({ success: false, message: "Invalid coursePeriodFrom" }); update.coursePeriodFrom = p; }
    if (update.coursePeriodTo) { const p = parseDate(update.coursePeriodTo); if (!p) return res.status(400).json({ success: false, message: "Invalid coursePeriodTo" }); update.coursePeriodTo = p; }
    if (update.dateOfIssue) { const p = parseDate(update.dateOfIssue); if (!p) return res.status(400).json({ success: false, message: "Invalid dateOfIssue" }); update.dateOfIssue = p; }

    if (update.subjects && Array.isArray(update.subjects)) {
      let tt = 0, tp = 0, tc = 0, mt = 0;
      const ps = update.subjects.map((s) => {
        const theory = Number(s.theoryMarks) || 0;
        const practical = Number(s.practicalMarks) || 0;
        const maxTheory = Number(s.maxTheoryMarks) || 100;
        const maxPractical = Number(s.maxPracticalMarks) || 0;
        const combined = theory + practical;
        const maxCombined = maxTheory + maxPractical;
        tt += theory; tp += practical; tc += combined; mt += maxCombined;
        return { subjectName: s.subjectName?.trim() || "", theoryMarks: theory, practicalMarks: practical, maxTheoryMarks: maxTheory, maxPracticalMarks: maxPractical, combinedMarks: combined, maxCombinedMarks: maxCombined, grade: s.grade?.trim() || "" };
      });
      const pct = mt > 0 ? (tc / mt) * 100 : 0;
      Object.assign(update, { subjects: ps, totalTheoryMarks: tt, totalPracticalMarks: tp, totalCombinedMarks: tc, maxTotalMarks: mt, percentage: Math.round(pct * 100) / 100, overallGrade: calculateGrade(pct) });
    }

    const marksheet = await Marksheet.findOneAndUpdate(
      { _id: req.params.id, franchiseId },
      update,
      { new: true }
    );
    if (!marksheet) return res.status(404).json({ success: false, message: "Marksheet not found" });
    res.json({ success: true, data: marksheet });
  } catch (err) {
    console.error("franchise update marksheet error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// DELETE /:id
router.delete("/:id", async (req, res) => {
  try {
    const franchiseId = req.franchise._id.toString();
    const marksheet = await Marksheet.findOneAndDelete({ _id: req.params.id, franchiseId });
    if (!marksheet) return res.status(404).json({ success: false, message: "Marksheet not found" });
    res.json({ success: true, message: "Marksheet deleted" });
  } catch (err) {
    console.error("franchise delete marksheet error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
