// src/controllers/franchiseReceiptController.js
const Receipt = require('../models/Receipt');
const Student = require('../models/Student');

exports.createReceipt = async (req, res) => {
  try {
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

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

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
      franchise: req.franchise._id
    });

    await receipt.save();

    res.status(201).json({
      success: true,
      message: 'Receipt created successfully',
      data: receipt
    });
  } catch (error) {
    console.error('Franchise create receipt error:', error);
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

exports.getReceipts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      enrollmentNo,
      receiptNo,
      startDate,
      endDate
    } = req.query;

    const query = { franchise: req.franchise._id };

    if (enrollmentNo) query.enrollmentNo = { $regex: enrollmentNo, $options: 'i' };
    if (receiptNo) query.receiptNo = { $regex: receiptNo, $options: 'i' };

    if (startDate || endDate) {
      query.paymentDate = {};
      if (startDate) query.paymentDate.$gte = new Date(startDate);
      if (endDate) query.paymentDate.$lte = new Date(endDate);
    }

    const receipts = await Receipt.find(query)
      .populate('student', 'name enrollmentNumber rollNumber fatherName dob photo')
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
    console.error('Franchise get receipts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch receipts',
      error: error.message
    });
  }
};

exports.updateReceipt = async (req, res) => {
  try {
    const receipt = await Receipt.findOne({
      _id: req.params.id,
      franchise: req.franchise._id
    });

    if (!receipt) {
      return res.status(404).json({ success: false, message: 'Receipt not found' });
    }

    const {
      receiptNo,
      totalPaid,
      totalDue,
      paymentMethod,
      whatsappNumber,
      remarks,
      monthlyPayments
    } = req.body;

    if (receiptNo) receipt.receiptNo = receiptNo;
    if (totalPaid !== undefined) receipt.totalPaid = totalPaid;
    if (totalDue !== undefined) receipt.totalDue = totalDue;
    if (paymentMethod) receipt.paymentMethod = paymentMethod;
    if (whatsappNumber !== undefined) receipt.whatsappNumber = whatsappNumber;
    if (remarks !== undefined) receipt.remarks = remarks;
    if (monthlyPayments) receipt.monthlyPayments = monthlyPayments;

    await receipt.save();

    res.json({ success: true, message: 'Receipt updated successfully', data: receipt });
  } catch (error) {
    console.error('Franchise update receipt error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Receipt number already exists' });
    }
    res.status(500).json({ success: false, message: 'Failed to update receipt', error: error.message });
  }
};

exports.deleteReceipt = async (req, res) => {
  try {
    const receipt = await Receipt.findOneAndDelete({
      _id: req.params.id,
      franchise: req.franchise._id
    });

    if (!receipt) {
      return res.status(404).json({ success: false, message: 'Receipt not found' });
    }

    res.json({ success: true, message: 'Receipt deleted successfully' });
  } catch (error) {
    console.error('Franchise delete receipt error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete receipt', error: error.message });
  }
};
