// Run once:  npm run seed:admin
require("dotenv").config();
const mongoose = require("mongoose");
const Admin = require("../models/Admin");
require("node:dns").setServers(["8.8.8.8", "1.1.1.1"]);
require("dotenv").config();

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD in .env");

  if (await Admin.findOne({ email: ADMIN_EMAIL.toLowerCase() })) {
    console.log("Admin already exists. Nothing changed.");
  } else {
    await Admin.create({ name: ADMIN_NAME || "Admin", email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    console.log("Admin created:", ADMIN_EMAIL);
  }
  await mongoose.disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
    