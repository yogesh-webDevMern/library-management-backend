const router = require("express").Router();
const { sign } = require("../controllers/uploadController");
const { protect } = require("../middleware/auth");

router.post("/sign", protect, sign);

module.exports = router;
