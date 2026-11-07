const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json({ limit: "10kb" }));

app.get("/api/health", (req, res) => res.json({ ok: true }));
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/students", require("./routes/studentRoutes"));
app.use("/api/seats", require("./routes/seatRoutes"));
app.use("/api/fees", require("./routes/feeRoutes"));
app.use("/api/settings", require("./routes/settingsRoutes"));
app.use("/api/attendance", require("./routes/attendanceRoutes"));
app.use("/api/complaints", require("./routes/complaintRoutes"));
app.use("/api/uploads", require("./routes/uploadRoutes"));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
