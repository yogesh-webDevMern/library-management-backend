// const mongoose = require("mongoose");
// const Student = require("../models/Student");
// const Payment = require("../models/Payment");
// const Settings = require("../models/Settings");
// const { todayIST, parseDate, addMonths, startOfDay, daysBetween } = require("../utils/dates");
// const { feeInfo, planFeeOf } = require("../utils/fees");
// const { claimSeat, freeSeat } = require("../utils/seatSlots");

// const given = (v) => v !== undefined && v !== null && v !== "";

// // POST /api/students  (admin only)
// // plan: "Full day" | "Half day" (+ shift "first" | "second")
// // planFee: fee decided by the admin for this student (defaults to the price in Settings)
// // seatNo: optional. If that seat has a locker, the locker price (Settings, or lockerFee sent by the admin) is added to the monthly fee
// // firstFee: "paid" | "unpaid" | "paidToNow" | "paidTill"
// exports.createStudent = async (req, res, next) => {
//   try {
//     const { name, email, phone, password, feeMode, seatNo, registrationDate, firstFee = "paid" } = req.body;
//     const plan = req.body.plan || "Full day";
//     const shift = plan === "Half day" ? req.body.shift : undefined;

//     if (!name || !email || !phone || !password) return res.status(400).json({ message: "Name, email, phone and password are required." });
//     if (String(password).length < 6) return res.status(400).json({ message: "Password must be at least 6 characters." });
//     if (!["Full day", "Half day"].includes(plan)) return res.status(400).json({ message: "Choose Full day or Half day." });
//     if (plan === "Half day" && !["first", "second"].includes(shift)) {
//       return res.status(400).json({ message: "Choose first half or second half for a half day student." });
//     }

//     const settings = await Settings.current();
//     if (!settings.configured) return res.status(400).json({ message: "Set timings and prices in Settings first." });

//     const planFee = given(req.body.planFee) ? Number(req.body.planFee) : plan === "Full day" ? settings.fullDayFee : settings.halfDayFee;
//     if (!Number.isFinite(planFee) || planFee < 0) return res.status(400).json({ message: "Enter a valid fee." });

//     if (given(req.body.lockerFee) && (!Number.isFinite(Number(req.body.lockerFee)) || Number(req.body.lockerFee) < 0)) {
//       return res.status(400).json({ message: "Enter a valid locker price." });
//     }

//     const today = todayIST();
//     const reg = registrationDate ? parseDate(registrationDate) : today;
//     if (!reg || reg > today) return res.status(400).json({ message: "Registration date is invalid or in the future." });

//     let billingDay = reg.getUTCDate(), paidTill;
//     if (firstFee === "paid") paidTill = addMonths(reg, 1, billingDay);
//     else if (firstFee === "unpaid") paidTill = reg;
//     else if (firstFee === "paidToNow") {
//       // Previous student: everything paid till today. The next fee shows pending on the next monthly date.
//       let n = 1;
//       paidTill = addMonths(reg, n, billingDay);
//       while (paidTill <= today && n < 600) paidTill = addMonths(reg, ++n, billingDay);
//     } else if (firstFee === "paidTill") {
//       paidTill = parseDate(req.body.paidTill);
//       if (!paidTill || paidTill < reg) return res.status(400).json({ message: "Paid till date must be on or after the registration date." });
//       billingDay = paidTill.getUTCDate();
//     } else return res.status(400).json({ message: "Invalid first fee option." });

//     // Claim the seat (atomic), then create the student. Anything that fails is rolled back.
//     const id = new mongoose.Types.ObjectId();
//     let seatNumber, seatDoc;
//     if (given(seatNo)) {
//       seatNumber = Number(seatNo);
//       seatDoc = await claimSeat(seatNumber, id, plan, shift);
//       if (!seatDoc) return res.status(409).json({ message: "That seat is not free for this plan or shift." });
//     }
//     const lockerFee = seatDoc?.hasLocker ? (given(req.body.lockerFee) ? Number(req.body.lockerFee) : settings.lockerFee) : undefined;
//     const monthlyFee = planFee + (lockerFee || 0);

//     let student;
//     try {
//       student = await Student.create({
//         _id: id, name, email, phone, password, plan, shift, planFee, monthlyFee, feeMode,
//         seatNo: seatNumber, lockerFee,
//         registrationDate: reg, paidTill, billingDay,
//       });
//       if (firstFee === "paid" && monthlyFee > 0) {
//         await Payment.create({
//           student: id, amount: monthlyFee, mode: feeMode === "online" ? "online" : "offline", months: 1,
//           periodFrom: reg, periodTo: paidTill, paidOn: reg, note: "First month fee at registration",
//         });
//       }
//     } catch (err) {
//       await Student.deleteOne({ _id: id });
//       if (seatNumber) await freeSeat(seatNumber, id);
//       throw err;
//     }

//     const out = student.toObject();
//     delete out.password;
//     res.status(201).json(out);
//   } catch (err) { next(err); }
// };

// // GET /api/students - each student comes with a "fee" object (status, due date, overdue days, pending amount)
// exports.listStudents = async (req, res, next) => {
//   try {
//     const today = todayIST();
//     const students = await Student.find().sort({ createdAt: -1 }).lean();
//     res.json(students.map((s) => ({ ...s, fee: feeInfo(s, today) })));
//   } catch (err) { next(err); }
// };

// // PUT /api/students/:id/status   body: { isActive: true | false }
// exports.setStatus = async (req, res, next) => {
//   try {
//     const { isActive } = req.body;
//     if (typeof isActive !== "boolean") return res.status(400).json({ message: "isActive must be true or false." });

//     const student = await Student.findById(req.params.id);
//     if (!student) return res.status(404).json({ message: "Student not found." });

//     if (!isActive) {
//       // Left: free the seat (and its locker). The monthly fee stays as it was, so their dues are frozen.
//       if (student.seatNo) await freeSeat(student.seatNo, student._id);
//       await Student.updateOne(
//         { _id: student._id },
//         { isActive: false, leftOn: todayIST(), lastSeatNo: student.seatNo, $unset: { seatNo: 1 } }
//       );
//     } else {
//       // Coming back: days away are not charged (paid-till moves forward by the gap). They start without a seat, so no locker price.
//       const set = { isActive: true, planFee: planFeeOf(student), monthlyFee: planFeeOf(student) };
//       if (student.leftOn) {
//         const gap = daysBetween(startOfDay(student.leftOn), todayIST());
//         if (gap > 0) {
//           const base = startOfDay(student.paidTill || student.registrationDate);
//           const shifted = new Date(base.getTime() + gap * 86400000);
//           set.paidTill = shifted;
//           set.billingDay = shifted.getUTCDate();
//         }
//       }
//       await Student.updateOne({ _id: student._id }, { $set: set, $unset: { leftOn: 1, lockerFee: 1 } });
//     }
//     res.json(await Student.findById(student._id));
//   } catch (err) { next(err); }
// };

// // PUT /api/students/:id/fees   body: { planFee, lockerFee? }  - admin decides the fee for this student
// exports.updateFees = async (req, res, next) => {
//   try {
//     const s = await Student.findById(req.params.id);
//     if (!s) return res.status(404).json({ message: "Student not found." });
//     if (!s.isActive) return res.status(400).json({ message: "Fees of an inactive student cannot be changed." });

//     const planFee = Number(req.body.planFee);
//     if (!Number.isFinite(planFee) || planFee < 0) return res.status(400).json({ message: "Enter a valid fee." });

//     const hasLocker = s.lockerFee !== undefined && s.lockerFee !== null; // student sits on a seat with a locker
//     let lockerFee = s.lockerFee || 0;
//     if (hasLocker && given(req.body.lockerFee)) {
//       lockerFee = Number(req.body.lockerFee);
//       if (!Number.isFinite(lockerFee) || lockerFee < 0) return res.status(400).json({ message: "Enter a valid locker price." });
//     }
//     await Student.updateOne({ _id: s._id }, { planFee, monthlyFee: planFee + (hasLocker ? lockerFee : 0), ...(hasLocker ? { lockerFee } : {}) });
//     res.json(await Student.findById(s._id));
//   } catch (err) { next(err); }
// };



const mongoose = require("mongoose");
const Student = require("../models/Student");
const Payment = require("../models/Payment");
const Settings = require("../models/Settings");
const { todayIST, parseDate, addMonths, startOfDay, daysBetween } = require("../utils/dates");
const { feeInfo, planFeeOf } = require("../utils/fees");
const { claimSeat, freeSeat } = require("../utils/seatSlots");

const given = (v) => v !== undefined && v !== null && v !== "";

// POST /api/students  (admin only)
// plan: "Full day" | "Half day" (+ shift "first" | "second")
// planFee: fee decided by the admin for this student (defaults to the price in Settings)
// seatNo: optional. If that seat has a locker, the locker price (Settings, or lockerFee sent by the admin) is added to the monthly fee
// firstFee: "paid" | "unpaid" | "paidToNow" | "paidTill"
exports.createStudent = async (req, res, next) => {
  try {
    const { name, email, phone, password, feeMode, seatNo, registrationDate, firstFee = "paid" } = req.body;
    const plan = req.body.plan || "Full day";
    const shift = plan === "Half day" ? req.body.shift : undefined;

    if (!name || !email || !phone || !password) return res.status(400).json({ message: "Name, email, phone and password are required." });
    if (String(password).length < 6) return res.status(400).json({ message: "Password must be at least 6 characters." });
    if (!["Full day", "Half day"].includes(plan)) return res.status(400).json({ message: "Choose Full day or Half day." });
    if (plan === "Half day" && !["first", "second"].includes(shift)) {
      return res.status(400).json({ message: "Choose first half or second half for a half day student." });
    }

    const settings = await Settings.current();
    if (!settings.configured) return res.status(400).json({ message: "Set timings and prices in Settings first." });

    const planFee = given(req.body.planFee) ? Number(req.body.planFee) : plan === "Full day" ? settings.fullDayFee : settings.halfDayFee;
    if (!Number.isFinite(planFee) || planFee < 0) return res.status(400).json({ message: "Enter a valid fee." });

    if (given(req.body.lockerFee) && (!Number.isFinite(Number(req.body.lockerFee)) || Number(req.body.lockerFee) < 0)) {
      return res.status(400).json({ message: "Enter a valid locker price." });
    }

    const today = todayIST();
    const reg = registrationDate ? parseDate(registrationDate) : today;
    if (!reg || reg > today) return res.status(400).json({ message: "Registration date is invalid or in the future." });

    let billingDay = reg.getUTCDate(), paidTill;
    if (firstFee === "paid") paidTill = addMonths(reg, 1, billingDay);
    else if (firstFee === "unpaid") paidTill = reg;
    else if (firstFee === "paidToNow") {
      // Previous student: everything paid till today. The next fee shows pending on the next monthly date.
      let n = 1;
      paidTill = addMonths(reg, n, billingDay);
      while (paidTill <= today && n < 600) paidTill = addMonths(reg, ++n, billingDay);
    } else if (firstFee === "paidTill") {
      paidTill = parseDate(req.body.paidTill);
      if (!paidTill || paidTill < reg) return res.status(400).json({ message: "Paid till date must be on or after the registration date." });
      billingDay = paidTill.getUTCDate();
    } else return res.status(400).json({ message: "Invalid first fee option." });

    // Claim the seat (atomic), then create the student. Anything that fails is rolled back.
    const id = new mongoose.Types.ObjectId();
    let seatNumber, seatDoc;
    if (given(seatNo)) {
      seatNumber = Number(seatNo);
      seatDoc = await claimSeat(seatNumber, id, plan, shift);
      if (!seatDoc) return res.status(409).json({ message: "That seat is not free for this plan or shift." });
    }
    const lockerFee = seatDoc?.hasLocker ? (given(req.body.lockerFee) ? Number(req.body.lockerFee) : settings.lockerFee) : undefined;
    const monthlyFee = planFee + (lockerFee || 0);

    let student;
    try {
      student = await Student.create({
        _id: id, name, email, phone, password, plan, shift, planFee, monthlyFee, feeMode,
        seatNo: seatNumber, lockerFee,
        registrationDate: reg, paidTill, billingDay,
      });
      if (firstFee === "paid" && monthlyFee > 0) {
        await Payment.create({
          student: id, amount: monthlyFee, mode: feeMode === "online" ? "online" : "offline", months: 1,
          periodFrom: reg, periodTo: paidTill, paidOn: reg, note: "First month fee at registration",
        });
      }
    } catch (err) {
      await Student.deleteOne({ _id: id });
      if (seatNumber) await freeSeat(seatNumber, id);
      throw err;
    }

    const out = student.toObject();
    delete out.password;
    res.status(201).json(out);
  } catch (err) { next(err); }
};

// GET /api/students - each student comes with a "fee" object (status, due date, overdue days, pending amount)
exports.listStudents = async (req, res, next) => {
  try {
    const today = todayIST();
    const students = await Student.find().sort({ createdAt: -1 }).lean();
    res.json(students.map((s) => ({ ...s, fee: feeInfo(s, today) })));
  } catch (err) { next(err); }
};

// PUT /api/students/:id/status   body: { isActive: true | false }
exports.setStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== "boolean") return res.status(400).json({ message: "isActive must be true or false." });

    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found." });

    if (!isActive) {
      // Left: free the seat (and its locker). The monthly fee stays as it was, so their dues are frozen.
      if (student.seatNo) await freeSeat(student.seatNo, student._id);
      await Student.updateOne(
        { _id: student._id },
        { isActive: false, leftOn: todayIST(), lastSeatNo: student.seatNo, $unset: { seatNo: 1 } }
      );
    } else {
      // Coming back: days away are not charged (paid-till moves forward by the gap). They start without a seat, so no locker price.
      const set = { isActive: true, planFee: planFeeOf(student), monthlyFee: planFeeOf(student) };
      if (student.leftOn) {
        const gap = daysBetween(startOfDay(student.leftOn), todayIST());
        if (gap > 0) {
          const base = startOfDay(student.paidTill || student.registrationDate);
          const shifted = new Date(base.getTime() + gap * 86400000);
          set.paidTill = shifted;
          set.billingDay = shifted.getUTCDate();
        }
      }
      await Student.updateOne({ _id: student._id }, { $set: set, $unset: { leftOn: 1, lockerFee: 1 } });
    }
    res.json(await Student.findById(student._id));
  } catch (err) { next(err); }
};

// PUT /api/students/:id/fees   body: { planFee, lockerFee? }  - admin decides the fee for this student
exports.updateFees = async (req, res, next) => {
  try {
    const s = await Student.findById(req.params.id);
    if (!s) return res.status(404).json({ message: "Student not found." });
    if (!s.isActive) return res.status(400).json({ message: "Fees of an inactive student cannot be changed." });

    const planFee = Number(req.body.planFee);
    if (!Number.isFinite(planFee) || planFee < 0) return res.status(400).json({ message: "Enter a valid fee." });

    const hasLocker = s.lockerFee !== undefined && s.lockerFee !== null; // student sits on a seat with a locker
    let lockerFee = s.lockerFee || 0;
    if (hasLocker && given(req.body.lockerFee)) {
      lockerFee = Number(req.body.lockerFee);
      if (!Number.isFinite(lockerFee) || lockerFee < 0) return res.status(400).json({ message: "Enter a valid locker price." });
    }
    await Student.updateOne({ _id: s._id }, { planFee, monthlyFee: planFee + (hasLocker ? lockerFee : 0), ...(hasLocker ? { lockerFee } : {}) });
    res.json(await Student.findById(s._id));
  } catch (err) { next(err); }
};

// PUT /api/students/:id   body: { name, email, phone, feeMode }  - admin corrects a student's details
exports.updateStudent = async (req, res, next) => {
  try {
    const name = String(req.body.name || "").trim(), email = String(req.body.email || "").trim().toLowerCase(), phone = String(req.body.phone || "").trim();
    if (!name || !email || !phone) return res.status(400).json({ message: "Name, email and phone are required." });
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ message: "Enter a valid email." });
    if (!/^\d{10}$/.test(phone)) return res.status(400).json({ message: "Enter a valid 10 digit mobile number." });
    const set = { name, email, phone };
    if (["offline", "online"].includes(req.body.feeMode)) set.feeMode = req.body.feeMode;

    const out = await Student.findByIdAndUpdate(req.params.id, { $set: set }, { new: true, runValidators: true });
    if (!out) return res.status(404).json({ message: "Student not found." });
    res.json(out);
  } catch (err) { next(err); }
};

// PUT /api/students/:id/password   body: { newPassword }  - student forgot the password, admin sets a new one
exports.resetPassword = async (req, res, next) => {
  try {
    const newPassword = String(req.body.newPassword || "");
    if (newPassword.length < 6 || newPassword.length > 72) return res.status(400).json({ message: "Password must be 6 to 72 characters." });
    const s = await Student.findById(req.params.id).select("+password");
    if (!s) return res.status(404).json({ message: "Student not found." });
    s.password = newPassword;
    await s.save({ validateModifiedOnly: true });   // also logs the student out of old sessions
    res.json({ message: "Password updated." });
  } catch (err) { next(err); }
};
