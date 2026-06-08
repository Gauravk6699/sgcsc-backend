const mongoose = require("mongoose");
const Student = require("../models/Student");

/* ---------- POST /api/students ---------- */
exports.createStudent = async (req, res) => {
  try {
    const body = req.body || {};

    const {
      name,
      gender,
      fatherName,
      motherName,
      dob,
      email,
      mobile,
      state,
      district,
      address,
      centerName,
      examPassed,
      marksOrGrade,
      board,
      passingYear,
      username,
      password,
      courseId,
      courseName,
      sessionStart,
      sessionEnd,
      rollNumber,
      feeAmount,
      amountPaid,
      courses
    } = body;

    if (!name || !mobile || !centerName) {
      return res.status(400).json({
        success: false,
        message: "name, mobile and centerName are required",
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Password is required",
      });
    }

    if (!rollNumber || !rollNumber.trim()) {
      return res.status(400).json({
        success: false,
        message: "Roll number is required",
      });
    }

    // Explicit uniqueness check across the entire platform (all franchises)
    const rollExists = await Student.findOne({ rollNumber: rollNumber.trim() }).lean();
    if (rollExists) {
      return res.status(400).json({
        success: false,
        message: `Roll number "${rollNumber.trim()}" is already assigned to another student on this platform.`,
      });
    }

    const enrollmentNoFromBody = body.enrollmentNo;
    if (enrollmentNoFromBody && enrollmentNoFromBody.trim()) {
      const enrollExists = await Student.findOne({ enrollmentNo: enrollmentNoFromBody.trim() }).lean();
      if (enrollExists) {
        return res.status(400).json({
          success: false,
          message: `Enrollment number "${enrollmentNoFromBody.trim()}" is already assigned to another student on this platform.`,
        });
      }
    }

    const student = await Student.create({
      name: name.trim(),
      gender: gender || "",
      dob: dob || null,

      fatherName: fatherName || "",
      motherName: motherName || "",
      centerName: centerName.trim(),

      email: email || "",
      contact: mobile,

      state: state || "",
      district: district || "",
      address: address || "",

      examPassed: examPassed || "",
      marksOrGrade: marksOrGrade || "",
      board: board || "",
      passingYear: passingYear || "",

      course: courseId || null,
      courseName: courseName || "",
      sessionStart: sessionStart || null,
      sessionEnd: sessionEnd || null,
      joinDate: sessionStart || new Date(),

      username: username && username.trim() ? username.trim() : undefined,
      password: password,

      // 🔥 Cloudinary URL
      photo: req.file?.path || "",
      rollNumber: rollNumber.trim(),

      feeAmount: Number(feeAmount) || 0,
      amountPaid: Number(amountPaid) || 0,
      
      // Multiple courses - parse if JSON string
      courses: (() => {
        if (!courses) return [];
        if (typeof courses === 'string') {
          try {
            const parsed = JSON.parse(courses);
            return Array.isArray(parsed) ? parsed : [];
          } catch (e) {
            console.error('Error parsing courses:', e);
            return [];
          }
        }
        return Array.isArray(courses) ? courses : [];
      })(),
    });

    res.status(201).json({ success: true, data: student });
} catch (err) {
  console.error("createStudent error:", err);

  if (err.code === 11000) {
    const key = Object.keys(err.keyPattern || {})[0];
    const messages = {
      rollNumber:   "Roll number already exists. Each student must have a unique roll number across the entire platform.",
      enrollmentNo: "Enrollment number already exists. Each student must have a unique enrollment number across the entire platform.",
      username:     "Username already taken. Please choose a different username.",
    };
    return res.status(400).json({
      success: false,
      message: messages[key] || "A student with this information already exists.",
    });
  }

  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  res.status(500).json({
    success: false,
    message: "Server error",
  });
}

};

/* ---------- GET /api/students/recent-home ---------- */
exports.getRecentStudents = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 6, 10);

    const students = await Student.find({})
      .sort({ sessionStart: -1, createdAt: -1 })
      .limit(limit)
      .select("name photo courseName sessionStart createdAt")
      .lean();

    res.json({ success: true, data: students });
  } catch (err) {
    console.error("getRecentStudents error:", err);
    res.status(500).json({ success: false });
  }
};

exports.getStudentRollNos = async (req, res) => {
  try {
    const students = await Student.find(
      { rollNumber: { $ne: null } },
      { rollNumber: 1, name: 1, courseName: 1 }
    ).sort({ rollNumber: 1 });

    res.json({ success: true, data: students });
  } catch (err) {
    console.error("getStudentRollNos error:", err);
    res.status(500).json({ success: false });
  }
};


/* ---------- GET /api/students/certified-home ---------- */
exports.getCertifiedStudents = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 6, 10);

    const students = await Student.find({ isCertified: true })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .select("name photo courseName")
      .lean();

    res.json({ success: true, data: students });
  } catch (err) {
    console.error("getCertifiedStudents error:", err);
    res.status(500).json({ success: false });
  }
};

/* ---------- GET /api/students ---------- */
exports.getStudents = async (req, res) => {
  try {
    const students = await Student.find({}).sort({ createdAt: -1 });
    res.json({ success: true, data: students });
  } catch (err) {
    console.error("getStudents error:", err);
    res.status(500).json({ success: false });
  }
};

/* ---------- GET /api/students/:id ---------- */
exports.getStudent = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid ID" });
    }

    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    res.json({ success: true, data: student });
  } catch (err) {
    console.error("getStudent error:", err);
    res.status(500).json({ success: false });
  }
};

/* ---------- GET /api/students/lookup/:enrollmentNumber ---------- */
exports.getStudentByEnrollment = async (req, res) => {
  try {
    const { enrollmentNumber } = req.params;

    // Search by enrollmentNo or rollNumber
    const student = await Student.findOne({
      $or: [
        { enrollmentNo: enrollmentNumber },
        { rollNumber: enrollmentNumber }
      ]
    }).lean();

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    res.json({ success: true, data: student });
  } catch (err) {
    console.error("getStudentByEnrollment error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ---------- GET /api/students/lookup-roll/:rollNumber ---------- */
exports.getStudentByRoll = async (req, res) => {
  try {
    const { rollNumber } = req.params;

    // Search by rollNumber only
    const student = await Student.findOne({ rollNumber }).lean();

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    res.json({ success: true, data: student });
  } catch (err) {
    console.error("getStudentByRoll error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ---------- PUT /api/students/:id ---------- */
exports.updateStudent = async (req, res) => {
  try {
    console.log("---- UPDATE STUDENT HIT ----");
    console.log("req.headers.content-type:", req.headers["content-type"]);
    console.log("req.body:", req.body);
    console.log("req.file:", req.file);

    const update = { ...req.body };

    // normalize booleans
    if (update.isCertified !== undefined) {
      update.isCertified =
        update.isCertified === true || update.isCertified === "true";
    }

    if (update.feesPaid !== undefined) {
      update.feesPaid =
        update.feesPaid === true || update.feesPaid === "true";
    }

    // Parse courses array if it's a JSON string
    if (update.courses && typeof update.courses === 'string') {
      try {
        update.courses = JSON.parse(update.courses);
      } catch (e) {
        console.error('Error parsing courses:', e);
        update.courses = [];
      }
    }

    // Ensure courses array items have proper data types
    if (update.courses && Array.isArray(update.courses)) {
      update.courses = update.courses.map(course => ({
        course: course.course || course.courseId || null,
        courseName: course.courseName || "",
        feeAmount: Number(course.feeAmount) || 0,
        amountPaid: Number(course.amountPaid) || 0,
        feesPaid: course.feesPaid === true || course.feesPaid === "true",
        sessionStart: course.sessionStart || null,
        sessionEnd: course.sessionEnd || null,
      }));
    }

    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    // Explicit uniqueness check for rollNumber and enrollmentNo when they are being changed
    if (update.rollNumber && update.rollNumber.trim() !== student.rollNumber) {
      const conflict = await Student.findOne({ rollNumber: update.rollNumber.trim(), _id: { $ne: student._id } }).lean();
      if (conflict) {
        return res.status(400).json({
          success: false,
          message: `Roll number "${update.rollNumber.trim()}" is already assigned to another student on this platform.`,
        });
      }
    }

    if (update.enrollmentNo && update.enrollmentNo.trim() !== student.enrollmentNo) {
      const conflict = await Student.findOne({ enrollmentNo: update.enrollmentNo.trim(), _id: { $ne: student._id } }).lean();
      if (conflict) {
        return res.status(400).json({
          success: false,
          message: `Enrollment number "${update.enrollmentNo.trim()}" is already assigned to another student on this platform.`,
        });
      }
    }

    // If password is being updated
    if (update.password && update.password.trim() !== "") {
      student.password = update.password; // This triggers pre('save') hook
    }

    // Remove password from update object so it doesn't overwrite
    delete update.password;

    // Handle courses array specially - mark it as modified
    if (update.courses !== undefined) {
      student.courses = update.courses;
      student.markModified('courses'); // 🔥 This tells Mongoose to save the array
      delete update.courses;
    }

    // Update remaining fields
    Object.assign(student, update);

    await student.save(); // 🔥 THIS triggers hashing

    res.json({ success: true, data: student });

  } catch (err) {
    console.error("updateStudent error:", err);
    if (err.code === 11000) {
      const key = Object.keys(err.keyPattern || {})[0];
      const messages = {
        rollNumber:   "Roll number already exists on another student.",
        enrollmentNo: "Enrollment number already exists on another student.",
        username:     "Username already taken.",
      };
      return res.status(400).json({
        success: false,
        message: messages[key] || "A student with this information already exists.",
      });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};


/* ---------- DELETE /api/students/:id ---------- */
exports.deleteStudent = async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    res.json({ success: true, message: "Student deleted" });
  } catch (err) {
    console.error("deleteStudent error:", err);
    res.status(500).json({ success: false });
  }
};
