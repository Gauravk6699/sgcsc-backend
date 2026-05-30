const express = require("express");
const router = express.Router();
const path = require("path"); // ← ADD THIS

const {
  verifyEnrollment,
  verifyResult,
  verifyCertificate,
  verifyCertificateByNumber,
} = require("../controllers/publicVerificationController");

router.post("/enrollment", verifyEnrollment);
router.post("/result", verifyResult);
router.post("/certificate", verifyCertificate);
router.get("/certificate/:certificateNumber", verifyCertificateByNumber);

// ← ADD THIS — serves the QR scan verification page
router.get("/verify/:certNo", (req, res) => {
  res.sendFile(path.join(__dirname, "../../../sgcsc-site/public/verify-certificate.html"));
});

module.exports = router;