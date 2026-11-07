// const Admin = require("../models/Admin");
// const Student = require("../models/Student");
// const { signToken } = require("../utils/token");
// const { feeInfo } = require("../utils/fees");
// const Settings = require("../models/Settings");

// // POST /api/auth/login   body: { role: "student" | "librarian", email, password }
// exports.login = async (req, res, next) => {
//   try {
//     const { role, email, password } = req.body;
//     if (!email || !password || !["student", "librarian"].includes(role)) {
//       return res.status(400).json({ message: "Please enter your email and password." });
//     }

//     const Model = role === "librarian" ? Admin : Student;
//     const user = await Model.findOne({ email: String(email).toLowerCase().trim() }).select("+password");

//     // Same message for wrong email and wrong password, so nobody can guess which emails exist
//     if (!user || !(await user.matchPassword(password))) {
//       return res.status(401).json({ message: "Wrong email or password" });
//     }
//     if (user.isActive === false) return res.status(403).json({ message: "Your account is disabled." });

//     res.json({ token: signToken(user._id, role), role, name: user.name });
//   } catch (err) { next(err); }
// };

// // GET /api/auth/me  (any logged in user)
// exports.me = async (req, res, next) => {
//   try {
//     const u = req.user.toObject();
//     delete u.password;
//     const out = { role: req.role, user: u };
//     if (req.role === "student") {
//       out.fee = feeInfo(u);
//       const st = await Settings.current();
//       out.timing = { firstHalf: st.firstHalf, secondHalf: st.secondHalf };
//     }
//     res.json(out);
//   } catch (err) { next(err); }
// };
const Admin = require("../models/Admin");
const Student = require("../models/Student");
const { signToken } = require("../utils/token");
const { feeInfo } = require("../utils/fees");
const Settings = require("../models/Settings");
const { configured, ownsUrl } = require("../utils/cloudinary");

// POST /api/auth/login   body: { role: "student" | "librarian", email, password }
exports.login = async (req, res, next) => {
  try {
    const { role, email, password } = req.body;
    if (!email || !password || !["student", "librarian"].includes(role)) {
      return res.status(400).json({ message: "Please enter your email and password." });
    }

    const Model = role === "librarian" ? Admin : Student;
    const user = await Model.findOne({ email: String(email).toLowerCase().trim() }).select("+password");

    // Same message for wrong email and wrong password, so nobody can guess which emails exist
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: "Wrong email or password" });
    }
    if (user.isActive === false) return res.status(403).json({ message: "Your account is disabled." });

    res.json({ token: signToken(user._id, role), role, name: user.name });
  } catch (err) { next(err); }
};

// GET /api/auth/me  (any logged in user)
exports.me = async (req, res, next) => {
  try {
    const u = req.user.toObject();
    delete u.password;
    const out = { role: req.role, user: u };
    if (req.role === "student") {
      out.fee = feeInfo(u);
      const st = await Settings.current();
      out.timing = { firstHalf: st.firstHalf, secondHalf: st.secondHalf };
      out.director = st.director;
    }
    res.json(out);
  } catch (err) { next(err); }
};

// PUT /api/auth/password  { currentPassword, newPassword }  (librarian or student: changes their OWN password)
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ message: "Enter your current and new password." });
    const min = req.role === "librarian" ? 8 : 6;
    if (String(newPassword).length < min) return res.status(400).json({ message: `New password must be at least ${min} characters.` });
    if (String(newPassword).length > 72) return res.status(400).json({ message: "New password is too long." });
    if (newPassword === currentPassword) return res.status(400).json({ message: "New password must be different from the current one." });

    const Model = req.role === "librarian" ? Admin : Student;
    const user = await Model.findById(req.user._id).select("+password");
    if (!(await user.matchPassword(currentPassword))) return res.status(400).json({ message: "Current password is wrong." });

    user.password = newPassword;
    await user.save({ validateModifiedOnly: true });
    // all older sessions stop working; this device gets a fresh token and stays logged in
    res.json({ message: "Password changed.", token: signToken(user._id, req.role) });
  } catch (err) { next(err); }
};

// PUT /api/auth/photo  { url }  (student: only the profile picture can be changed)
// exports.setMyPhoto = async (req, res, next) => {
//   try {
//     if (!configured()) {
//       return res.status(503).json({
//         message: "Image upload is not set up yet."
//       });
//     }

//     const url = req.body.photo;

//     if (!ownsUrl(url, `amaraya/students/${req.user._id}`)) {
//       return res.status(400).json({
//         message: "Invalid picture."
//       });
//     }

//     const student = await Student.findById(req.user._id);

//     if (!student) {
//       return res.status(404).json({
//         message: "Student not found."
//       });
//     }

//     student.photo = url;
//     await student.save();

//     res.json({
//       message: "Picture saved successfully.",
//       photo: student.photo
//     });

//   } catch (err) {
//     next(err);
//   }
// };
exports.setMyPhoto = async (req, res, next) => {
  try {
    if (!configured()) return res.status(503).json({ message: "Image upload is not set up yet." });
    if (!ownsUrl(req.body.url, `amaraya/students/${req.user._id}`)) return res.status(400).json({ message: "Invalid picture." });
    await Student.updateOne({ _id: req.user._id }, { photo: req.body.url });
    res.json({ photo: req.body.url });
  } catch (err) { next(err); }
};