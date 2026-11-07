exports.notFound = (req, res) => res.status(404).json({ message: "Route not found." });

exports.errorHandler = (err, req, res, next) => {
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || "value";
    return res.status(409).json({ message: `This ${field} is already used.` });
  }
  if (err.name === "ValidationError") {
    return res.status(400).json({ message: Object.values(err.errors).map((e) => e.message).join(", ") });
  }
  console.error(err);
  res.status(500).json({ message: "Something went wrong on the server." });
};
