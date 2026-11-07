const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true, index: true },
    amount: { type: Number, required: true, min: 1 },
    mode: { type: String, enum: ["offline", "online"], required: true },
    months: { type: Number, default: 1, min: 1, max: 12 },
    periodFrom: { type: Date, required: true },   // fee period covered by this payment
    periodTo: { type: Date, required: true },     // = student's new "paid till" date
    paidOn: { type: Date, required: true, index: true },
    note: { type: String, trim: true, maxlength: 200 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);
