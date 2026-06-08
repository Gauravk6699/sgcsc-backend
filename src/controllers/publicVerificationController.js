const Student = require("../models/Student");
const Result = require("../models/Result");
const Certificate = require("../models/Certificate");
const TypingCertificate = require("../models/TypingCertificate");
const Marksheet = require("../models/Marksheet");

/* ================= ENROLLMENT ================= */
exports.verifyEnrollment = async (req, res) => {
  try {
    const { enrollmentNo, dob } = req.body;

    if (!enrollmentNo) {
      return res.status(400).json({ success: false, message: "Enrollment number required" });
    }

    // Find by enrollmentNo or rollNumber (both are used as identifiers)
    const student = await Student.findOne({
      $or: [{ enrollmentNo }, { rollNumber: enrollmentNo }],
    }).select("-password");

    if (!student) {
      return res.status(404).json({ success: false });
    }

    // Verify DOB if provided
    if (dob && student.dob) {
      const inputDob = new Date(dob);
      const storedDob = new Date(student.dob);
      if (
        inputDob.getFullYear() !== storedDob.getFullYear() ||
        inputDob.getMonth() !== storedDob.getMonth() ||
        inputDob.getDate() !== storedDob.getDate()
      ) {
        return res.status(404).json({ success: false });
      }
    }

    res.json({
      success: true,
      data: {
        name: student.name,
        fatherName: student.fatherName,
        motherName: student.motherName,
        gender: student.gender,
        dob: student.dob,
        email: student.email,
        mobile: student.mobile || student.contact,
        state: student.state,
        district: student.district,
        address: student.address,
        rollNumber: student.rollNumber,
        enrollmentNo: student.enrollmentNo,
        courseName: student.courseName,
        courses: student.courses,
        examPassed: student.examPassed,
        board: student.board,
        marksOrGrade: student.marksOrGrade,
        centerName: student.centerName,
        sessionStart: student.sessionStart,
        sessionEnd: student.sessionEnd,
        feeAmount: student.feeAmount,
        amountPaid: student.amountPaid,
        pendingAmount: student.pendingAmount,
        feesPaid: student.feesPaid,
        isCertified: student.isCertified,
        joinDate: student.joinDate,
        photo: student.photo,
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
    const { rollNumber, dob } = req.body;

    if (!rollNumber) {
      return res.status(400).json({ success: false, message: "Roll number required" });
    }
    if (!dob) {
      return res.status(400).json({ success: false, message: "Date of birth required" });
    }

    const marksheets = await Marksheet.find({ rollNumber });

    if (!marksheets || marksheets.length === 0) {
      return res.status(404).json({ success: false, message: "Result not found" });
    }

    // Verify DOB against the first marksheet
    const inputDob = new Date(dob);
    const storedDob = new Date(marksheets[0].dob);
    if (
      inputDob.getFullYear() !== storedDob.getFullYear() ||
      inputDob.getMonth() !== storedDob.getMonth() ||
      inputDob.getDate() !== storedDob.getDate()
    ) {
      return res.status(404).json({ success: false, message: "Result not found" });
    }

    res.json({ success: true, data: marksheets });
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
    const { enrollmentNumber, dob } = req.body;

    if (!enrollmentNumber) {
      return res.status(400).json({ success: false, message: "Enrollment number required" });
    }

    // Fetch both student certificates and typing certificates in parallel
    const [certificates, typingCerts] = await Promise.all([
      Certificate.find({ enrollmentNumber }),
      TypingCertificate.find({ enrollmentNumber }),
    ]);

    if (certificates.length === 0 && typingCerts.length === 0) {
      return res.status(404).json({ success: false, message: "No certificates found" });
    }

    // DOB check if provided — match against student cert dob or typing cert (no dob field there)
    if (dob) {
      const inputDob = new Date(dob);
      const certWithDob = certificates.find((c) => c.dob);
      if (certWithDob) {
        const storedDob = new Date(certWithDob.dob);
        if (
          inputDob.getFullYear() !== storedDob.getFullYear() ||
          inputDob.getMonth() !== storedDob.getMonth() ||
          inputDob.getDate() !== storedDob.getDate()
        ) {
          return res.status(404).json({ success: false, message: "Certificate not found" });
        }
      }
    }

    // Tag each record with certType so the frontend can pick the right renderer
    const tagged = [
      ...certificates.map((c) => ({ ...c.toObject(), certType: "student" })),
      ...typingCerts.map((c) => ({ ...c.toObject(), certType: "typing" })),
    ];

    res.json({ success: true, data: tagged });
  } catch (err) {
    console.error("Certificate verification error:", err);
    res.status(500).json({ success: false });
  }
};

/* ================= TYPING CERTIFICATE BY NUMBER (QR scan) ================= */
exports.verifyTypingCertificateByNumber = async (req, res) => {
  try {
    const { certificateNo } = req.params;
    if (!certificateNo) {
      return res.status(400).json({ success: false, message: "Certificate number required" });
    }

    const cert = await TypingCertificate.findOne({ certificateNo });
    if (!cert) {
      return res.status(404).json({ success: false, message: "Typing certificate not found" });
    }

    res.json({ success: true, data: cert });
  } catch (err) {
    console.error("Typing certificate verification error:", err);
    res.status(500).json({ success: false });
  }
};
