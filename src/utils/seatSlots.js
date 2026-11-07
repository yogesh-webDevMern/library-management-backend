const Seat = require("../models/Seat");

// Which seat slot does this student need?
//  Full day  -> whole seat (field "student"), seat must be completely free
//  Half day  -> one shift ("first" or "second"), seat must not be full day and that shift must be free
const spec = (plan, shift) => {
  if (plan === "Full day") return { field: "student", cond: { student: null, first: null, second: null } };
  if (shift === "first") return { field: "first", cond: { student: null, first: null } };
  if (shift === "second") return { field: "second", cond: { student: null, second: null } };
  return null;
};

exports.slotField = (plan, shift) => spec(plan, shift)?.field;

// Atomic claim: only succeeds if the slot is still free, so nobody can double book
exports.claimSeat = async (number, studentId, plan, shift) => {
  const sp = spec(plan, shift);
  if (!sp) return null;
  return Seat.findOneAndUpdate({ number, ...sp.cond }, { [sp.field]: studentId }, { new: true });
};

// Frees every slot this student holds on the seat (optionally keep one field, used when only changing shift)
exports.freeSeat = async (number, studentId, except) => {
  if (!number) return;
  await Promise.all(["student", "first", "second"].filter((f) => f !== except)
    .map((f) => Seat.updateOne({ number, [f]: studentId }, { [f]: null })));
};
