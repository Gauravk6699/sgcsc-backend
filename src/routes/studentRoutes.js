const express = require("express");
const router = express.Router();

const verifyAdmin = require("../middleware/authMiddleware");
const { uploadImage } = require("../middleware/upload");

const {
  createStudent,
  getStudents,
  getStudent,
  updateStudent,
  deleteStudent,
  getRecentStudents,
  getCertifiedStudents,
  getStudentRollNos,
  getStudentByEnrollment,
  getStudentByRoll,
  getNextNumbers,
} = require("../controllers/studentController");

/* ================= PUBLIC HOME ROUTES ================= */
router.get("/recent-home", getRecentStudents);
router.get("/certified-home", getCertifiedStudents);

/* ================= PUBLIC ================= */
router.get("/", getStudents);
router.get("/next-numbers", getNextNumbers);
router.get("/rollnos", getStudentRollNos);
router.get("/lookup/:enrollmentNumber", getStudentByEnrollment);
router.get("/lookup-roll/:rollNumber", getStudentByRoll);
router.get("/:id", getStudent);

/* ================= ADMIN ================= */
router.post("/", verifyAdmin, uploadImage.single("photo"), createStudent);

router.put(
  "/:id",
  verifyAdmin,
  uploadImage.single("photo"), // optional new photo
  updateStudent
);

router.delete("/:id", verifyAdmin, deleteStudent);

module.exports = router;
