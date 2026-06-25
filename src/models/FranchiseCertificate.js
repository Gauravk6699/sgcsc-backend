// server/src/models/FranchiseCertificate.js
const mongoose = require('mongoose');

const franchiseCertificateSchema = new mongoose.Schema(
  {
    franchiseName: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    applicantName: {
      type: String,
      required: true,
      trim: true,
    },
    atcCode: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    dateOfIssue: {
      type: Date,
      required: true,
    },
    dateOfRenewal: {
      type: Date,
      required: true,
    },
    // Certificate image stored as base64 or URL
    certificateImage: {
      type: String,
      required: false
    }
  },
  { timestamps: true }
);

// Index for faster lookups (atcCode is indexed via its own `unique: true` above)
franchiseCertificateSchema.index({ franchiseName: 1 });
franchiseCertificateSchema.index({ applicantName: 1 });

franchiseCertificateSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('FranchiseCertificate', franchiseCertificateSchema);