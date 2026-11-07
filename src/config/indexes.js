// Makes the database indexes match the models (for example removes the old "unique seatNo" index,
// because two half day students may now share a seat).
module.exports = async () => {
  const models = ["Admin", "Student", "Seat", "Payment", "Settings"].map((n) => require(`../models/${n}`));
  for (const m of models) {
    try { await m.syncIndexes(); } catch (e) { console.log(`Index sync skipped for ${m.modelName}: ${e.message}`); }
  }
  console.log("Database indexes ready");
};
