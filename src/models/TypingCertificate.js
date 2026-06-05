// server/src/models/TypingCertificate.js
const mongoose = require('mongoose');

const typingCertificateSchema = new mongoose.Schema(
  {
    studentName: {
      type: String,
      required: true,
      trim: true,
    },
    fatherHusbandName: {
      type: String,
      required: true,
      trim: true,
    },
    motherName: {
      type: String,
      required: true,
      trim: true,
    },
    enrollmentNumber: {
      type: String,
      required: true,
      trim: true,
    },
    computerTyping: {
      type: String,
      required: true,
      trim: true,
    },
    certificateNo: {
      type: String,
      required: true,
      trim: true,
    },
    dateOfIssue: {
      type: Date,
      required: true,
    },
    sessionFrom: {
      type: String,
      required: true,
      trim: true,
    },
    sessionTo: {
      type: String,
      required: true,
      trim: true,
    },
    grade: {
      type: String,
      required: true,
      trim: true,
    },
    studyCentre: {
      type: String,
      required: true,
      trim: true,
    },
    wordsPerMinute: {
      type: String,
      required: true,
      trim: true,
    },
    // Student photo URL (used on the certificate)
    photo: {
      type: String,
      required: false
    },
    // Certificate image stored as base64 or URL
    certificateImage: {
      type: String,
      required: false
    }
  },
  { timestamps: true }
);

// Index for faster lookups
typingCertificateSchema.index({ studentName: 1 });
typingCertificateSchema.index({ enrollmentNumber: 1 });
typingCertificateSchema.index({ certificateNo: 1 });

typingCertificateSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('TypingCertificate', typingCertificateSchema);