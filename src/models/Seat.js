const mongoose = require("mongoose");
const ref = { type: mongoose.Schema.Types.ObjectId, ref: "Student", default: null };

// A seat can be held by ONE full day student, or by up to TWO half day students (one per shift).
// hasLocker = there is a locker above this seat. Its price is added to the fees of whoever sits here.
const seatSchema = new mongoose.Schema(
  {
    number: { type: Number, required: true, unique: true, min: 1 },
    hasLocker: { type: Boolean, default: false },
    student: ref, // full day holder
    first: ref,   // first half holder
    second: ref,  // second half holder
  },
  { timestamps: true }
);

module.exports = mongoose.model("Seat", seatSchema);
