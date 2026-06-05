// server/src/models/IDCard.js
const mongoose = require('mongoose');

const idCardSchema = new mongoose.Schema(
  {
    studentName: {
      type: String,
      required: true,
      trim: true,
    },
    fatherName: {
      type: String,
      required: true,
      trim: true,
    },
    motherName: {
      type: String,
      required: true,
      trim: true,
    },
    enrollmentNo: {
      type: String,
      required: true,
      trim: true,
    },
    dateOfBirth: {
      type: Date,
      required: true,
    },
    contactNo: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    mobileNo: {
      type: String,
      trim: true,
    },
    centerMobileNo: {
      type: String,
      trim: true,
    },
    courseName: {
      type: String,
      trim: true,
    },
    centerName: {
      type: String,
      trim: true,
    },
    // Session field for the ID card - from and to
    sessionFrom: {
      type: String,
      trim: true,
    },
    sessionTo: {
      type: String,
      trim: true,
    },
    // Optional photo field - can be linked to student photo
    photo: {
      type: String,
      trim: true,
    },
    // Link to student for easy lookup
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
    },
    franchiseId: {
      type: String,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
idCardSchema.index({ studentName: 1 });
idCardSchema.index({ enrollmentNo: 1 });

module.exports = mongoose.model('IDCard', idCardSchema);