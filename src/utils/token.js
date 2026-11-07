const jwt = require("jsonwebtoken");

exports.signToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES || "7d" });
