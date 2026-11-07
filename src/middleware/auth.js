const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const Student = require("../models/Student");

// Checks the token and loads the user
exports.protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: "Please log in first." });

    const { id, role } = jwt.verify(token, process.env.JWT_SECRET);
    const Model = role === "librarian" ? Admin : Student;
    const user = await Model.findById(id);
    if (!user || user.isActive === false) return res.status(401).json({ message: "Account not found." });

    req.user = user;
    req.role = role;
    next();
  } catch {
    res.status(401).json({ message: "Session expired. Please log in again." });
  }
};

// Allows only the given roles: restrictTo("librarian")
exports.restrictTo = (...roles) => (req, res, next) =>
  roles.includes(req.role) ? next() : res.status(403).json({ message: "You are not allowed to do this." });
