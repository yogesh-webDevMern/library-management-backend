// const router = require("express").Router();
// const rateLimit = require("express-rate-limit");
// const { login, me } = require("../controllers/authController");
// const { protect } = require("../middleware/auth");

// const loginLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   max: 10,
//   message: { message: "Too many attempts. Try again after 15 minutes." },
// });

// router.post("/login", loginLimiter, login);
// router.get("/me", protect, me);

// module.exports = router;

const router = require("express").Router();
const rateLimit = require("express-rate-limit");
const { login, me, changePassword, setMyPhoto } = require("../controllers/authController");
const { protect, restrictTo } = require("../middleware/auth");

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Too many attempts. Try again after 15 minutes." },
});

router.post("/login", loginLimiter, login);
router.get("/me", protect, me);
router.put("/password", protect, loginLimiter, changePassword);
router.put("/photo", protect, restrictTo("student"), setMyPhoto);

module.exports = router;
