const mongoose = require('mongoose');




const franchiseSchema = new mongoose.Schema(
  {
    instituteId: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },

    ownerName: { type: String, required: true, trim: true },
    instituteName: { type: String, required: true, trim: true },
    dob: Date,

    aadharNumber: { type: String, trim: true },
    panNumber: { type: String, trim: true },
    utrNumber: { type: String, trim: true },

    aadharFront: String,
    aadharBack: String,
    panImage: String,
    institutePhoto: String,
    ownerSign: String,
    ownerImage: String,
    certificateFile: String,

    address: String,
    state: String,
    district: String,
    operatorsCount: Number,
    classRooms: Number,
    totalComputers: Number,
    centerSpace: String,

    whatsapp: String,
    contact: String,
    email: String,

    balance: {
      type: Number,
      default: 0,
      min: 0,
    },

    credits: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalCreditsUsed: {
      type: Number,
      default: 0,
      min: 0,
    },

    ownerQualification: String,
    hasReception: { type: Boolean, default: false },
    hasStaffRoom: { type: Boolean, default: false },
    hasWaterSupply: { type: Boolean, default: false },
    hasToilet: { type: Boolean, default: false },

    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },

    approvedAt: {
      type: Date,
    },




    // 🔑 LOGIN
    username: {
    type: String,
    // required: true,
    unique: true,
    trim: true,
    lowercase: true,
    index: true,  
    sparse: true, // IMPORTANT: allows old docs without username
  },
    passwordHash: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Franchise', franchiseSchema);

