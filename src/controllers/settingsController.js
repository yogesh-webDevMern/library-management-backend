const Settings = require("../models/Settings");

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

// GET /api/settings
exports.getSettings = async (req, res, next) => {
  try { res.json(await Settings.current()); } catch (err) { next(err); }
};

// PUT /api/settings  { firstHalf:{start,end}, secondHalf:{start,end}, fullDayFee, halfDayFee, lockerFee }
exports.updateSettings = async (req, res, next) => {
  try {
    const b = req.body;
    const times = [b.firstHalf?.start, b.firstHalf?.end, b.secondHalf?.start, b.secondHalf?.end];
    if (!times.every((t) => TIME.test(t || ""))) return res.status(400).json({ message: "Enter all four timings." });

    const [fullDayFee, halfDayFee, lockerFee] = [b.fullDayFee, b.halfDayFee, b.lockerFee].map(Number);
    if ([fullDayFee, halfDayFee, lockerFee].some((n) => !Number.isFinite(n) || n < 0)) {
      return res.status(400).json({ message: "Enter valid prices." });
    }
    const doc = await Settings.findOneAndUpdate(
      { key: "main" },
      { $set: {
        configured: true,
        firstHalf: { start: b.firstHalf.start, end: b.firstHalf.end },
        secondHalf: { start: b.secondHalf.start, end: b.secondHalf.end },
        fullDayFee, halfDayFee, lockerFee,
      } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json(doc);
  } catch (err) { next(err); }
};
