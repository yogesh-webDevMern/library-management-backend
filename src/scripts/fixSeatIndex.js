const mongoose = require("mongoose");

async function fixSeatIndex() {
  try {
    const indexes = await mongoose.connection
      .collection("students")
      .indexes();

    const seatIndex = indexes.find(
      (index) => index.name === "seatNo_1"
    );

    if (seatIndex && seatIndex.unique) {
      await mongoose.connection
        .collection("students")
        .dropIndex("seatNo_1");

      console.log("Old seatNo unique index removed.");
    } else {
      console.log("Seat index is already correct.");
    }
  } catch (error) {
    if (error.codeName === "IndexNotFound") {
      console.log("No old seatNo index found.");
    } else {
      console.error("Seat index migration failed:", error);
      throw error;
    }
  }
}

module.exports = fixSeatIndex;