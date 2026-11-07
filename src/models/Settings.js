const mongoose = require("mongoose");

// One document for the whole library: timings and default prices
const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: "main", unique: true },
    configured: { type: Boolean, default: false },   // false until the admin saves Settings once
    firstHalf: { start: { type: String, default: "06:00" }, end: { type: String, default: "14:00" } },
    secondHalf: { start: { type: String, default: "14:00" }, end: { type: String, default: "23:00" } },
    fullDayFee: { type: Number, default: 799, min: 0 },
    halfDayFee: { type: Number, default: 499, min: 0 },
    lockerFee: { type: Number, default: 199, min: 0 },
  },
  { timestamps: true }
);

settingsSchema.statics.current = function () {
  return this.findOneAndUpdate({ key: "main" }, { $setOnInsert: { key: "main" } }, { upsert: true, new: true, setDefaultsOnInsert: true });
};

module.exports = mongoose.model("Settings", settingsSchema);
