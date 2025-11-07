import { Router } from 'express';
import {RenderController} from '../controllers/renderController';

const router = Router();
const renderController = new RenderController

router.get('/', renderController.renderLogin);
router.get('/home', renderController.renderHome);
router.get('/getRacesByYear',renderController.renderAllRacesByYear);
router.get('/getDriversByYear',renderController.renderAllDriversByYear);
router.get('/driverDetails', renderController.renderDriverDetails);
router.get('/raceDetails', renderController.renderRaceDetails);
router.get('/gallery', renderController.renderGallery);
router.get('/circuits', renderController.renderCircuits);
router.get('/circuitDetails', renderController.loadCircuitDetails);

export default router;