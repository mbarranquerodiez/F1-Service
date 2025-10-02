import { Router } from 'express';
import { getAllYearRaces, getWeather } from '../controllers/endpointsController';

const router = Router();

router.get('/races/:year', getAllYearRaces);
router.get('/weather/:city/:country/:timestamp', getWeather);

export default router;