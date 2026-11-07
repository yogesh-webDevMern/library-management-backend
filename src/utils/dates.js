// All dates are handled as plain calendar days (UTC midnight), using the Indian date for "today".
const IST_OFFSET = 5.5 * 60 * 60 * 1000;

const startOfDay = (d) => {
  const x = new Date(d);
  return new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate()));
};

exports.startOfDay = startOfDay;
exports.todayIST = () => startOfDay(new Date(Date.now() + IST_OFFSET));
exports.parseDate = (v) => { const d = new Date(v); return isNaN(d) ? null : startOfDay(d); };
exports.daysBetween = (a, b) => Math.round((b - a) / 86400000);

// Adds n months but keeps the billing day (23rd stays 23rd; 31st becomes the last day of short months)
exports.addMonths = (date, n, anchorDay) => {
  const y = date.getUTCFullYear(), m = date.getUTCMonth() + n;
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(anchorDay || date.getUTCDate(), last)));
};
