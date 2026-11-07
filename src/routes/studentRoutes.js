// const router = require("express").Router();
// const { createStudent, listStudents, setStatus, updateFees } = require("../controllers/studentController");
// const { protect, restrictTo } = require("../middleware/auth");

// router.use(protect, restrictTo("librarian"));
// router.route("/").get(listStudents).post(createStudent);
// router.put("/:id/status", setStatus);
// router.put("/:id/fees", updateFees);

// module.exports = router;
const router = require("express").Router();
const { createStudent, listStudents, setStatus, updateFees, updateStudent, resetPassword } = require("../controllers/studentController");
const { protect, restrictTo } = require("../middleware/auth");

router.use(protect, restrictTo("librarian"));
router.route("/").get(listStudents).post(createStudent);
router.put("/:id/status", setStatus);
router.put("/:id/fees", updateFees);
router.put("/:id/password", resetPassword);
router.put("/:id", updateStudent);

module.exports = router;
