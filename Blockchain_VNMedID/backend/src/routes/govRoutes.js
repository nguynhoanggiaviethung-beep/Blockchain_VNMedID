const express = require("express");
const router = express.Router();
const govController = require("../controllers/govController");

router.get("/gov-data", govController.getGovData);

module.exports = router;
