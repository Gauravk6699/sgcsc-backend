const express = require("express");
const router = express.Router();
const path = require("path"); // ← ADD THIS

const {
  verifyEnrollment,
  verifyResult,
  verifyCertificate,
  verifyCertificateByNumber,
  verifyTypingCertificateByNumber,
} = require("../controllers/publicVerificationController");

router.post("/enrollment", verifyEnrollment);
router.post("/result", verifyResult);
router.post("/certificate", verifyCertificate);
router.get("/certificate/:certificateNumber", verifyCertificateByNumber);

// Typing certificate verification API (called by verify-certificate.html)
router.get("/typing-certificate/:certificateNo", verifyTypingCertificateByNumber);

// Serves the QR scan verification page for both student and typing certs
router.get("/verify/typing/:certNo", (req, res) => {
  res.sendFile(path.join(__dirname, "../../../sgcsc-site/public/verify-certificate.html"));
});
router.get("/verify/:certNo", (req, res) => {
  res.sendFile(path.join(__dirname, "../../../sgcsc-site/public/verify-certificate.html"));
});

module.exports = router;