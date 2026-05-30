const Student = require("../models/Student");
const Result = require("../models/Result");
const Certificate = require("../models/Certificate");
const Marksheet = require("../models/Marksheet");

/* ================= ENROLLMENT ================= */
exports.verifyEnrollment = async (req, res) => {
  try {
    const { rollNumber } = req.body;

    // Find by rollNumber only
    const student = await Student.findOne({
      rollNumber,
    }).select("-password");

    if (!student) {
      return res.status(404).json({ success: false });
    }

    res.json({
      success: true,
      data: {
        name: student.name,
        course: student.courseName,
        session: student.sessionStart && student.sessionEnd
          ? `${new Date(student.sessionStart).getFullYear()} - ${new Date(student.sessionEnd).getFullYear()}`
          : '-',
        status: student.isCertified ? 'Certified' : 'Enrolled',
      },
    });
  } catch (err) {
    console.error("Enrollment verification error:", err);
    res.status(500).json({ success: false });
  }
};

// Helper function to parse DD-MM-YYYY date string
const parseDob = (dobStr) => {
  if (!dobStr) return null;
  const [day, month, year] = dobStr.split('-');
  if (!day || !month || !year) return null;
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
};

/* ================= RESULT ================= */
exports.verifyResult = async (req, res) => {
  try {
    const { rollNumber } = req.body;
    console.log("Verifying result for rollNumber:", rollNumber);

    // Find marksheets by rollNumber or enrollmentNo (marksheets are the final results)
    const marksheets = await Marksheet.find({
      $or: [
        { rollNumber: rollNumber },
        { enrollmentNo: rollNumber }
      ]
    });
    console.log("Found marksheets:", marksheets.length);

    if (marksheets.length > 0) {
      console.log("First marksheet rollNumber:", marksheets[0].rollNumber, "enrollmentNo:", marksheets[0].enrollmentNo);
    }

    if (!marksheets || marksheets.length === 0) {
      return res.status(404).json({ success: false, message: "Result not found" });
    }

    res.json({
      success: true,
      data: marksheets, // Return array of marksheets
    });
  } catch (err) {
    console.error("Result verification error:", err);
    res.status(500).json({ success: false });
  }
};

/* ================= CERTIFICATE BY NUMBER (QR scan) ================= */
exports.verifyCertificateByNumber = async (req, res) => {
  try {
    const { certificateNumber } = req.params;
    if (!certificateNumber) {
      return res.status(400).json({ success: false, message: "Certificate number required" });
    }

    const certificate = await Certificate.findOne({ certificateNumber });
    if (!certificate) {
      return res.status(404).json({ success: false, message: "Certificate not found" });
    }

    res.json({ success: true, data: certificate });
  } catch (err) {
    console.error("Certificate verification by number error:", err);
    res.status(500).json({ success: false });
  }
};

/* ================= CERTIFICATE ================= */
exports.verifyCertificate = async (req, res) => {
  try {
    const { rollNumber, certNo } = req.body;
    
    // Try certNo from URL params first, then from body
    const certificateNumber = certNo || req.params.certNo || rollNumber;

    // Find certificate by certificateNumber
    const certificate = await Certificate.findOne({
      certificateNumber: certificateNumber
    });

    if (!certificate) {
      return res.status(404).json({ success: false, message: "Certificate not found" });
    }

    res.json({
      success: true,
      data: certificate,
    });
  } catch (err) {
    console.error("Certificate verification error:", err);
    res.status(500).json({ success: false });
  }
};
