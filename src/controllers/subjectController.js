// server/src/controllers/subjectController.js
const Subject = require('../models/Subject');
const Course = require('../models/Course');
const mongoose = require('mongoose');

exports.createSubject = async (req, res) => {
  const { course, name, maxMarks = 0, maxPracticalMarks = 0, minMarks = 0 } = req.body;

  if (!course || !name?.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Course and subject name are required',
    });
  }

  const courseDoc = await Course.findById(course);
  if (!courseDoc) {
    return res.status(400).json({
      success: false,
      message: 'Invalid course',
    });
  }

  const subject = await Subject.create({
    course,
    name: name.trim(),
    maxMarks: Number(maxMarks),
    maxPracticalMarks: Number(maxPracticalMarks),
    minMarks: Number(minMarks),
  });

  res.status(201).json({ success: true, data: subject });
};

exports.getSubjects = async (req, res) => {
  const { course } = req.query;

  const filter = { isActive: true }; // Only active subjects
  if (course) {
    filter.course = new mongoose.Types.ObjectId(course);
  }

  const subjects = await Subject.find(filter)
    .populate('course', 'name title')
    .sort({ createdAt: -1 });

  res.json({ success: true, data: subjects });
};

exports.getSubject = async (req, res) => {
  const subject = await Subject.findById(req.params.id).populate(
    'course',
    'name title'
  );

  if (!subject) {
    return res.status(404).json({
      success: false,
      message: 'Subject not found',
    });
  }

  res.json({ success: true, data: subject });
};

exports.updateSubject = async (req, res) => {
  const subject = await Subject.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  if (!subject) {
    return res.status(404).json({
      success: false,
      message: 'Subject not found',
    });
  }

  res.json({ success: true, data: subject });
};

exports.deleteSubject = async (req, res) => {
  const subject = await Subject.findByIdAndDelete(req.params.id);

  if (!subject) {
    return res.status(404).json({
      success: false,
      message: 'Subject not found',
    });
  }

  res.json({ success: true, message: 'Subject deleted' });
};
