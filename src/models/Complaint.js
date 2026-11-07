const mongoose = require("mongoose");

const CATEGORIES = [
  "cleanliness",
  "chair",
  "lighting",
  "water",
  "washroom",
  "other"
];

const complaintSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true, index: true },
    category: { type: String, enum: CATEGORIES, required: true },
    description: { type: String, required: true, trim: true, minlength: 5, maxlength: 500 },
    seatNo: { type: Number },
    status: { type: String, enum: ["open", "in_progress", "resolved"], default: "open", index: true },
    dueAt: { type: Date, required: true },             // created + 24 hours: the library promises to fix it by then
    startedAt: { type: Date },
    resolvedAt: { type: Date },
    adminNote: { type: String, trim: true, maxlength: 300 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Complaint", complaintSchema);
module.exports.CATEGORIES = CATEGORIES;
