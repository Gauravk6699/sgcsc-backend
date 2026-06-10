const express = require("express");
const router = express.Router();
const TypingCertificate = require("../models/TypingCertificate");

// Create typing certificate
router.post("/", async (req, res) => {
  try {
    const { studentName, fatherHusbandName, motherName, enrollmentNumber, computerTyping, certificateNo, dateOfIssue, sessionFrom, sessionTo, grade, studyCentre, wordsPerMinute, photo, certificateImage } = req.body;

    if (!studentName || !fatherHusbandName || !motherName || !enrollmentNumber || !computerTyping || !certificateNo || !dateOfIssue || !sessionFrom || !sessionTo || !grade || !studyCentre || !wordsPerMinute) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required: studentName, fatherHusbandName, motherName, enrollmentNumber, computerTyping, certificateNo, dateOfIssue, sessionFrom, sessionTo, grade, studyCentre, wordsPerMinute'
      });
    }

    const duplicate = await TypingCertificate.findOne({ certificateNo: String(certificateNo).trim() });
    if (duplicate) {
      return res.status(400).json({ success: false, message: 'Certificate number already exists. Use a unique certificate number.' });
    }

    const typingCertificate = new TypingCertificate({
      studentName: String(studentName).trim(),
      fatherHusbandName: String(fatherHusbandName).trim(),
      motherName: String(motherName).trim(),
      enrollmentNumber: String(enrollmentNumber).trim(),
      computerTyping: String(computerTyping).trim(),
      certificateNo: String(certificateNo).trim(),
      dateOfIssue: new Date(dateOfIssue),
      sessionFrom: String(sessionFrom).trim(),
      sessionTo: String(sessionTo).trim(),
      grade: String(grade).trim(),
      studyCentre: String(studyCentre).trim(),
      wordsPerMinute: String(wordsPerMinute).trim(),
      photo: photo || null,
      certificateImage: certificateImage || null,
    });

    await typingCertificate.save();

    res.status(201).json({
      success: true,
      message: 'Typing certificate created successfully',
      data: typingCertificate
    });
  } catch (err) {
    console.error('Create typing certificate error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error while creating typing certificate'
    });
  }
});

// Get all typing certificates
router.get("/", async (req, res) => {
  try {
    const { search } = req.query;

    let query = {};
    if (search) {
      const rx = new RegExp(search, 'i');
      query = {
        $or: [
          { studentName: rx },
          { enrollmentNumber: rx },
          { certificateNo: rx }
        ]
      };
    }

    const typingCertificates = await TypingCertificate.find(query).sort({ createdAt: -1 });
    res.json({
      success: true,
      data: typingCertificates
    });
  } catch (err) {
    console.error('Fetch typing certificates error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching typing certificates'
    });
  }
});

// Get single typing certificate
router.get("/:id", async (req, res) => {
  try {
    const typingCertificate = await TypingCertificate.findById(req.params.id);
    if (!typingCertificate) {
      return res.status(404).json({
        success: false,
        message: 'Typing certificate not found'
      });
    }
    res.json({
      success: true,
      data: typingCertificate
    });
  } catch (err) {
    console.error('Fetch typing certificate error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching typing certificate'
    });
  }
});

// Update typing certificate
router.put("/:id", async (req, res) => {
  try {
    const { studentName, fatherHusbandName, motherName, enrollmentNumber, computerTyping, certificateNo, dateOfIssue, sessionFrom, sessionTo, grade, studyCentre, wordsPerMinute, photo, certificateImage } = req.body;

    const update = {};
    if (studentName != null) update.studentName = String(studentName).trim();
    if (fatherHusbandName != null) update.fatherHusbandName = String(fatherHusbandName).trim();
    if (motherName != null) update.motherName = String(motherName).trim();
    if (enrollmentNumber != null) update.enrollmentNumber = String(enrollmentNumber).trim();
    if (computerTyping != null) update.computerTyping = String(computerTyping).trim();
    if (certificateNo != null) update.certificateNo = String(certificateNo).trim();
    if (dateOfIssue != null) update.dateOfIssue = new Date(dateOfIssue);
    if (sessionFrom != null) update.sessionFrom = String(sessionFrom).trim();
    if (sessionTo != null) update.sessionTo = String(sessionTo).trim();
    if (grade != null) update.grade = String(grade).trim();
    if (studyCentre != null) update.studyCentre = String(studyCentre).trim();
    if (wordsPerMinute != null) update.wordsPerMinute = String(wordsPerMinute).trim();
    if (photo != null) update.photo = photo;
    if (certificateImage != null) update.certificateImage = certificateImage;

    const typingCertificate = await TypingCertificate.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true }
    );

    if (!typingCertificate) {
      return res.status(404).json({
        success: false,
        message: 'Typing certificate not found'
      });
    }

    res.json({
      success: true,
      message: 'Typing certificate updated successfully',
      data: typingCertificate
    });
  } catch (err) {
    console.error('Update typing certificate error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error while updating typing certificate'
    });
  }
});

// Delete typing certificate
router.delete("/:id", async (req, res) => {
  try {
    const typingCertificate = await TypingCertificate.findByIdAndDelete(req.params.id);
    if (!typingCertificate) {
      return res.status(404).json({
        success: false,
        message: 'Typing certificate not found'
      });
    }

    res.json({
      success: true,
      message: 'Typing certificate deleted successfully'
    });
  } catch (err) {
    console.error('Delete typing certificate error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting typing certificate'
    });
  }
});

module.exports = router;