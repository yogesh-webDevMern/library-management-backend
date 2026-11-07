const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const studentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    plan: { type: String, enum: ["Full day", "Half day"], default: "Full day" },
    shift: { type: String, enum: ["first", "second"] },   // half day students only
    // Fees. monthlyFee = planFee + lockerFee (lockerFee only when the seat has a locker)
    planFee: { type: Number, min: 0 },                    // seat fee decided by the admin for this student
    lockerFee: { type: Number, min: 0 },                  // set when the student's seat has a locker
    monthlyFee: { type: Number, required: true, min: 0 },
    feeMode: { type: String, enum: ["offline", "online"], default: "offline" },
    // Several half day students can share one seat number (one per shift), so seatNo is NOT unique
    seatNo: { type: Number },
    lastSeatNo: { type: Number },
    registrationDate: { type: Date, default: Date.now },
    paidTill: { type: Date },      // fees paid up to this date; next fee is due on it
    billingDay: { type: Number, min: 1, max: 31 },
    isActive: { type: Boolean, default: true },
    photo: { type: String },                // Cloudinary url, uploaded by the student
    passwordChangedAt: { type: Date },
    leftOn: { type: Date },
  },
  { timestamps: true }
);

studentSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12);
  this.passwordChangedAt = new Date(Date.now() - 1000); // older tokens stop working after a password change
});

studentSchema.methods.matchPassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model("Student", studentSchema);
