// server/src/controllers/resultController.js
const Result = require('../models/Result');
const Student = require('../models/Student');
const Course = require('../models/Course');
const Subject = require('../models/Subject');

/**
 * Calculate grade based on percentage
 */
function calculateGrade(percentage) {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C';
  if (percentage >= 40) return 'D';
  return 'F';
}

/**
 * POST /api/results
 * Create a new result with subject-wise marks
 * Body: { 
 *   studentId, 
 *   rollNumber, 
 *   courseId, 
 *   subjects: [{ subjectId, marksObtained, practicalMarks? }],
 *   examSession?,
 *   examDate?,
 *   remarks?
 * }
 */
exports.addResult = async (req, res) => {
  try {
    const { 
      studentId, 
      rollNumber, 
      courseId, 
      subjects = [],
      examSession = '',
      examDate,
      remarks = ''
    } = req.body || {};

    // Validation
    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: 'Student is required',
      });
    }
    if (!rollNumber || !String(rollNumber).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Roll Number is required',
      });
    }
    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: 'Course is required',
      });
    }
    if (!subjects || subjects.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one subject with marks is required',
      });
    }

    // Verify student exists
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Verify course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    // Process subjects and calculate totals
    let totalMaxMarks = 0;
    let totalObtained = 0;
    const processedSubjects = [];

    for (const sub of subjects) {
      const subjectDoc = await Subject.findById(sub.subjectId);
      if (!subjectDoc) {
        return res.status(404).json({
          success: false,
          message: `Subject not found: ${sub.subjectId}`,
        });
      }

      const maxMarks = subjectDoc.maxMarks || 100;
      const maxPracticalMarks = subjectDoc.maxPracticalMarks || 0;
      const marksObtained = Number(sub.marksObtained) || 0;
      const practicalMarks = Number(sub.practicalMarks) || 0;

      const subjectTotal = maxMarks + maxPracticalMarks;
      const obtainedTotal = marksObtained + practicalMarks;
      const subjectPercentage = subjectTotal > 0 ? (obtainedTotal / subjectTotal) * 100 : 0;

      totalMaxMarks += subjectTotal;
      totalObtained += obtainedTotal;

      processedSubjects.push({
        subject: subjectDoc._id,
        subjectName: subjectDoc.name,
        maxMarks,
        minMarks: subjectDoc.minMarks || 0,
        marksObtained,
        practicalMarks,
        maxPracticalMarks,
        grade: calculateGrade(subjectPercentage),
        status: obtainedTotal >= (subjectDoc.minMarks || 0) ? 'pass' : 'fail'
      });
    }

    // Calculate overall percentage and grade
    const percentage = totalMaxMarks > 0 ? (totalObtained / totalMaxMarks) * 100 : 0;
    const overallGrade = calculateGrade(percentage);
    const allPassed = processedSubjects.every(s => s.status === 'pass');

    const result = await Result.create({
      student: studentId,
      rollNumber: String(rollNumber).trim(),
      course: courseId,
      subjects: processedSubjects,
      totalMarks: totalMaxMarks,
      totalObtained,
      percentage: Math.round(percentage * 100) / 100,
      overallGrade,
      resultStatus: allPassed ? 'pass' : 'fail',
      examSession,
      examDate: examDate ? new Date(examDate) : undefined,
      remarks
    });

    // Populate references for response
    await result.populate('student', 'name rollNumber courseName');
    await result.populate('course', 'title name');

    return res.status(201).json({ success: true, data: result });
  } catch (err) {
    console.error('addResult error:', err);
    return res
      .status(500)
      .json({ success: false, message: 'Server error while adding result' });
  }
};

/**
 * GET /api/results
 * Optional query params: search, studentId, courseId
 */
exports.getResults = async (req, res) => {
  try {
    const { search, studentId, courseId } = req.query || {};
    const filter = {};

    if (search && String(search).trim()) {
      const regex = new RegExp(String(search).trim(), 'i');
      filter.$or = [
        { rollNumber: regex },
      ];
    }

    if (studentId) {
      filter.student = studentId;
    }

    if (courseId) {
      filter.course = courseId;
    }

    let results = [];
    try {
      results = await Result.find(filter)
        .populate('student', 'name rollNumber courseName photo')
        .populate('course', 'title name')
        .sort({ createdAt: -1 })
        .lean();
    } catch (populateErr) {
      // If populate fails (e.g., referenced doc missing), try without populate
      console.warn('Populate failed, fetching without populate:', populateErr.message);
      results = await Result.find(filter)
        .sort({ createdAt: -1 })
        .lean();
    }

    return res.json({ success: true, data: results });
  } catch (err) {
    console.error('getResults error:', err);
    return res
      .status(500)
      .json({ success: false, message: 'Server error while fetching results' });
  }
};

/**
 * GET /api/results/:id
 */
exports.getResult = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid id' });
    }

    const result = await Result.findById(id)
      .populate('student', 'name rollNumber courseName photo email mobile')
      .populate('course', 'title name duration')
      .populate('subjects.subject', 'name maxMarks minMarks');

    if (!result) {
      return res
        .status(404)
        .json({ success: false, message: 'Result not found' });
    }

    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('getResult error:', err);
    return res
      .status(500)
      .json({ success: false, message: 'Server error' });
  }
};

/**
 * PUT /api/results/:id
 * Update result including subject marks
 */
exports.updateResult = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid id' });
    }

    const { 
      subjects = [],
      examSession,
      examDate,
      remarks 
    } = req.body || {};

    const result = await Result.findById(id);
    if (!result) {
      return res
        .status(404)
        .json({ success: false, message: 'Result not found' });
    }

    // If subjects are provided, recalculate everything
    if (subjects.length > 0) {
      let totalMaxMarks = 0;
      let totalObtained = 0;
      const processedSubjects = [];

      for (const sub of subjects) {
        const subjectDoc = await Subject.findById(sub.subjectId || sub.subject);
        if (!subjectDoc) continue;

        const maxMarks = subjectDoc.maxMarks || 100;
        const maxPracticalMarks = subjectDoc.maxPracticalMarks || 0;
        const marksObtained = Number(sub.marksObtained) || 0;
        const practicalMarks = Number(sub.practicalMarks) || 0;

        const subjectTotal = maxMarks + maxPracticalMarks;
        const obtainedTotal = marksObtained + practicalMarks;
        const subjectPercentage = subjectTotal > 0 ? (obtainedTotal / subjectTotal) * 100 : 0;
        
        totalMaxMarks += subjectTotal;
        totalObtained += obtainedTotal;

        processedSubjects.push({
          subject: subjectDoc._id,
          subjectName: subjectDoc.name,
          maxMarks,
          minMarks: subjectDoc.minMarks || 0,
          marksObtained,
          practicalMarks,
          maxPracticalMarks,
          grade: calculateGrade(subjectPercentage),
          status: obtainedTotal >= (subjectDoc.minMarks || 0) ? 'pass' : 'fail'
        });
      }

      result.subjects = processedSubjects;
      result.totalMarks = totalMaxMarks;
      result.totalObtained = totalObtained;
      result.percentage = Math.round((totalMaxMarks > 0 ? (totalObtained / totalMaxMarks) * 100 : 0) * 100) / 100;
      result.overallGrade = calculateGrade(result.percentage);
      result.resultStatus = processedSubjects.every(s => s.status === 'pass') ? 'pass' : 'fail';
    }

    if (examSession !== undefined) result.examSession = examSession;
    if (examDate !== undefined) result.examDate = examDate ? new Date(examDate) : null;
    if (remarks !== undefined) result.remarks = remarks;

    await result.save();
    await result.populate('student', 'name rollNumber courseName');
    await result.populate('course', 'title name');

    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('updateResult error:', err);
    return res
      .status(500)
      .json({ success: false, message: 'Server error while updating result' });
  }
};

/**
 * DELETE /api/results/:id
 */
exports.deleteResult = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid id' });
    }

    const result = await Result.findByIdAndDelete(id);
    if (!result) {
      return res
        .status(404)
        .json({ success: false, message: 'Result not found' });
    }

    return res.json({ success: true, message: 'Result deleted' });
  } catch (err) {
    console.error('deleteResult error:', err);
    return res
      .status(500)
      .json({ success: false, message: 'Server error while deleting result' });
  }
};

/**
 * GET /api/results/by-roll/:rollNumber
 * Get results by roll number (for public/student verification)
 */
exports.getResultByRoll = async (req, res) => {
  try {
    const { rollNumber } = req.params;
    if (!rollNumber) {
      return res
        .status(400)
        .json({ success: false, message: 'Roll number is required' });
    }

    const results = await Result.find({ rollNumber: String(rollNumber).trim() })
      .populate('student', 'name rollNumber courseName photo')
      .populate('course', 'title name duration')
      .populate('subjects.subject', 'name maxMarks minMarks')
      .sort({ createdAt: -1 })
      .lean();

    if (!results || results.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: 'No results found for this roll number' });
    }

    return res.json({ success: true, data: results });
  } catch (err) {
    console.error('getResultByRoll error:', err);
    return res
      .status(500)
      .json({ success: false, message: 'Server error' });
  }
};
