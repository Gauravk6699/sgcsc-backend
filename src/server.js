require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const connectDB = require("./config/db");

const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || "development";

/* ===================== DB ===================== */
connectDB();

/* ===================== Security ===================== */
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "http://localhost:5000",
          "https:",
        ],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https:"],
        connectSrc: ["'self'", "http://localhost:5000", "https:"],
      },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

/* ===================== Performance ===================== */
app.use(compression());

/* ===================== Body Parsing ===================== */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

/* ===================== Logger ===================== */
if (NODE_ENV === "development") {
  app.use(morgan("dev"));
}

/* ===================== CORS ===================== */
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "https://sgcsc-site.vercel.app",
      "https://sgcsc-admin.vercel.app",
      "https://www.sgcsc.in",
      "https://sgcsc.in",
      "https://admin.sgcsc.in",
    ],
    credentials: true,
  })
);

/* ===================== Rate Limiting ===================== */
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

/* ===================== STATIC FILES (CRITICAL) ===================== */
/**
 * Multer saves files into: server/src/uploads
 * We must expose that directory publicly
 */
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"))
);

/* ===================== STATIC FILES (IMPORTANT FIX) ===================== */
/**
 * Multer saves files into:
 *   server/src/uploads
 * So we MUST serve THAT directory
 */
app.use(express.static(path.join(__dirname, "../sgcsc-site/public")));

/* ===================== API ROUTES ===================== */
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/franchise-auth", require("./routes/franchiseAuthRoutes"));
app.use("/api/student-auth", require("./routes/studentAuthRoutes"));
app.use("/api/members", require("./routes/membersRoutes"));
app.use("/api/affiliations", require("./routes/affiliations"));
app.use("/api/franchises", require("./routes/franchiseRoutes"));
app.use("/api/franchise-profile", require("./routes/franchiseProfileRoutes"));
app.use("/api/students", require("./routes/studentRoutes"));
app.use("/api/courses", require("./routes/courseRoutes"));
app.use("/api/subjects", require("./routes/subjectRoutes"));
app.use("/api/results", require("./routes/resultRoutes"));
app.use("/api/gallery", require("./routes/galleryRoutes"));
app.use("/api/admit-cards", require("./routes/admitCardRoutes"));
app.use("/api/id-cards", require("./routes/idCardRoutes"));
app.use("/api/certificates", require("./routes/certificateRoutes"));
app.use("/api/franchise-certificates", require("./routes/franchiseCertificateRoutes"));
app.use("/api/typing-certificates", require("./routes/typingCertificateRoutes"));
app.use("/api/marksheets", require("./routes/marksheetRoutes"));
app.use("/api/study-materials", require("./routes/studyMaterialRoutes"));
app.use("/api/assignments", require("./routes/assignmentRoutes"));
app.use("/api/student-profile", require("./routes/studentProfileRoutes"));
app.use("/api/public/franchise", require("./routes/publicFranchiseRoutes"));
app.use("/api/public", require("./routes/publicVerificationRoutes"));
app.use("/api/settings", require("./routes/settingsRoutes"));
app.use("/api/receipts", require("./routes/receiptRoutes"));
app.use("/api/credits", require("./routes/creditRoutes"));
app.use("/api/franchise/students", require("./routes/franchiseStudentRoutes"));
app.use("/api/franchise/courses", require("./routes/franchiseCourseRoutes"));
app.use("/api/franchise/subjects", require("./routes/franchiseSubjectRoutes"));
app.use("/api/franchise/results", require("./routes/franchiseResultRoutes"));
app.use("/api/franchise/certificates", require("./routes/franchiseCertificateRoutes"));
app.use("/api/franchise/franchise-certificates", require("./routes/franchiseFranchiseCertificateRoutes"));
app.use("/api/franchise/typing-certificates", require("./routes/franchiseTypingCertificateRoutes"));

/* ===================== PUBLIC VERIFICATION ===================== */
const publicVerificationController = require("./controllers/publicVerificationController");
app.get("/verify/:certNo", (req, res) => {
  const certNo = req.params.certNo;
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Certificate Verification — SGCSC</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f0f4f8; min-height: 100vh; display: flex; flex-direction: column; align-items: center; padding: 40px 16px; }
    .card { background: #fff; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.10); max-width: 540px; width: 100%; padding: 36px 32px; }
    .badge { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: 8px; font-weight: 600; margin-bottom: 28px; }
    .badge.valid { background: #e6f4ea; color: #1e7e34; }
    .badge.invalid { background: #fce8e6; color: #c0392b; }
    .field-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px 24px; }
    @media (max-width: 480px) { .field-grid { grid-template-columns: 1fr; } }
    .field { display: flex; flex-direction: column; }
    .field label { font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: #888; margin-bottom: 3px; }
    .field span { font-size: 0.97rem; color: #1a3a5c; font-weight: 500; }
    .field.full { grid-column: 1 / -1; }
  </style>
</head>
<body>
  <div class="card" id="card">
    <div style="text-align:center;padding:24px 0;">Loading...</div>
  </div>
  <script>
    const certNo = "${certNo}";
    async function verify() {
      try {
        const res = await fetch('/verify/certificate', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({certNo})
        });
        const data = await res.json();
        const cert = data.data || {};
        document.getElementById('card').innerHTML = data.success ? 
          '<div class="badge valid">✓ Certificate Verified</div>' +
          '<div class="cert-no-tag">Cert No: ' + certNo + '</div>' +
          '<div class="cert-title">' + (cert.name || cert.studentName || 'Student') + '</div>' +
          '<div class="field-grid">' +
          '<div class="field"><label>Course</label><span>' + (cert.courseName || '-') + '</span></div>' +
          '<div class="field"><label>Grade</label><span>' + (cert.grade || '-') + '</span></div>' +
          '<div class="field"><label>Certificate No.</label><span>' + (cert.certificateNumber || '-') + '</span></div>' +
          '<div class="field"><label>Enrollment No.</label><span>' + (cert.enrollmentNumber || '-') + '</span></div>' +
          '<div class="field full"><label>Issue Date</label><span>' + (cert.issueDate ? new Date(cert.issueDate).toLocaleDateString('en-IN') : '-') + '</span></div>' +
          '</div>' :
          '<div class="badge invalid">✗ Certificate Not Found</div>';
      } catch(e) {
        document.getElementById('card').innerHTML = '<div class="badge invalid">✗ Verification Failed</div>';
      }
    }
    verify();
  </script>
</body>
</html>`);
});
app.post("/verify/certificate", publicVerificationController.verifyCertificate);


/* ===================== Health Check ===================== */
app.get("/health", (_req, res) => {
  res.json({
    success: true,
    env: NODE_ENV,
    uptime: process.uptime(),
  });
});

/* ===================== 404 ===================== */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Not Found",
    path: req.originalUrl,
  });
});

/* ===================== Error Handler ===================== */
app.use((err, _req, res, _next) => {
  console.error("🔥 SERVER ERROR:", err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

/* ===================== Start Server ===================== */
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📦 Environment: ${NODE_ENV}`);
});
