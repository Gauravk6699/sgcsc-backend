// server/src/models/Student.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const studentSchema = new mongoose.Schema(
  {
    // rollNo is now OPTIONAL and NOT unique
    // you can remove this field entirely later if you want
    // rollNo: { type: String, trim: true, default: null },

    // --- Basic details (matching AddStudent form) ---
    centerName: { type: String, trim: true }, // franchise / institute name
    name: { type: String, required: true, trim: true },
    gender: { type: String, trim: true },
    fatherName: { type: String, trim: true },
    motherName: { type: String, trim: true },
    dob: { type: Date },

    rollNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    // Enrollment number - UNIQUE across platform
    enrollmentNo: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      index: true,
    },

    // Certificate number - UNIQUE across platform
    certificateNo: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      index: true,
    },




    email: { type: String, lowercase: true, trim: true },

    mobile: { type: String, trim: true }, // "+91..." from the form
    state: { type: String, trim: true },
    district: { type: String, trim: true },
    address: { type: String, trim: true },

    examPassed: { type: String, trim: true },
    marksOrGrade: { type: String, trim: true },
    board: { type: String, trim: true },
    passingYear: { type: String, trim: true },

    username: { type: String, trim: true, unique: true },
    password: { type: String }, // hashed below

    // Course info (single course - deprecated, use courses array)
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      default: null,
    },
    courseName: { type: String, trim: true },

    // Multiple courses support
    courses: [{
      course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
      },
      courseName: { type: String, trim: true },
      feeAmount: { type: Number, default: 0 },
      amountPaid: { type: Number, default: 0 },
      paymentDate: { type: Date },
      feesPaid: { type: Boolean, default: false },
      sessionStart: { type: Date },
      sessionEnd: { type: Date },
    }],

    // Photo: we store either a full URL or a /uploads/xxx filename
    photo: { type: String, trim: true },

    // Session
    sessionStart: { type: Date },
    sessionEnd: { type: Date },

    // Fee details
    feeAmount: {
      type: Number,
      default: 0,
    },
    amountPaid: {
      type: Number,
      default: 0,
    },
    paymentDate: {
      type: Date,
    },

    // --- Legacy / optional fields kept for compatibility ---
    semester: { type: Number, default: 1 },
    joinDate: { type: Date },
    feesPaid: { type: Boolean, default: false },
    contact: { type: String, trim: true }, // older code may use this
    isCertified: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// hide password when returning JSON
studentSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

// hash password if set
studentSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    return next();
  } catch (err) {
    return next(err);
  }
});

studentSchema.methods.comparePassword = function (candidate) {
  if (!this.password) return Promise.resolve(false);
  return bcrypt.compare(candidate, this.password);
};

// First auto-generated sequence is 124451.
const SEQ_FLOOR = 124450;

function extractSeq(value, prefix) {
  if (!value) return null;
  const match = String(value).match(new RegExp(`^${prefix}(\\d+)$`));
  return match ? parseInt(match[1], 10) : null;
}

// Derives the next roll/enrollment/certificate sequence number from the
// highest one actually saved on a student record — not from a separate
// counter — so it only ever advances when a student is really created, and
// self-corrects if the highest-numbered student is edited or removed.
studentSchema.statics.getNextSeq = async function () {
  const docs = await this.find({}, 'rollNumber enrollmentNo certificateNo').lean();
  let max = SEQ_FLOOR;
  for (const doc of docs) {
    const roll = extractSeq(doc.rollNumber, '');
    const enroll = extractSeq(doc.enrollmentNo, 'SG');
    const cert = extractSeq(doc.certificateNo, 'SGCSC');
    if (roll   !== null && roll   > max) max = roll;
    if (enroll !== null && enroll > max) max = enroll;
    if (cert   !== null && cert   > max) max = cert;
  }
  return max + 1;
};

module.exports = mongoose.model('Student', studentSchema);
