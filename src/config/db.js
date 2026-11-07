// const mongoose = require("mongoose");
// const dns = require("node:dns");
// dns.setServers(["8.8.8.8", "1.1.1.1"]);

// module.exports = async () => {
//   await mongoose.connect(process.env.MONGO_URI);
//   console.log("MongoDB Atlas connected");
// };
const dns = require("node:dns");
const mongoose = require("mongoose");
const fixSeatIndex = require("../scripts/fixSeatIndex");

// Fixes the flaky "querySrv ECONNREFUSED" on some networks (local only)
if (process.env.NODE_ENV !== "production") {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
}

module.exports = async () => {
  for (let i = 1; i <= 5; i++) {
    try {
      await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
      await fixSeatIndex();
      console.log("MongoDB Atlas connected");
      return;
    } catch (err) {
      console.log(`DB attempt ${i} failed: ${err.message}`);
      if (i === 5) throw err;
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
};
// const mongoose = require("mongoose");
// const dns = require("dns");

// dns.setServers(["8.8.8.8", "1.1.1.1"]);

// module.exports = async () => {
//   try {
//     await mongoose.connect(process.env.MONGO_URI);

//     console.log("MongoDB Atlas connected successfully");
//   } catch (error) {
//     console.log("MongoDB Error:", error.message);
//     throw error;
//   }
// };