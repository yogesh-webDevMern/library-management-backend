const Attendance = require("../models/Attendance");
const Student = require("../models/Student");
const Settings = require("../models/Settings");
const { todayIST, parseDate } = require("../utils/dates");
const { shiftOf, shiftWindow, closeExpired, timeIST, GRACE } = require("../utils/attendance");

const monthRange = (m) => {
  const t = todayIST();
  const start = /^\d{4}-(0[1-9]|1[0-2])$/.test(m || "") ? new Date(`${m}-01T00:00:00Z`) : new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), 1));
  return { start, end: new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1)), month: start.toISOString().slice(0, 7) };
};
const minutes = (r) => Math.max(0, Math.round(((r.clockOut || new Date()) - r.clockIn) / 60000));
const summarize = (recs) => ({
  daysPresent: recs.length,
  totalMinutes: recs.reduce((t, r) => t + minutes(r), 0),
  autoClosed: recs.filter((r) => r.autoClockOut).length,
});

// POST /api/attendance/clock-in  (student)
exports.clockIn = async (req, res, next) => {
  try {
    await closeExpired();
    const s = req.user;
    if (!s.isActive) return res.status(403).json({ message: "Your account is inactive." });
    const shift = shiftOf(s);
    if (!["full", "first", "second"].includes(shift)) return res.status(400).json({ message: "Your shift is not set yet. Please contact the library desk." });

    const settings = await Settings.current();
    const today = todayIST(), now = new Date();
    const w = shiftWindow(settings, shift, today);
    if (now < new Date(w.start - GRACE)) return res.status(400).json({ message: `Clock in opens at ${timeIST(new Date(w.start - GRACE))}.` });
    if (now >= w.end) return res.status(400).json({ message: "Your shift has ended for today." });

    try {
      res.status(201).json(await Attendance.create({ student: s._id, date: today, clockIn: now, autoOutAt: w.end, shift, seatNo: s.seatNo }));
    } catch (e) {
      if (e.code === 11000) return res.status(409).json({ message: "You have already clocked in today." });
      throw e;
    }
  } catch (err) { next(err); }
};

// POST /api/attendance/clock-out  (student)
exports.clockOut = async (req, res, next) => {
  try {
    await closeExpired();
    const today = todayIST();
    const rec = await Attendance.findOneAndUpdate({ student: req.user._id, date: today, clockOut: null }, { clockOut: new Date() }, { new: true });
    if (rec) return res.json(rec);
    const any = await Attendance.findOne({ student: req.user._id, date: today });
    res.status(400).json({ message: any ? (any.autoClockOut ? "You were clocked out automatically at the end of your shift." : "You have already clocked out today.") : "You have not clocked in today." });
  } catch (err) { next(err); }
};

// GET /api/attendance/me?month=YYYY-MM  (student)
exports.myAttendance = async (req, res, next) => {
  try {
    await closeExpired();
    const s = req.user;
    const settings = await Settings.current();
    const today = todayIST(), now = new Date(), r = monthRange(req.query.month);
    const shift = shiftOf(s);
    const [todayRec, records] = await Promise.all([
      Attendance.findOne({ student: s._id, date: today }),
      Attendance.find({ student: s._id, date: { $gte: r.start, $lt: r.end } }).sort({ date: -1 }),
    ]);

    let canClockIn = false, reason = "", window = null;
    if (!["full", "first", "second"].includes(shift)) reason = "Your shift is not set yet. Please contact the library desk.";
    else {
      const w = shiftWindow(settings, shift, today);
      window = { start: w.start, end: w.end };
      if (todayRec) reason = todayRec.clockOut ? "You have completed today's session." : "";
      else if (now < new Date(w.start - GRACE)) reason = `Clock in opens at ${timeIST(new Date(w.start - GRACE))}.`;
      else if (now >= w.end) reason = "Your shift has ended for today.";
      else canClockIn = true;
    }
    res.json({ shift, window, today: todayRec, canClockIn, reason, records, summary: summarize(records), month: r.month });
  } catch (err) { next(err); }
};

// GET /api/attendance?date=YYYY-MM-DD  (librarian) - who came on that day
exports.listDay = async (req, res, next) => {
  try {
    await closeExpired();
    const today = todayIST();
    const day = req.query.date ? parseDate(req.query.date) : today;
    if (!day) return res.status(400).json({ message: "Invalid date." });

    const records = await Attendance.find({ date: day }).sort({ clockIn: 1 }).populate("student", "name phone plan shift seatNo photo isActive");
    const seen = new Set(records.map((x) => String(x.student?._id)));
    const actives = await Student.find({ isActive: true, registrationDate: { $lte: new Date(day.getTime() + 86399999) } }).select("name phone plan shift seatNo photo").lean();
    const absent = day > today ? [] : actives.filter((x) => !seen.has(String(x._id)));

    res.json({
      date: day, records, absent,
      counts: { present: records.length, inside: records.filter((x) => !x.clockOut).length, auto: records.filter((x) => x.autoClockOut).length, absent: absent.length },
    });
  } catch (err) { next(err); }
};

// GET /api/attendance/student/:id?month=YYYY-MM  (librarian)
exports.studentHistory = async (req, res, next) => {
  try {
    await closeExpired();
    const student = await Student.findById(req.params.id).select("name phone plan shift seatNo photo isActive");
    if (!student) return res.status(404).json({ message: "Student not found." });
    const r = monthRange(req.query.month);
    const records = await Attendance.find({ student: student._id, date: { $gte: r.start, $lt: r.end } }).sort({ date: -1 });
    res.json({ student, records, summary: summarize(records), month: r.month });
  } catch (err) { next(err); }
};
