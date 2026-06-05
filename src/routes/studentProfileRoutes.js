const express = require("express");
const router = express.Router();
const Student = require("../models/Student");
const Result = require("../models/Result");
const Certificate = require("../models/Certificate");
const AdmitCard = require("../models/AdmitCard");
const IDCard = require("../models/IDCard");
const Marksheet = require("../models/Marksheet");
const TypingCertificate = require("../models/TypingCertificate");
const studentAuth = require("../middleware/studentAuth");

router.get("/me", studentAuth, async (req, res) => {
  const student = await Student.findById(req.studentId).lean();

  if (!student) {
    return res.status(404).json({ success: false });
  }

  // Calculate fee totals and course name from courses array (if available) or fallback to legacy fields
  let totalFee = 0;
  let totalPaid = 0;

  if (student.courses && Array.isArray(student.courses) && student.courses.length > 0) {
    // Calculate from courses array
    totalFee = student.courses.reduce((sum, c) => sum + (Number(c.feeAmount) || 0), 0);
    totalPaid = student.courses.reduce((sum, c) => sum + (Number(c.amountPaid) || 0), 0);
    // Use course name from first course in array
    student.courseName = student.courses[0].courseName || student.courseName;
  } else {
    // Fallback to legacy fields
    totalFee = student.feeAmount || 0;
    totalPaid = student.amountPaid || 0;
  }

  student.feeAmount = totalFee;
  student.amountPaid = totalPaid;
  student.pendingAmount = totalFee - totalPaid;
  // Ensure courses array is available for frontend display
  student.courses = student.courses || [];

  res.json({ success: true, data: student });
});

/* ================= STUDENT ENROLLMENT INFO ================= */
router.get("/enrollment", studentAuth, async (req, res) => {
  try {
    const student = await Student.findById(req.studentId).select("-password").lean();

    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    // Use enrollmentNo if available, otherwise use rollNumber
    const enrollmentNo = student.enrollmentNo || student.rollNumber;

    // Calculate fee totals and course name from courses array (if available) or fallback to legacy fields
    let totalFee = 0;
    let totalPaid = 0;
    let courseName = student.courseName;

    if (student.courses && Array.isArray(student.courses) && student.courses.length > 0) {
      // Calculate from courses array
      totalFee = student.courses.reduce((sum, c) => sum + (Number(c.feeAmount) || 0), 0);
      totalPaid = student.courses.reduce((sum, c) => sum + (Number(c.amountPaid) || 0), 0);
      // Use course name from first course in array
      courseName = student.courses[0].courseName || student.courseName;
    } else {
      // Fallback to legacy fields
      totalFee = student.feeAmount || 0;
      totalPaid = student.amountPaid || 0;
    }

    res.json({
      success: true,
      data: {
        enrollmentNo: enrollmentNo,
        rollNumber: student.rollNumber,
        name: student.name,
        fatherName: student.fatherName,
        motherName: student.motherName,
        dob: student.dob,
        course: courseName,
        centerName: student.centerName,
        sessionStart: student.sessionStart,
        sessionEnd: student.sessionEnd,
        feesPaid: student.feesPaid,
        isCertified: student.isCertified,
        joinDate: student.joinDate,
        // Fee details
        feeAmount: totalFee,
        amountPaid: totalPaid,
        pendingAmount: totalFee - totalPaid,
        paymentDate: student.paymentDate,
        // All courses for display
        courses: student.courses || [],
      },
    });
  } catch (err) {
    console.error("Enrollment fetch error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* ================= STUDENT RESULT ================= */
router.get("/result", studentAuth, async (req, res) => {
  try {
    const student = await Student.findById(req.studentId).lean();

    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    // Find ALL results by rollNumber (multiple courses)
    const results = await Result.find({ rollNumber: student.rollNumber })
      .populate("course", "name")
      .populate("subjects.subject", "name code")
      .lean();

    if (!results || results.length === 0) {
      return res.status(404).json({ success: false, message: "No results found" });
    }

    // Add student info to each result
    const resultsWithStudentInfo = results.map(result => ({
      ...result,
      studentName: student.name,
      rollNumber: student.rollNumber,
      courseName: result.course?.name || student.courseName,
    }));

    res.json({
      success: true,
      data: resultsWithStudentInfo,
    });
  } catch (err) {
    console.error("Result fetch error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* ================= STUDENT CERTIFICATE ================= */
router.get("/certificate", studentAuth, async (req, res) => {
  try {
    const student = await Student.findById(req.studentId).lean();

    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    // Use enrollmentNo if available, otherwise use rollNumber
    const enrollmentNo = student.enrollmentNo || student.rollNumber;

    // Find ALL certificates by enrollmentNumber (multiple courses)
    const certificates = await Certificate.find({ enrollmentNumber: enrollmentNo }).lean();

    if (!certificates || certificates.length === 0) {
      return res.status(404).json({ success: false, message: "No certificates found" });
    }

    res.json({
      success: true,
      data: certificates,
    });
  } catch (err) {
    console.error("Certificate fetch error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* ================= STUDENT ADMIT CARD ================= */
router.get("/admit-card", studentAuth, async (req, res) => {
  try {
    const student = await Student.findById(req.studentId).lean();

    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    // Find admit card by student name (most reliable match)
    // First try to find by student ID reference if available
    let admitCard = await AdmitCard.findOne({ student: student._id }).lean();
    
    // If not found by reference, try by student name
    if (!admitCard) {
      admitCard = await AdmitCard.findOne({ studentName: student.name }).lean();
    }

    // If still not found, try to get student photo from any admit card with matching name
    if (!admitCard) {
      admitCard = await AdmitCard.findOne({ studentName: { $regex: new RegExp(student.name, 'i') } }).lean();
    }

    if (!admitCard) {
      return res.status(404).json({ success: false, message: "No admit card found" });
    }

    // Format the admit card data for the frontend
    const formattedCard = {
      rollNumber: admitCard.rollNumber,
      name: admitCard.studentName,
      fatherName: admitCard.fatherName,
      motherName: admitCard.motherName,
      course: admitCard.courseName,
      institute: admitCard.instituteName,
      center: admitCard.examCenterAddress,
      examDate: admitCard.examDate ? new Date(admitCard.examDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
      examTime: admitCard.examTime,
      reportingTime: admitCard.reportingTime,
      examDuration: admitCard.examDuration,
      // Include student photo from the student model
      photo: student.photo || null,
    };

    res.json({
      success: true,
      data: formattedCard,
    });
  } catch (err) {
    console.error("Admit card fetch error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* ================= STUDENT ID CARD ================= */
router.get("/id-card", studentAuth, async (req, res) => {
  try {
    const student = await Student.findById(req.studentId).lean();

    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    // Use enrollmentNo if available, otherwise use rollNumber
    const enrollmentNo = student.enrollmentNo || student.rollNumber;
    const studentName = student.name;
    const studentId = student._id;

    // Find ID card by student reference first, then by enrollment number, then by rollNumber
    let idCard = await IDCard.findOne({ student: studentId }).lean();

    // If not found by reference, try by enrollment number
    if (!idCard && enrollmentNo) {
      idCard = await IDCard.findOne({ enrollmentNo: enrollmentNo }).lean();
    }

    // Try by rollNumber if enrollmentNo is different
    if (!idCard && student.rollNumber) {
      idCard = await IDCard.findOne({ enrollmentNo: student.rollNumber }).lean();
    }

    // If still not found, try by student name
    if (!idCard && studentName) {
      idCard = await IDCard.findOne({ studentName: studentName }).lean();
    }

    // Last resort: try regex match on student name
    if (!idCard && studentName) {
      idCard = await IDCard.findOne({ studentName: { $regex: new RegExp(studentName, 'i') } }).lean();
    }

    if (!idCard) {
      return res.status(404).json({ success: false, message: "No ID card found" });
    }

    // Format the ID card data for the frontend
    const formattedCard = {
      studentName: idCard.studentName,
      fatherName: idCard.fatherName,
      motherName: idCard.motherName,
      enrollmentNo: idCard.enrollmentNo,
      dateOfBirth: idCard.dateOfBirth ? new Date(idCard.dateOfBirth).toLocaleDateString('en-IN') : '',
      contactNo: idCard.contactNo || '',
      address: idCard.address || '',
      mobileNo: idCard.mobileNo || '',
      centerMobileNo: idCard.centerMobileNo || '',
      courseName: idCard.courseName || '',
      centerName: idCard.centerName || '',
      sessionFrom: idCard.sessionFrom || '',
      sessionTo: idCard.sessionTo || '',
      // Include student photo from the student model
      photo: student.photo || idCard.photo || null,
    };

    res.json({
      success: true,
      data: formattedCard,
    });
  } catch (err) {
    console.error("ID card fetch error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* ================= STUDENT MARKSHEET ================= */
router.get("/marksheet", studentAuth, async (req, res) => {
  try {
    const student = await Student.findById(req.studentId).lean();
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    const enrollmentNo = student.enrollmentNo || student.rollNumber;

    let marksheets = await Marksheet.find({ enrollmentNo }).lean();
    if (!marksheets || marksheets.length === 0) {
      marksheets = await Marksheet.find({ rollNumber: student.rollNumber }).lean();
    }

    if (!marksheets || marksheets.length === 0) {
      return res.status(404).json({ success: false, message: "No marksheet found" });
    }

    res.json({ success: true, data: marksheets });
  } catch (err) {
    console.error("Marksheet fetch error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* ================= STUDENT TYPING CERTIFICATE ================= */
router.get("/typing-certificate", studentAuth, async (req, res) => {
  try {
    const student = await Student.findById(req.studentId).lean();
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    const enrollmentNo = student.enrollmentNo || student.rollNumber;

    let certs = await TypingCertificate.find({ enrollmentNumber: enrollmentNo }).lean();
    if (!certs || certs.length === 0) {
      certs = await TypingCertificate.find({ enrollmentNumber: student.rollNumber }).lean();
    }
    if (!certs || certs.length === 0) {
      certs = await TypingCertificate.find({ studentName: student.name }).lean();
    }

    if (!certs || certs.length === 0) {
      return res.status(404).json({ success: false, message: "No typing certificate found" });
    }

    res.json({ success: true, data: certs });
  } catch (err) {
    console.error("Typing certificate fetch error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
