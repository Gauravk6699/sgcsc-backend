const express = require("express");
const router = express.Router();

const {
  verifyEnrollment,
  verifyResult,
} = require("../controllers/publicVerificationController");

router.post("/enrollment", verifyEnrollment);
router.post("/result", verifyResult);

module.exports = router;