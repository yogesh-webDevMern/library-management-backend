const Complaint = require("../models/Complaint");
const { CATEGORIES } = Complaint;

const DAY = 24 * 3600 * 1000;

// POST /api/complaints  (student)  { category, description }
exports.create = async (req, res, next) => {
  try {
    const { category } = req.body;
    const description = String(req.body.description || "").trim();
    if (!CATEGORIES.includes(category)) return res.status(400).json({ message: "Choose what the problem is about." });
    if (description.length < 5) return res.status(400).json({ message: "Please describe the problem (at least 5 characters)." });
    if (description.length > 500) return res.status(400).json({ message: "Please keep the description under 500 characters." });

    const open = await Complaint.countDocuments({ student: req.user._id, status: { $ne: "resolved" } });
    if (open >= 5) return res.status(400).json({ message: "You already have 5 open issues. Please wait until they are resolved." });

    res.status(201).json(await Complaint.create({
      student: req.user._id, category, description, seatNo: req.user.seatNo, dueAt: new Date(Date.now() + DAY),
    }));
  } catch (err) { next(err); }
};

// GET /api/complaints/mine  (student)
exports.mine = async (req, res, next) => {
  try { res.json(await Complaint.find({ student: req.user._id }).sort({ createdAt: -1 }).limit(50)); } catch (err) { next(err); }
};

// GET /api/complaints  (librarian)
exports.list = async (req, res, next) => {
  try {
    res.json(await Complaint.find().sort({ createdAt: -1 }).limit(500).populate("student", "name phone seatNo photo"));
  } catch (err) { next(err); }
};

// PUT /api/complaints/:id  (librarian)  { status, adminNote }
exports.update = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!["open", "in_progress", "resolved"].includes(status)) return res.status(400).json({ message: "Invalid status." });
    const c = await Complaint.findById(req.params.id);
    if (!c) return res.status(404).json({ message: "Issue not found." });

    c.status = status;
    if (typeof req.body.adminNote === "string") c.adminNote = req.body.adminNote.trim().slice(0, 300);
    if (status === "in_progress" && !c.startedAt) c.startedAt = new Date();
    if (status === "resolved") c.resolvedAt = c.resolvedAt || new Date(); else c.resolvedAt = undefined;
    await c.save();
    res.json(await c.populate("student", "name phone seatNo photo"));
  } catch (err) { next(err); }
};
