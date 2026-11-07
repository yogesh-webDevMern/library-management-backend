// require("dotenv").config();
// const app = require("./src/app");
// const connectDB = require("./src/config/db");

// const PORT = process.env.PORT || 5000;

// connectDB()
//   .then(() => app.listen(PORT, () => console.log(`Server running on port ${PORT}`)))
//   .catch((err) => { console.error("DB connection failed:", err.message); process.exit(1); });


require("dotenv").config();
const app = require("./src/app");
const connectDB = require("./src/config/db");
const syncIndexes = require("./src/config/indexes");
const { closeExpired } = require("./src/utils/attendance");

const PORT = process.env.PORT || 5000;

connectDB()
  .then(syncIndexes)
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    // clock out students who forgot, at the end of their shift (also done whenever attendance is opened)
    setInterval(() => closeExpired().catch(() => {}), 5 * 60 * 1000);
  })
  .catch((err) => { console.error("DB connection failed:", err.message); process.exit(1); });
