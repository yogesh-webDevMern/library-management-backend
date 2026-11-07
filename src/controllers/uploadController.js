const { configured, signUpload } = require("../utils/cloudinary");

// POST /api/uploads/sign
// Student -> may only upload their own picture. Librarian -> may only upload the director picture.
exports.sign = (req, res) => {
  if (!configured()) return res.status(503).json({ message: "Image upload is not set up yet. Add the Cloudinary keys to the backend .env file." });
  const publicId = req.role === "student" ? `amaraya/students/${req.user._id}` : "amaraya/director";
  res.json(signUpload(publicId));
};
