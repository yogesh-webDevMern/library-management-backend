const mongoose = require("mongoose");

// One clock in / clock out session per student per day.
const attendanceSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    date: { type: Date, required: true },              // the Indian calendar day (stored at UTC midnight)
    clockIn: { type: Date, required: true },
    clockOut: { type: Date, default: null },
    autoOutAt: { type: Date, required: true },         // end of the student's shift: clocked out automatically at this time
    autoClockOut: { type: Boolean, default: false },   // true when the student forgot to clock out
    shift: { type: String, enum: ["full", "first", "second"], required: true },
    seatNo: { type: Number },
  },
  { timestamps: true }
);
attendanceSchema.index({ student: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: 1 });

module.exports = mongoose.model("Attendance", attendanceSchema);
