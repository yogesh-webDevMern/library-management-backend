const router = require("express").Router();
const { listSeats, createSeats, setLocker, assignSeat, releaseSeat, deleteSeat } = require("../controllers/seatController");
const { protect, restrictTo } = require("../middleware/auth");

router.use(protect, restrictTo("librarian"));
router.route("/").get(listSeats).post(createSeats);
router.put("/locker", setLocker);
router.put("/:number/assign", assignSeat);
router.put("/:number/release", releaseSeat);
router.delete("/:number", deleteSeat);

module.exports = router;
