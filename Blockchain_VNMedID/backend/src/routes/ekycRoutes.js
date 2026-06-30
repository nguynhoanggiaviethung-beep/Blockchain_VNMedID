const express = require("express");

const router = express.Router();

const upload = require("../middleware/uploadMiddleware");

const {
  verifyCCCD
} = require("../controllers/ekycController");

router.post(
  "/verify-cccd",
  upload.single("image"),
  verifyCCCD
);

module.exports = router;