const Seat = require("../models/Seat");
const Student = require("../models/Student");
const Settings = require("../models/Settings");
const { claimSeat, freeSeat, slotField } = require("../utils/seatSlots");
const { planFeeOf } = require("../utils/fees");

const FIELDS = "name phone email plan shift registrationDate isActive";
const POPULATE = ["student", "first", "second"].map((path) => ({ path, select: FIELDS }));
const given = (v) => v !== undefined && v !== null && v !== "";

const rangeOf = (body) => {
  const from = Number(body.from), to = Number(body.to);
  return Number.isInteger(from) && Number.isInteger(to) && from >= 1 && to >= from && to <= 500 ? { from, to } : null;
};

// GET /api/seats
exports.listSeats = async (req, res, next) => {
  try { res.json(await Seat.find().sort({ number: 1 }).populate(POPULATE)); } catch (err) { next(err); }
};

// POST /api/seats   body: { from, to, hasLocker? }  -> creates seats (skips ones that already exist)
exports.createSeats = async (req, res, next) => {
  try {
    const r = rangeOf(req.body);
    if (!r) return res.status(400).json({ message: "Enter a valid range, for example 1 to 200 (max 500)." });
    const existing = new Set((await Seat.find({ number: { $gte: r.from, $lte: r.to } }).select("number")).map((s) => s.number));
    const docs = [];
    for (let n = r.from; n <= r.to; n++) if (!existing.has(n)) docs.push({ number: n, hasLocker: !!req.body.hasLocker });
    if (docs.length) await Seat.insertMany(docs);
    res.status(201).json({ created: docs.length, skipped: existing.size });
  } catch (err) { next(err); }
};

// PUT /api/seats/locker   body: { from, to, hasLocker }
// Marks seats as having (or not having) a locker above them. Only seats that are completely free are changed,
// so the fees of students already sitting there never change by surprise.
exports.setLocker = async (req, res, next) => {
  try {
    const r = rangeOf(req.body);
    if (!r) return res.status(400).json({ message: "Enter a valid range." });
    const range = { number: { $gte: r.from, $lte: r.to } };
    const total = await Seat.countDocuments(range);
    const out = await Seat.updateMany({ ...range, student: null, first: null, second: null }, { hasLocker: !!req.body.hasLocker });
    res.json({ updated: out.matchedCount, skipped: total - out.matchedCount, total });
  } catch (err) { next(err); }
};

// PUT /api/seats/:number/assign   body: { studentId, shift?, lockerFee? }
// If the seat has a locker, the locker price is added to the student's monthly fee.
exports.assignSeat = async (req, res, next) => {
  try {
    const number = Number(req.params.number);
    const student = await Student.findById(req.body.studentId);
    if (!student) return res.status(404).json({ message: "Student not found." });
    if (!student.isActive) return res.status(400).json({ message: "Inactive students cannot get a seat." });

    const shift = student.plan === "Half day" ? (req.body.shift || student.shift) : undefined;
    if (student.plan === "Half day" && !["first", "second"].includes(shift)) {
      return res.status(400).json({ message: "Choose first half or second half." });
    }

    const settings = await Settings.current();
    const given_ = given(req.body.lockerFee) ? Number(req.body.lockerFee) : undefined;
    if (given_ !== undefined && (!Number.isFinite(given_) || given_ < 0)) return res.status(400).json({ message: "Enter a valid locker price." });

    const seat = await claimSeat(number, student._id, student.plan, shift);
    if (!seat) return res.status(409).json({ message: "This seat (or this shift) is not available." });

    // Moving: free the old slot. On the same seat (shift change) keep the slot we just took.
    if (student.seatNo) await freeSeat(student.seatNo, student._id, student.seatNo === number ? slotField(student.plan, shift) : undefined);

    const lockerFee = seat.hasLocker ? (given_ ?? settings.lockerFee) : undefined;
    const planFee = planFeeOf(student);
    const set = { seatNo: number, planFee, monthlyFee: planFee + (lockerFee || 0), ...(shift ? { shift } : {}) };
    await Student.updateOne({ _id: student._id }, lockerFee !== undefined ? { $set: { ...set, lockerFee } } : { $set: set, $unset: { lockerFee: 1 } });
    res.json(seat);
  } catch (err) { next(err); }
};

// PUT /api/seats/:number/release   body: { slot?: "student" | "first" | "second" }
// The student stays active but loses the seat (and the locker price leaves the monthly fee).
exports.releaseSeat = async (req, res, next) => {
  try {
    const number = Number(req.params.number);
    const seat = await Seat.findOne({ number });
    if (!seat) return res.status(404).json({ message: "Seat not found." });

    const held = ["student", "first", "second"].filter((f) => seat[f]);
    const target = ["student", "first", "second"].includes(req.body.slot) ? req.body.slot : held.length === 1 ? held[0] : null;
    if (!target || !seat[target]) return res.status(400).json({ message: "Choose which student to release." });

    const studentId = seat[target];
    await Seat.updateOne({ number, [target]: studentId }, { [target]: null });
    const s = await Student.findById(studentId);
    const planFee = s ? planFeeOf(s) : 0;
    await Student.updateOne({ _id: studentId }, { $set: { planFee, monthlyFee: planFee }, $unset: { seatNo: 1, lockerFee: 1 } });
    res.json({ message: "Seat released." });
  } catch (err) { next(err); }
};

// DELETE /api/seats/:number  (only if completely free)
exports.deleteSeat = async (req, res, next) => {
  try {
    const seat = await Seat.findOneAndDelete({ number: Number(req.params.number), student: null, first: null, second: null });
    if (!seat) return res.status(409).json({ message: "Seat is reserved or does not exist." });
    res.json({ message: "Seat deleted." });
  } catch (err) { next(err); }
};
