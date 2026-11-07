const { startOfDay, todayIST, addMonths, daysBetween } = require("./dates");

// Works out the fee position of one student.
// paidTill = fees are paid up to this date. The next fee becomes due ON that date.
//
// Active student  : dues are counted up to today.
// Inactive student: dues are FROZEN at the day they left (leftOn). Nothing is charged after that day.
exports.feeInfo = (student, today = todayIST()) => {
  const inactive = student.isActive === false;
  const asOf = inactive ? startOfDay(student.leftOn || today) : today;
  const base = startOfDay(student.paidTill || student.registrationDate);
  const anchor = student.billingDay || base.getUTCDate();
  const none = { status: "inactive", dueDate: null, overdueDays: 0, daysLeft: 0, pendingMonths: 0, pendingAmount: 0 };

  if (base > asOf) {
    if (inactive) return none; // had paid ahead when leaving
    const daysLeft = daysBetween(today, base);
    return { status: daysLeft <= 3 ? "due_soon" : "paid", dueDate: base, overdueDays: 0, daysLeft, pendingMonths: 0, pendingAmount: 0 };
  }

  // Active: a new month counts from its start date (due today = 1 month).
  // Inactive: only months that started BEFORE the leaving day are charged.
  let months = 0;
  const started = (d) => (inactive ? d < asOf : d <= asOf);
  while (started(addMonths(base, months, anchor)) && months < 120) months++;

  if (inactive && months === 0) return none;

  const overdueDays = daysBetween(base, asOf);
  return {
    status: inactive ? "left_due" : overdueDays === 0 ? "due_today" : "overdue",
    dueDate: base, overdueDays, daysLeft: 0,
    pendingMonths: months, pendingAmount: months * (student.monthlyFee || 0),
  };
};

// The seat part of the monthly fee (without the locker)
exports.planFeeOf = (s) => s.planFee ?? Math.max(0, (s.monthlyFee || 0) - (s.lockerFee || 0));
