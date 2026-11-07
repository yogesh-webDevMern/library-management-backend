const Payment = require("../models/Payment");
const Student = require("../models/Student");
const { todayIST, startOfDay, addMonths, parseDate } = require("../utils/dates");
const { feeInfo } = require("../utils/fees");

// POST /api/fees/payments  { studentId, mode: "offline"|"online", months, amount, paidOn, note }
exports.recordPayment = async (req, res, next) => {
  try {
    const { studentId, mode, note } = req.body;
    const months = Number(req.body.months || 1);
    if (!["offline", "online"].includes(mode)) return res.status(400).json({ message: "Choose offline or online." });
    if (!Number.isInteger(months) || months < 1 || months > 12) return res.status(400).json({ message: "Months must be 1 to 12." });

    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ message: "Student not found." });
    if (!student.isActive) {
      // Students who left can still pay the dues they owed on the day they left
      const info = feeInfo(student);
      if (info.pendingMonths < 1) return res.status(400).json({ message: "This student has left and has no pending fees." });
      if (months > info.pendingMonths) return res.status(400).json({ message: `Only ${info.pendingMonths} month(s) are pending.` });
    }

    const amount = req.body.amount === undefined || req.body.amount === "" ? student.monthlyFee * months : Number(req.body.amount);
    if (!(amount > 0)) return res.status(400).json({ message: "Enter a valid amount." });

    const today = todayIST();
    const paidOn = req.body.paidOn ? parseDate(req.body.paidOn) : today;
    if (!paidOn || paidOn > today) return res.status(400).json({ message: "Payment date cannot be in the future." });

    const from = startOfDay(student.paidTill || student.registrationDate);
    const billingDay = student.billingDay || from.getUTCDate();
    const to = addMonths(from, months, billingDay);

    // Atomic: fails if someone else already recorded a payment for this student in the meantime
    const cond = student.paidTill ? { paidTill: student.paidTill } : { paidTill: { $exists: false } };
    const moved = await Student.findOneAndUpdate({ _id: student._id, ...cond }, { paidTill: to, billingDay });
    if (!moved) return res.status(409).json({ message: "Fees were just updated. Refresh and try again." });

    let payment;
    try {
      payment = await Payment.create({ student: student._id, amount, mode, months, periodFrom: from, periodTo: to, paidOn, note });
    } catch (err) {
      await Student.updateOne({ _id: student._id }, student.paidTill ? { paidTill: student.paidTill } : { $unset: { paidTill: 1 } });
      throw err;
    }
    res.status(201).json(payment);
  } catch (err) { next(err); }
};

// GET /api/fees/transactions?mode=offline|online
exports.listTransactions = async (req, res, next) => {
  try {
    const filter = ["offline", "online"].includes(req.query.mode) ? { mode: req.query.mode } : {};
    res.json(await Payment.find(filter).sort({ paidOn: -1, createdAt: -1 }).limit(1000).populate("student", "name phone seatNo isActive"));
  } catch (err) { next(err); }
};

// DELETE /api/fees/payments/:id   (undo a wrong entry; only the latest payment of a student)
exports.deletePayment = async (req, res, next) => {
  try {
    const p = await Payment.findById(req.params.id);
    if (!p) return res.status(404).json({ message: "Payment not found." });
    const s = await Student.findById(p.student);
    if (s && s.paidTill && s.paidTill.getTime() !== p.periodTo.getTime()) {
      return res.status(409).json({ message: "Only the latest payment of a student can be deleted." });
    }
    if (s) await Student.updateOne({ _id: s._id }, { paidTill: p.periodFrom });
    await p.deleteOne();
    res.json({ message: "Payment deleted." });
  } catch (err) { next(err); }
};

// GET /api/fees/mine  (student: own payment history)
exports.myPayments = async (req, res, next) => {
  try { res.json(await Payment.find({ student: req.user._id }).sort({ paidOn: -1, createdAt: -1 }).limit(100)); } catch (err) { next(err); }
};

// GET /api/fees/summary
exports.summary = async (req, res, next) => {
  try {
    const today = todayIST();
    const y = today.getUTCFullYear(), m = today.getUTCMonth();
    const monthStart = new Date(Date.UTC(y, m, 1)), nextMonth = new Date(Date.UTC(y, m + 1, 1));

    const [byMode, month, students] = await Promise.all([
      Payment.aggregate([{ $group: { _id: "$mode", total: { $sum: "$amount" }, count: { $sum: 1 } } }]),
      Payment.aggregate([{ $match: { paidOn: { $gte: monthStart, $lt: nextMonth } } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
      Student.find().lean(),
    ]);
    const get = (k) => byMode.find((x) => x._id === k) || { total: 0, count: 0 };

    let pendingAmount = 0, pendingStudents = 0, dueSoonStudents = 0, leftDuesAmount = 0, leftDuesStudents = 0;
    for (const s of students) {
      const f = feeInfo(s, today);
      if (f.pendingMonths > 0) {
        pendingAmount += f.pendingAmount; pendingStudents++;
        if (!s.isActive) { leftDuesAmount += f.pendingAmount; leftDuesStudents++; }
      }
      if (f.status === "due_soon") dueSoonStudents++;
    }
    res.json({
      totalCollected: get("offline").total + get("online").total,
      offlineCollected: get("offline").total,
      onlineCollected: get("online").total,
      paymentsCount: get("offline").count + get("online").count,
      thisMonthCollected: month[0]?.total || 0,
      pendingAmount, pendingStudents, dueSoonStudents, leftDuesAmount, leftDuesStudents,
    });
  } catch (err) { next(err); }
};
