import { Router } from 'express';
import {RenderController} from '../controllers/renderController';

const router = Router();
const renderController = new RenderController

router.get('/', renderController.renderLogin);
router.get('/home', renderController.renderHome);
router.get('/getRacesByYear',renderController.renderAllRacesByYear)


export default router;