// server/src/models/Certificate.js
const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    fatherName: {
      type: String,
      required: true,
      trim: true,
    },
    courseName: {
      type: String,
      required: true,
      trim: true,
    },
    sessionFrom: {
      type: Number,
      required: true,
    },
    sessionTo: {
      type: Number,
      required: true,
    },
    grade: {
      type: String,
      required: true,
      trim: true,
    },
    enrollmentNumber: {
      type: String,
      required: true,
      trim: true,
    },
    certificateNumber: {
      type: String,
      required: true,
      trim: true,
    },
    issueDate: {
      type: Date,
      required: true,
    },
    courseDuration: {
      type: String,
      required: false,
      trim: true,
    },
    coursePeriodFrom: {
      type: Date,
      required: false,
    },
    coursePeriodTo: {
      type: Date,
      required: false,
    },
    // centerName and atcName are the same conceptual field (the "ATC-:" row on the
    // certificate template). Both are stored for DB compatibility but only centerName
    // is used for rendering. Default is '' (empty string) — never null — so
    // cert.centerName || cert.atcName always works correctly on the frontend.
    centerName: {
      type: String,
      default: '',
      trim: true,
    },
    atcName: {
      type: String,
      default: '',
      trim: true,
    },
    // Date of birth for public verification
    dob: {
      type: Date,
      required: false,
    },
    // Certificate image stored as base64 or URL
    certificateImage: {
      type: String,
      required: false,
    },
    // Photo URL for student photo on certificate (optional — may be Cloudinary URL)
    photo: {
      type: String,
      default: '',
    },
    // Marks a certificate issued by a franchise (null = admin-issued)
    franchiseId: {
      type: String,
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

// Indexes for faster lookups
certificateSchema.index({ enrollmentNumber: 1 });
certificateSchema.index({ certificateNumber: 1 });
certificateSchema.index({ name: 1 });
certificateSchema.index({ courseName: 1 });

certificateSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Certificate', certificateSchema);