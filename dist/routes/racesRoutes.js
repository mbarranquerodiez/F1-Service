"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const racesController_1 = require("../controllers/racesController");
const router = (0, express_1.Router)();
router.get('/:year', racesController_1.getAllYearRaces);
exports.default = router;
