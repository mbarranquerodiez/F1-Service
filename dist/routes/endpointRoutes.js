"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const endpointsController_1 = require("../controllers/endpointsController");
const router = (0, express_1.Router)();
router.get('/races/:year', endpointsController_1.getAllYearRaces);
router.get('/weather/:city/:country/:timestamp', endpointsController_1.getWeather);
exports.default = router;
