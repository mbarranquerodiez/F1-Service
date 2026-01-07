import { Router } from 'express';
import {RenderController} from '../controllers/renderController';

const router = Router();
const renderController = new RenderController;

router.get('/', renderController.renderLogin);
router.get('/createAccount', renderController.renderCreateAccount);
router.get('/changePassword', renderController.renderChangePassword);
router.get('/logout', (req, res) => {
    res.clearCookie('token');
    res.redirect('/');
});
router.get('/home', renderController.renderHome);
router.get('/getRacesByYear',renderController.renderAllRacesByYear);
router.get('/getDriversByYear',renderController.renderAllDriversByYear);
router.get('/driverDetails', renderController.renderDriverDetails);
router.get('/raceDetails', renderController.renderRaceDetails);
router.get('/gallery', renderController.renderGallery);
router.get('/circuits', renderController.renderCircuits);
router.get('/circuitDetails', renderController.loadCircuitDetails);

// API endpoints para filtros dinámicos de galería
router.get('/api/teams/:year', renderController.getTeamsByYearAPI);
router.get('/api/circuits/:year', renderController.getCircuitsByYearAPI);

export default router;