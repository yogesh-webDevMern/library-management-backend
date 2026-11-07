// const router = require("express").Router();
// const { getSettings, updateSettings } = require("../controllers/settingsController");
// const { protect, restrictTo } = require("../middleware/auth");

// router.use(protect, restrictTo("librarian"));
// router.route("/").get(getSettings).put(updateSettings);

// module.exports = router;
const router = require("express").Router();
const { getSettings, updateSettings, setDirectorPhoto } = require("../controllers/settingsController");
const { protect, restrictTo } = require("../middleware/auth");

router.use(protect, restrictTo("librarian"));
router.route("/").get(getSettings).put(updateSettings);
router.put("/director-photo", setDirectorPhoto);

module.exports = router;
