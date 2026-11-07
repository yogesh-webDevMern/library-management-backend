const router = require("express").Router();
const { create, mine, list, update } = require("../controllers/complaintController");
const { protect, restrictTo } = require("../middleware/auth");

router.post("/", protect, restrictTo("student"), create);
router.get("/mine", protect, restrictTo("student"), mine);

router.get("/", protect, restrictTo("librarian"), list);
router.put("/:id", protect, restrictTo("librarian"), update);

module.exports = router;
