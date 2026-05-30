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
const Certificate = require("./models/Certificate");

// Serve certificate image directly — works for all QR URL patterns
async function serveCertificateImage(req, res) {
  try {
    const certNo = req.params.certNo;
    const certificate = await Certificate.findOne({ certificateNumber: certNo });

    if (!certificate || !certificate.certificateImage) {
      return res.status(404).send(`<!DOCTYPE html><html><head><title>Certificate Not Found</title>
<style>body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f0f4f8;}
.card{background:#fff;padding:40px;border-radius:12px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,0.1);}
h2{color:#c0392b;}</style></head>
<body><div class="card"><h2>Certificate Not Found</h2><p>No certificate matching <strong>${certNo}</strong> was found.</p></div></body></html>`);
    }

    const imageData = certificate.certificateImage;

    if (imageData.startsWith('data:image/')) {
      const matches = imageData.match(/^data:(image\/\w+);base64,(.+)$/);
      if (matches) {
        const buffer = Buffer.from(matches[2], 'base64');
        res.setHeader('Content-Type', matches[1]);
        res.setHeader('Content-Disposition', `inline; filename="certificate_${certNo}.jpg"`);
        return res.send(buffer);
      }
    }

    if (imageData.startsWith('data:application/pdf')) {
      const buffer = Buffer.from(imageData.replace(/^data:application\/pdf;base64,/, ''), 'base64');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="certificate_${certNo}.pdf"`);
      return res.send(buffer);
    }

    res.redirect(imageData);
  } catch (err) {
    console.error("Certificate view error:", err);
    res.status(500).send("Server error");
  }
}

// All possible QR URL patterns — old and new certificates
app.get("/verify/view/:certNo", serveCertificateImage);
app.get("/verify/:certNo", serveCertificateImage);
app.get("/view/:certNo", serveCertificateImage);
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
