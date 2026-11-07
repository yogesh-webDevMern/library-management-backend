const router = require("express").Router();
const { recordPayment, listTransactions, deletePayment, summary, myPayments } = require("../controllers/feeController");
const { protect, restrictTo } = require("../middleware/auth");

router.get("/mine", protect, restrictTo("student"), myPayments);

router.use(protect, restrictTo("librarian"));
router.get("/summary", summary);
router.get("/transactions", listTransactions);
router.post("/payments", recordPayment);
router.delete("/payments/:id", deletePayment);

module.exports = router;
