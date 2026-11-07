// const Settings = require("../models/Settings");

// const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

// // GET /api/settings
// exports.getSettings = async (req, res, next) => {
//   try { res.json(await Settings.current()); } catch (err) { next(err); }
// };

// // PUT /api/settings  { firstHalf:{start,end}, secondHalf:{start,end}, fullDayFee, halfDayFee, lockerFee }
// exports.updateSettings = async (req, res, next) => {
//   try {
//     const b = req.body;
//     const times = [b.firstHalf?.start, b.firstHalf?.end, b.secondHalf?.start, b.secondHalf?.end];
//     if (!times.every((t) => TIME.test(t || ""))) return res.status(400).json({ message: "Enter all four timings." });

//     const [fullDayFee, halfDayFee, lockerFee] = [b.fullDayFee, b.halfDayFee, b.lockerFee].map(Number);
//     if ([fullDayFee, halfDayFee, lockerFee].some((n) => !Number.isFinite(n) || n < 0)) {
//       return res.status(400).json({ message: "Enter valid prices." });
//     }
//     const doc = await Settings.findOneAndUpdate(
//       { key: "main" },
//       { $set: {
//         configured: true,
//         firstHalf: { start: b.firstHalf.start, end: b.firstHalf.end },
//         secondHalf: { start: b.secondHalf.start, end: b.secondHalf.end },
//         fullDayFee, halfDayFee, lockerFee,
//       } },
//       { upsert: true, new: true, setDefaultsOnInsert: true }
//     );
//     res.json(doc);
//   } catch (err) { next(err); }
// };
const Settings = require("../models/Settings");
const { configured, ownsUrl } = require("../utils/cloudinary");

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const clean = (v, max) => String(v ?? "").trim().slice(0, max);

// GET /api/settings
exports.getSettings = async (req, res, next) => {
  try { res.json(await Settings.current()); } catch (err) { next(err); }
};

// PUT /api/settings  { firstHalf:{start,end}, secondHalf:{start,end}, fullDayFee, halfDayFee, lockerFee, director:{name,title,message,phone,email} }
exports.updateSettings = async (req, res, next) => {
  try {
    const b = req.body;
    const times = [b.firstHalf?.start, b.firstHalf?.end, b.secondHalf?.start, b.secondHalf?.end];
    if (!times.every((t) => TIME.test(t || ""))) return res.status(400).json({ message: "Enter all four timings." });

    const [fullDayFee, halfDayFee, lockerFee] = [b.fullDayFee, b.halfDayFee, b.lockerFee].map(Number);
    if ([fullDayFee, halfDayFee, lockerFee].some((n) => !Number.isFinite(n) || n < 0)) {
      return res.status(400).json({ message: "Enter valid prices." });
    }
    const d = b.director || {};
    const doc = await Settings.findOneAndUpdate(
      { key: "main" },
      { $set: {
        configured: true,
        firstHalf: { start: b.firstHalf.start, end: b.firstHalf.end },
        secondHalf: { start: b.secondHalf.start, end: b.secondHalf.end },
        fullDayFee, halfDayFee, lockerFee,
        "director.name": clean(d.name, 80), "director.title": clean(d.title, 80), "director.message": clean(d.message, 600),
        "director.phone": clean(d.phone, 20), "director.email": clean(d.email, 80),
      } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json(doc);
  } catch (err) { next(err); }
};

// PUT /api/settings/director-photo  { url }  (after the browser uploaded the picture to Cloudinary)
exports.setDirectorPhoto = async (req, res, next) => {
  try {
    if (!configured()) return res.status(503).json({ message: "Image upload is not set up yet." });
    if (!ownsUrl(req.body.url, "amaraya/director")) return res.status(400).json({ message: "Invalid picture." });
    res.json(await Settings.findOneAndUpdate({ key: "main" }, { $set: { "director.photo": req.body.url } }, { upsert: true, new: true, setDefaultsOnInsert: true }));
  } catch (err) { next(err); }
};
