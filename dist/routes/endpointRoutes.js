"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const endpointsController_1 = require("../controllers/endpointsController");
const router = (0, express_1.Router)();
router.get('/races/:year', endpointsController_1.getAllYearRaces);
router.get('/location/:city/:country', endpointsController_1.getCityCoordinates);
router.get('/weather/:lat/:lon/:timestamp', endpointsController_1.getWeatherAtTime);
exports.default = router;
