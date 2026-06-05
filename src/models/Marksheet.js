// server/src/models/Marksheet.js
const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  subjectName: {
    type: String,
    required: true,
    trim: true,
  },
  theoryMarks: {
    type: Number,
    default: 0,
  },
  practicalMarks: {
    type: Number,
    default: 0,
  },
  maxTheoryMarks: {
    type: Number,
    default: 100,
  },
  maxPracticalMarks: {
    type: Number,
    default: 0,
  },
  combinedMarks: {
    type: Number,
    default: 0,
  },
  maxCombinedMarks: {
    type: Number,
    default: 100,
  },
  grade: {
    type: String,
    default: '',
  },
});

const marksheetSchema = new mongoose.Schema(
  {
    // Student details (auto-fetched via enrollment number)
    enrollmentNo: {
      type: String,
      required: true,
      trim: true,
      index: true,
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
    rollNumber: {
      type: String,
      required: true,
      trim: true,
    },
    dob: {
      type: Date,
      required: true,
    },

    // Course period
    coursePeriodFrom: {
      type: Date,
      required: true,
    },
    coursePeriodTo: {
      type: Date,
      required: true,
    },
    courseDuration: {
      type: String,
      required: true,
      trim: true,
    },
    dateOfIssue: {
      type: Date,
      required: true,
    },

    // Subjects with marks
    subjects: [subjectSchema],

    // Calculated totals
    totalTheoryMarks: {
      type: Number,
      default: 0,
    },
    totalPracticalMarks: {
      type: Number,
      default: 0,
    },
    totalCombinedMarks: {
      type: Number,
      default: 0,
    },
    maxTotalMarks: {
      type: Number,
      default: 0,
    },
    percentage: {
      type: Number,
      default: 0,
    },
    overallGrade: {
      type: String,
      default: '',
    },

    // Optional references
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      default: null,
    },
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

// Index for quick lookup
marksheetSchema.index({ enrollmentNo: 1 });
marksheetSchema.index({ rollNumber: 1 });
marksheetSchema.index({ studentName: 1 });

marksheetSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Marksheet', marksheetSchema);
