// server/src/models/Subject.js
const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema(
  {
    // Reference to Course collection
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },

    // Subject name (e.g., "Computer Basics")
    name: {
      type: String,
      required: true,
      trim: true,
    },

    // Maximum theory marks for this subject
    maxMarks: {
      type: Number,
      default: 0,
    },

    // Maximum practical marks for this subject
    maxPracticalMarks: {
      type: Number,
      default: 0,
    },

    // Minimum passing marks
    minMarks: {
      type: Number,
      default: 0,
    },

    // For soft-hiding without deleting
    isActive: {
      type: Boolean,
      default: true,
    },

    // Track which franchise created this subject (null = admin created)
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Franchise',
      default: null
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Subject', subjectSchema);
