const router = require("express").Router();
const { getSettings, updateSettings } = require("../controllers/settingsController");
const { protect, restrictTo } = require("../middleware/auth");

router.use(protect, restrictTo("librarian"));
router.route("/").get(getSettings).put(updateSettings);

module.exports = router;
