const Attendance = require("../models/Attendance");

const IST = 5.5 * 3600 * 1000;
exports.GRACE = 30 * 60 * 1000; // clock in is allowed 30 minutes before the shift starts

// full day students follow the whole day; half day students follow their shift
exports.shiftOf = (s) => (s.plan === "Full day" ? "full" : s.shift);

// start and end of the shift as real moments in time, for one Indian calendar day (dayStart = UTC midnight of that day)
exports.shiftWindow = (settings, shift, dayStart) => {
  const at = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return new Date(dayStart.getTime() + (h * 60 + m) * 60000 - IST); };
  const start = shift === "second" ? settings.secondHalf.start : settings.firstHalf.start;
  const end = shift === "first" ? settings.firstHalf.end : settings.secondHalf.end;
  return { start: at(start), end: at(end) };
};

// Students who forgot to clock out are clocked out at the END of their shift (not at the time we noticed).
// Runs whenever attendance is used and every 5 minutes, so it also works on hosts that sleep.
exports.closeExpired = async () => {
  const rows = await Attendance.find({ clockOut: null, autoOutAt: { $lte: new Date() } }).select("autoOutAt");
  if (!rows.length) return 0;
  await Attendance.bulkWrite(rows.map((r) => ({
    updateOne: { filter: { _id: r._id, clockOut: null }, update: { $set: { clockOut: r.autoOutAt, autoClockOut: true } } },
  })));
  return rows.length;
};

exports.timeIST = (d) => new Date(d).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
