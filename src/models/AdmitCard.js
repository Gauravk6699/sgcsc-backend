// server/src/models/AdmitCard.js
const mongoose = require('mongoose');

const admitCardSchema = new mongoose.Schema(
  {
    rollNumber: {
      type: String,
      required: true,
      trim: true,
    },
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
    courseName: {
      type: String,
      required: true,
      trim: true,
    },
    instituteName: {
      type: String,
      required: true,
      trim: true,
    },
    examCenterAddress: {
      type: String,
      required: true,
      trim: true,
    },
    examDate: {
      type: Date,
      required: true,
    },
    examTime: {
      type: String,
      required: true,
      trim: true,
    },
    reportingTime: {
      type: String,
      required: true,
      trim: true,
    },
    examDuration: {
      type: String,
      required: true,
      trim: true,
    },
    // Optional link to Student if you ever want it
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      default: null,
    },
    // Optional reference to Course
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      default: null,
    },
    franchiseId: {
      type: String,
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

// Quick lookup by roll number and student name
admitCardSchema.index({ rollNumber: 1 });
admitCardSchema.index({ studentName: 1 });

admitCardSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('AdmitCard', admitCardSchema);
