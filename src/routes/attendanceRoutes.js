const router = require("express").Router();
const { clockIn, clockOut, myAttendance, listDay, studentHistory } = require("../controllers/attendanceController");
const { protect, restrictTo } = require("../middleware/auth");

router.post("/clock-in", protect, restrictTo("student"), clockIn);
router.post("/clock-out", protect, restrictTo("student"), clockOut);
router.get("/me", protect, restrictTo("student"), myAttendance);

router.get("/", protect, restrictTo("librarian"), listDay);
router.get("/student/:id", protect, restrictTo("librarian"), studentHistory);

module.exports = router;
