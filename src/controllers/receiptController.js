// src/controllers/receiptController.js
const Receipt = require('../models/Receipt');
const Student = require('../models/Student');

// Create a new receipt
exports.createReceipt = async (req, res) => {
  try {
    console.log('Creating receipt with data:', req.body);
    const {
      studentId,
      courseId,
      receiptNo,
      sessionStart,
      sessionEnd,
      monthlyFee,
      dueAmount,
      totalPaid,
      totalDue,
      paymentMethod,
      paymentDate,
      whatsappNumber,
      remarks,
      monthlyPayments
    } = req.body;

    console.log('Looking up student:', studentId);
    // Get student details
    const student = await Student.findById(studentId);
    console.log('Student found:', !!student, student?.name);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Get course details if courseId provided
    let courseName = '';
    if (courseId && student.courses) {
      const course = student.courses.find(c => c._id.toString() === courseId);
      courseName = course ? course.courseName : '';
    }

    const receipt = new Receipt({
      receiptNo,
      student: studentId,
      studentName: student.name,
      enrollmentNo: student.enrollmentNumber || student.rollNumber,
      course: courseId,
      courseName: courseName || 'General',
      sessionStart,
      sessionEnd,
      monthlyFee: monthlyFee || 600,
      dueAmount: dueAmount || 0,
      totalPaid,
      totalDue: totalDue || 0,
      paymentMethod,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      whatsappNumber,
      remarks,
      monthlyPayments: monthlyPayments || [],
      createdBy: req.user._id
    });

    await receipt.save();

    res.status(201).json({
      success: true,
      message: 'Receipt created successfully',
      data: receipt
    });
  } catch (error) {
    console.error('Create receipt error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Receipt number already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to create receipt',
      error: error.message
    });
  }
};

// Get all receipts with pagination and filtering
exports.getReceipts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      studentId,
      enrollmentNo,
      receiptNo,
      startDate,
      endDate
    } = req.query;

    const query = {};

    if (studentId) query.student = studentId;
    if (enrollmentNo) query.enrollmentNo = { $regex: enrollmentNo, $options: 'i' };
    if (receiptNo) query.receiptNo = { $regex: receiptNo, $options: 'i' };

    if (startDate || endDate) {
      query.paymentDate = {};
      if (startDate) query.paymentDate.$gte = new Date(startDate);
      if (endDate) query.paymentDate.$lte = new Date(endDate);
    }

    const receipts = await Receipt.find(query)
      .populate('student', 'name enrollmentNumber rollNumber fatherName dob photo')
      .populate('course', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await Receipt.countDocuments(query);

    res.json({
      success: true,
      data: receipts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get receipts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch receipts',
      error: error.message
    });
  }
};

// Get a single receipt by ID
exports.getReceipt = async (req, res) => {
  try {
    const receipt = await Receipt.findById(req.params.id)
      .populate('student', 'name enrollmentNumber rollNumber centerName')
      .populate('course', 'name');

    if (!receipt) {
      return res.status(404).json({ success: false, message: 'Receipt not found' });
    }

    res.json({ success: true, data: receipt });
  } catch (error) {
    console.error('Get receipt error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch receipt',
      error: error.message
    });
  }
};

// Update a receipt
exports.updateReceipt = async (req, res) => {
  try {
    const {
      receiptNo,
      sessionStart,
      sessionEnd,
      monthlyFee,
      dueAmount,
      totalPaid,
      totalDue,
      paymentMethod,
      paymentDate,
      whatsappNumber,
      remarks,
      monthlyPayments
    } = req.body;

    const receipt = await Receipt.findById(req.params.id);
    if (!receipt) {
      return res.status(404).json({ success: false, message: 'Receipt not found' });
    }

    // Update fields
    if (receiptNo) receipt.receiptNo = receiptNo;
    if (sessionStart) receipt.sessionStart = sessionStart;
    if (sessionEnd) receipt.sessionEnd = sessionEnd;
    if (monthlyFee !== undefined) receipt.monthlyFee = monthlyFee;
    if (dueAmount !== undefined) receipt.dueAmount = dueAmount;
    if (totalPaid !== undefined) receipt.totalPaid = totalPaid;
    if (totalDue !== undefined) receipt.totalDue = totalDue;
    if (paymentMethod) receipt.paymentMethod = paymentMethod;
    if (paymentDate) receipt.paymentDate = new Date(paymentDate);
    if (whatsappNumber !== undefined) receipt.whatsappNumber = whatsappNumber;
    if (remarks !== undefined) receipt.remarks = remarks;
    if (monthlyPayments) receipt.monthlyPayments = monthlyPayments;

    receipt.updatedBy = req.user._id;

    await receipt.save();

    res.json({
      success: true,
      message: 'Receipt updated successfully',
      data: receipt
    });
  } catch (error) {
    console.error('Update receipt error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Receipt number already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to update receipt',
      error: error.message
    });
  }
};

// Delete a receipt
exports.deleteReceipt = async (req, res) => {
  try {
    const receipt = await Receipt.findById(req.params.id);
    if (!receipt) {
      return res.status(404).json({ success: false, message: 'Receipt not found' });
    }

    await Receipt.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Receipt deleted successfully' });
  } catch (error) {
    console.error('Delete receipt error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete receipt',
      error: error.message
    });
  }
};

// Get receipts for a specific student
exports.getStudentReceipts = async (req, res) => {
  try {
    const receipts = await Receipt.find({ student: req.params.studentId })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: receipts });
  } catch (error) {
    console.error('Get student receipts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student receipts',
      error: error.message
    });
  }
};