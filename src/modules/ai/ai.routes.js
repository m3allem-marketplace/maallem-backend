const express = require("express");
const aiController = require("./ai.controller");

const router = express.Router();

router.post("/analyze", aiController.analyze);

module.exports = router;
