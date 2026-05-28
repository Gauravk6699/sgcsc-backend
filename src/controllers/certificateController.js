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
 * Body: { name, fatherName, courseName, sessionFrom, sessionTo, grade, enrollmentNumber, certificateNumber, issueDate }
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
      return res
        .status(400)
        .json({ success: false, message: 'Invalid issueDate format' });
    }

    const parsedCoursePeriodFrom = parseDate(coursePeriodFrom);
    const parsedCoursePeriodTo = parseDate(coursePeriodTo);

    const cert = await Certificate.create({
      name: String(name).trim(),
      fatherName: String(fatherName).trim(),
      courseName: String(courseName).trim(),
      sessionFrom: Number(sessionFrom),
      sessionTo: Number(sessionTo),
      grade: String(grade).trim(),
      enrollmentNumber: String(enrollmentNumber).trim(),
      certificateNumber: String(certificateNumber).trim(),
      issueDate: parsedIssueDate,
      courseDuration: courseDuration ? String(courseDuration).trim() : null,
      coursePeriodFrom: parsedCoursePeriodFrom,
      coursePeriodTo: parsedCoursePeriodTo,
      certificateImage: certificateImage || null,
    });

    return res.status(201).json({ success: true, data: cert });
  } catch (err) {
    console.error('createCertificate error:', err);
    return res
      .status(500)
      .json({ success: false, message: 'Server error while creating certificate' });
  }
};

/**
 * GET /api/certificates
 * Optional query: search (by enrollmentNumber, certificateNumber, name, courseName)
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
    return res
      .status(500)
      .json({ success: false, message: 'Server error while fetching certificates' });
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
      return res
        .status(404)
        .json({ success: false, message: 'Certificate not found' });
    }
    return res.json({ success: true, data: cert });
  } catch (err) {
    console.error('getCertificateById error:', err);
    return res
      .status(500)
      .json({ success: false, message: 'Server error while fetching certificate' });
  }
};

/**
 * PUT /api/certificates/:id
 * Body: { name?, fatherName?, courseName?, sessionFrom?, sessionTo?, grade?, enrollmentNumber?, certificateNumber?, issueDate? }
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
      certificateImage
    } = req.body || {};

    const update = {};

    if (name != null) {
      update.name = String(name).trim();
    }
    if (fatherName != null) {
      update.fatherName = String(fatherName).trim();
    }
    if (courseName != null) {
      update.courseName = String(courseName).trim();
    }
    if (sessionFrom != null) {
      update.sessionFrom = Number(sessionFrom);
    }
    if (sessionTo != null) {
      update.sessionTo = Number(sessionTo);
    }
    if (grade != null) {
      update.grade = String(grade).trim();
    }
    if (enrollmentNumber != null) {
      update.enrollmentNumber = String(enrollmentNumber).trim();
    }
    if (certificateNumber != null) {
      update.certificateNumber = String(certificateNumber).trim();
    }

    if (issueDate != null) {
      const parsedDate = parseDate(issueDate);
      if (!parsedDate) {
        return res
          .status(400)
          .json({ success: false, message: 'Invalid issueDate format' });
      }
      update.issueDate = parsedDate;
    }

    if (renewalDate != null) {
      const parsedDate = parseDate(renewalDate);
      if (!parsedDate) {
        return res
          .status(400)
          .json({ success: false, message: 'Invalid renewalDate format' });
      }
      update.renewalDate = parsedDate;
    }

    if (certificateImage != null) {
      update.certificateImage = certificateImage;
    }

    const cert = await Certificate.findByIdAndUpdate(id, update, {
      new: true,
    });

    if (!cert) {
      return res
        .status(404)
        .json({ success: false, message: 'Certificate not found' });
    }

    return res.json({ success: true, data: cert });
  } catch (err) {
    console.error('updateCertificate error:', err);
    return res
      .status(500)
      .json({ success: false, message: 'Server error while updating certificate' });
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
      return res
        .status(404)
        .json({ success: false, message: 'Certificate not found' });
    }
    return res.json({ success: true, message: 'Certificate deleted' });
  } catch (err) {
    console.error('deleteCertificate error:', err);
    return res
      .status(500)
      .json({ success: false, message: 'Server error while deleting certificate' });
  }
};
