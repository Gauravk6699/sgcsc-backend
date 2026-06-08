const bcrypt = require('bcryptjs');
const Franchise = require('../models/Franchise');
const Student = require('../models/Student');

/* =========================================================
   HELPERS
   ========================================================= */

const normalizeBool = (v) =>
  v === true || ['true', '1', 'yes', 'on'].includes(String(v).toLowerCase());

const hashPassword = async (raw) => {
  if (!raw) return undefined;
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(raw, salt);
};

const fileFrom = (req, field) =>
  req.files?.[field]?.[0]?.path || null;





exports.createFranchisePublic = async (req, res) => {
  try {
    const uname = req.body.username ? req.body.username.trim().toLowerCase() : null;

    if (uname) {
      const [studentExists, franchiseExists] = await Promise.all([
        Student.findOne({ username: uname }),
        Franchise.findOne({ username: uname }),
      ]);
      if (studentExists || franchiseExists) {
        return res.status(409).json({
          success: false,
          message: 'Username already exists',
        });
      }
    }

    const passwordHash = req.body.password ? await hashPassword(req.body.password) : undefined;

    const franchise = await Franchise.create({
      instituteId: `TMP-${Date.now()}`,

      ownerName: req.body.ownerName,
      instituteName: req.body.instituteName,
      dob: req.body.dob,

      aadharNumber: req.body.aadharNumber,
      panNumber: req.body.panNumber,
      utrNumber: req.body.utrNumber,

      address: req.body.address,
      state: req.body.state,
      district: req.body.district,
      centerSpace: req.body.centerSpace,

      operatorsCount: Number(req.body.numTeachers || 0),
      classRooms: Number(req.body.numClassrooms || 0),
      totalComputers: Number(req.body.totalComputers || 0),

      ownerQualification: req.body.qualification,

      hasReception: req.body.hasReception === "Yes",
      hasStaffRoom: req.body.staffRoom === "Yes",
      hasWaterSupply: req.body.waterSupply === "Yes",
      hasToilet: req.body.toilet === "Yes",

      whatsapp: req.body.whatsapp,
      contact: req.body.contact,
      email: req.body.email,

      // Files
      aadharFront: req.files?.aadharFront?.[0]?.path,
      aadharBack: req.files?.aadharBack?.[0]?.path,
      panImage: req.files?.panImage?.[0]?.path,
      institutePhoto: req.files?.institutePhoto?.[0]?.path,
      ownerSign: req.files?.ownerSign?.[0]?.path,
      ownerImage: req.files?.ownerImage?.[0]?.path,
      certificateFile: req.files?.certificateFile?.[0]?.path,

      username: uname || undefined,
      passwordHash,

      balance: 0,
      status: "pending",
    });

    return res.status(201).json({
      success: true,
      message: "Franchise application submitted successfully",
      data: franchise,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Username already taken',
      });
    }
    console.error("Public franchise create error:", err);
    return res.status(400).json({
      success: false,
      message: err.message || "Franchise registration failed",
    });
  }
};



/* =========================================================
   CREATE FRANCHISE
   ========================================================= */
exports.createFranchise = async (req, res) => {
  try {
    const {
      instituteId,
      ownerName,
      instituteName,
      username,
      password,
      ...rest
    } = req.body;

    if (!instituteId || !ownerName || !instituteName) {
      return res.status(400).json({
        success: false,
        message: 'Institute ID, Owner Name and Institute Name are required',
      });
    }

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required',
      });
    }

    const uname = username.trim().toLowerCase();

    // 🔒 Final authority username check
    const [studentExists, franchiseExists] = await Promise.all([
      Student.findOne({ username: uname }),
      Franchise.findOne({ username: uname }),
    ]);

    if (studentExists || franchiseExists) {
      return res.status(409).json({
        success: false,
        message: 'Username already exists',
      });
    }

    const passwordHash = await hashPassword(password);

    const franchise = await Franchise.create({
      instituteId: instituteId.trim(),
      ownerName: ownerName.trim(),
      instituteName: instituteName.trim(),
      username: uname,
      passwordHash,

      status: 'approved',
      approvedAt: new Date(),


      ...rest,

      hasReception: normalizeBool(rest.hasReception),
      hasStaffRoom: normalizeBool(rest.hasStaffRoom),
      hasWaterSupply: normalizeBool(rest.hasWaterSupply),
      hasToilet: normalizeBool(rest.hasToilet),

      aadharFront: fileFrom(req, 'aadharFront'),
      aadharBack: fileFrom(req, 'aadharBack'),
      panImage: fileFrom(req, 'panImage'),
      institutePhoto: fileFrom(req, 'institutePhoto'),
      ownerSign: fileFrom(req, 'ownerSign'),
      ownerImage: fileFrom(req, 'ownerImage'),
      certificateFile: fileFrom(req, 'certificateFile'),
    });

    return res.status(201).json({
      success: true,
      data: franchise,
    });
  } catch (err) {
    // 🔥 Mongo duplicate key safety
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Duplicate value detected',
        field: Object.keys(err.keyPattern || {}),
      });
    }

    console.error('createFranchise error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to create franchise',
    });
  }
};

/* =========================================================
   CHECK USERNAME UNIQUENESS
   ========================================================= */
exports.checkUsernameUnique = async (req, res) => {
  try {
    const username = String(req.query.username || '').trim().toLowerCase();

    if (!username) {
      return res.json({
        success: true,
        exists: false,
      });
    }

    const [student, franchise] = await Promise.all([
      Student.findOne({ username }),
      Franchise.findOne({ username }),
    ]);

    return res.json({
      success: true,
      exists: Boolean(student || franchise),
    });
  } catch (err) {
    console.error('checkUsernameUnique error:', err);
    return res.status(500).json({
      success: false,
      message: 'Username check failed',
    });
  }
};

// const franchise = await Franchise.findOne({
//   instituteId,
//   status: 'approved'
// }).select('instituteName ownerName state district');


/* =========================================================
   LIST FRANCHISES
   ========================================================= */
exports.getFranchises = async (req, res) => {
  const filter = {};
  if (req.query.status) {
    filter.status = req.query.status;
  }

  const list = await Franchise.find(filter)
    .select('-passwordHash')
    .sort({ createdAt: -1 });

  res.json({ success: true, data: list });
};


/* =========================================================
   GET SINGLE FRANCHISE
   ========================================================= */
// exports.getFranchise = async (req, res) => {
//   try {
//     const franchise = await Franchise.findById(req.params.id).select(
//       '-passwordHash'
//     );

//     if (!franchise) {
//       return res.status(404).json({
//         success: false,
//         message: 'Franchise not found',
//       });
//     }

//     return res.json({
//       success: true,
//       data: franchise,
//     });
//   } catch (err) {
//     console.error('getFranchise error:', err);
//     return res.status(500).json({
//       success: false,
//       message: 'Failed to load franchise',
//     });
//   }
// };



exports.approveFranchise = async (req, res) => {
  const franchise = await Franchise.findById(req.params.id);

  if (!franchise) {
    return res.status(404).json({ success: false, message: 'Franchise not found' });
  }

  franchise.status = 'approved';
  franchise.approvedAt = new Date();

  await franchise.save();

  res.json({ success: true, data: franchise });
};

exports.rejectFranchise = async (req, res) => {
  const franchise = await Franchise.findById(req.params.id);

  if (!franchise) {
    return res.status(404).json({ success: false, message: 'Franchise not found' });
  }

  franchise.status = 'rejected';

  await franchise.save();

  res.json({ success: true, data: franchise });
};



/* =========================================================
   UPDATE FRANCHISE (ADMIN)
   ========================================================= */
exports.updateFranchise = async (req, res) => {
  try {
    const franchise = await Franchise.findById(req.params.id);

    if (!franchise) {
      return res.status(404).json({
        success: false,
        message: "Franchise not found",
      });
    }

/* ---------- BASIC FIELD UPDATES (EXPLICIT & SAFE) ---------- */
if (req.body.instituteId !== undefined) franchise.instituteId = req.body.instituteId;
if (req.body.ownerName !== undefined) franchise.ownerName = req.body.ownerName;
if (req.body.instituteName !== undefined) franchise.instituteName = req.body.instituteName;
if (req.body.address !== undefined) franchise.address = req.body.address;
if (req.body.state !== undefined) franchise.state = req.body.state;
if (req.body.district !== undefined) franchise.district = req.body.district;
if (req.body.centerSpace !== undefined) franchise.centerSpace = req.body.centerSpace;
if (req.body.aadharNumber !== undefined) franchise.aadharNumber = req.body.aadharNumber;
if (req.body.panNumber !== undefined) franchise.panNumber = req.body.panNumber;
if (req.body.utrNumber !== undefined) franchise.utrNumber = req.body.utrNumber;
if (req.body.operatorsCount !== undefined) franchise.operatorsCount = Number(req.body.operatorsCount);
if (req.body.classRooms !== undefined) franchise.classRooms = Number(req.body.classRooms);
if (req.body.totalComputers !== undefined) franchise.totalComputers = Number(req.body.totalComputers);
if (req.body.whatsapp !== undefined) franchise.whatsapp = req.body.whatsapp;
if (req.body.contact !== undefined) franchise.contact = req.body.contact;
if (req.body.email !== undefined) franchise.email = req.body.email;
if (req.body.ownerQualification !== undefined) franchise.ownerQualification = req.body.ownerQualification;
if (req.body.username !== undefined) franchise.username = req.body.username;
if (req.body.balance !== undefined) franchise.balance = Number(req.body.balance);

/* ---------- DATE OF BIRTH ---------- */
if (req.body.dob) {
  const parsedDob = new Date(req.body.dob);
  if (!isNaN(parsedDob)) {
    franchise.dob = parsedDob;
  }
}


    /* ---------- STATUS UPDATE (CRITICAL) ---------- */
    if (req.body.status) {
      franchise.status = req.body.status;
      if (req.body.status === "approved") {
        franchise.approvedAt = new Date();
      }
    }

    /* ---------- PASSWORD UPDATE ---------- */
    if (req.body.password && req.body.password.trim() !== "") {
      franchise.passwordHash = await hashPassword(req.body.password);
    }

    /* ---------- BOOLEAN NORMALIZATION ---------- */
    franchise.hasReception = normalizeBool(req.body.hasReception);
    franchise.hasStaffRoom = normalizeBool(req.body.hasStaffRoom);
    franchise.hasWaterSupply = normalizeBool(req.body.hasWaterSupply);
    franchise.hasToilet = normalizeBool(req.body.hasToilet);

    /* ---------- FILE UPDATES ---------- */
    [
      "aadharFront",
      "aadharBack",
      "panImage",
      "institutePhoto",
      "ownerSign",
      "ownerImage",
      "certificateFile",
    ].forEach((f) => {
      const file = fileFrom(req, f);
      if (file) franchise[f] = file;
    });

    /* ---------- SAVE ---------- */
    await franchise.save();

    return res.json({
      success: true,
      data: franchise,
    });
  } catch (err) {
    console.error("updateFranchise error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to update franchise",
    });
  }
};

/* =========================================================
   DELETE FRANCHISE
   ========================================================= */
exports.deleteFranchise = async (req, res) => {
  try {
    const deleted = await Franchise.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Franchise not found',
      });
    }

    return res.json({
      success: true,
      message: 'Franchise deleted successfully',
    });
  } catch (err) {
    console.error('deleteFranchise error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete franchise',
    });
  }
};


exports.verifyFranchisePublic = async (req, res) => {
  try {
    const { instituteId } = req.query;

    if (!instituteId) {
      return res.status(400).json({
        success: false,
        message: "Institute ID is required",
      });
    }

    const franchise = await Franchise.findOne({
      instituteId: instituteId.trim(),
      status: "approved",
    }).select("instituteName ownerName state district");

    if (!franchise) {
      return res.json({
        success: true,
        verified: false,
      });
    }

    return res.json({
      success: true,
      verified: true,
      data: franchise,
    });
  } catch (err) {
    console.error("verifyFranchisePublic error:", err);
    res.status(500).json({
      success: false,
      message: "Verification failed",
    });
  }
};

exports.listApprovedFranchises = async (_req, res) => {
  try {
    const franchises = await Franchise.find({
      status: "approved",
    }).select("instituteId instituteName district state");

    res.json({
      success: true,
      data: franchises,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to load franchises",
    });
  }
};

/* =========================================================
   LIST APPROVED FRANCHISES (PUBLIC)
   ========================================================= */


