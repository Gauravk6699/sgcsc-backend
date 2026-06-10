// server/src/controllers/certificateController.js
const Certificate = require('../models/Certificate');

function parseDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

/**
 * POST /api/certificates
 */
exports.createCertificate = async (req, res) => {
  try {
    const {
      name,
      fatherName,
      courseName,
      sessionFrom,
      sessionTo,
      grade,
      enrollmentNumber,
      certificateNumber,
      issueDate,
      courseDuration,
      coursePeriodFrom,
      coursePeriodTo,
      centerName,
      atcName,
      certificateImage
    } = req.body || {};

    if (!name || !fatherName || !courseName || !sessionFrom || !sessionTo || !grade || !enrollmentNumber || !certificateNumber || !issueDate) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required: name, fatherName, courseName, sessionFrom, sessionTo, grade, enrollmentNumber, certificateNumber, issueDate',
      });
    }

    const parsedIssueDate = parseDate(issueDate);
    if (!parsedIssueDate) {
      return res.status(400).json({ success: false, message: 'Invalid issueDate format' });
    }

    const duplicate = await Certificate.findOne({ certificateNumber: String(certificateNumber).trim() });
    if (duplicate) {
      return res.status(400).json({ success: false, message: 'Certificate number already exists. Use a unique certificate number.' });
    }

    // Resolve org name — centerName wins, atcName is fallback, never store null
    const orgName = (centerName && String(centerName).trim())
      || (atcName && String(atcName).trim())
      || 'Shree ganpati computer and study Centre';

    const cert = await Certificate.create({
      name:              String(name).trim(),
      fatherName:        String(fatherName).trim(),
      courseName:        String(courseName).trim(),
      sessionFrom:       Number(sessionFrom),
      sessionTo:         Number(sessionTo),
      grade:             String(grade).trim(),
      enrollmentNumber:  String(enrollmentNumber).trim(),
      certificateNumber: String(certificateNumber).trim(),
      issueDate:         parsedIssueDate,
      courseDuration:    courseDuration ? String(courseDuration).trim() : '',
      coursePeriodFrom:  parseDate(coursePeriodFrom),
      coursePeriodTo:    parseDate(coursePeriodTo),
      centerName:        orgName,
      atcName:           orgName,   // keep in sync
      certificateImage:  certificateImage || null,
    });

    return res.status(201).json({ success: true, data: cert });
  } catch (err) {
    console.error('createCertificate error:', err);
    return res.status(500).json({ success: false, message: 'Server error while creating certificate' });
  }
};

/**
 * GET /api/certificates
 */
exports.getCertificates = async (req, res) => {
  try {
    const { search } = req.query || {};
    const filter = {};

    if (search && search.trim()) {
      const rx = new RegExp(search.trim(), 'i');
      filter.$or = [
        { enrollmentNumber: rx },
        { certificateNumber: rx },
        { name: rx },
        { courseName: rx },
      ];
    }

    const certs = await Certificate.find(filter)
      .sort({ issueDate: -1, createdAt: -1 })
      .lean();

    return res.json({ success: true, data: certs });
  } catch (err) {
    console.error('getCertificates error:', err);
    return res.status(500).json({ success: false, message: 'Server error while fetching certificates' });
  }
};

/**
 * GET /api/certificates/:id
 */
exports.getCertificateById = async (req, res) => {
  try {
    const { id } = req.params;
    const cert = await Certificate.findById(id).lean();
    if (!cert) {
      return res.status(404).json({ success: false, message: 'Certificate not found' });
    }
    return res.json({ success: true, data: cert });
  } catch (err) {
    console.error('getCertificateById error:', err);
    return res.status(500).json({ success: false, message: 'Server error while fetching certificate' });
  }
};

/**
 * PUT /api/certificates/:id
 */
exports.updateCertificate = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      fatherName,
      courseName,
      sessionFrom,
      sessionTo,
      grade,
      enrollmentNumber,
      certificateNumber,
      issueDate,
      renewalDate,
      courseDuration,
      coursePeriodFrom,
      coursePeriodTo,
      centerName,
      atcName,
      certificateImage
    } = req.body || {};

    const update = {};

    if (name          != null) update.name              = String(name).trim();
    if (fatherName    != null) update.fatherName        = String(fatherName).trim();
    if (courseName    != null) update.courseName        = String(courseName).trim();
    if (sessionFrom   != null) update.sessionFrom       = Number(sessionFrom);
    if (sessionTo     != null) update.sessionTo         = Number(sessionTo);
    if (grade         != null) update.grade             = String(grade).trim();
    if (enrollmentNumber != null) update.enrollmentNumber = String(enrollmentNumber).trim();
    if (certificateNumber != null) update.certificateNumber = String(certificateNumber).trim();
    if (courseDuration != null) update.courseDuration   = String(courseDuration).trim();
    if (certificateImage != null) update.certificateImage = certificateImage;

    if (issueDate != null) {
      const parsed = parseDate(issueDate);
      if (!parsed) return res.status(400).json({ success: false, message: 'Invalid issueDate format' });
      update.issueDate = parsed;
    }
    if (renewalDate != null) {
      const parsed = parseDate(renewalDate);
      if (!parsed) return res.status(400).json({ success: false, message: 'Invalid renewalDate format' });
      update.renewalDate = parsed;
    }
    if (coursePeriodFrom != null) update.coursePeriodFrom = parseDate(coursePeriodFrom);
    if (coursePeriodTo   != null) update.coursePeriodTo   = parseDate(coursePeriodTo);

    // Resolve org name — never store null, keep centerName and atcName in sync
    if (centerName != null || atcName != null) {
      const orgName = (centerName && String(centerName).trim())
        || (atcName && String(atcName).trim())
        || '';
      update.centerName = orgName;
      update.atcName    = orgName;
    }

    const cert = await Certificate.findByIdAndUpdate(id, update, { new: true });
    if (!cert) {
      return res.status(404).json({ success: false, message: 'Certificate not found' });
    }

    return res.json({ success: true, data: cert });
  } catch (err) {
    console.error('updateCertificate error:', err);
    return res.status(500).json({ success: false, message: 'Server error while updating certificate' });
  }
};

/**
 * DELETE /api/certificates/:id
 */
exports.deleteCertificate = async (req, res) => {
  try {
    const { id } = req.params;
    const cert = await Certificate.findByIdAndDelete(id);
    if (!cert) {
      return res.status(404).json({ success: false, message: 'Certificate not found' });
    }
    return res.json({ success: true, message: 'Certificate deleted' });
  } catch (err) {
    console.error('deleteCertificate error:', err);
    return res.status(500).json({ success: false, message: 'Server error while deleting certificate' });
  }
};