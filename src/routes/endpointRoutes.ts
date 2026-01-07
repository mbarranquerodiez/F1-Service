import { Router, Request, Response } from 'express';
import { EndPoitnsController } from '../controllers/endpointsController';

const router = Router();
const endpointsController = new EndPoitnsController();

// Rutas API para obtener equipos y circuitos por año
router.get('/api/teams/:year', async (req: Request, res: Response) => {
    const year = parseInt(req.params.year, 10);
    if (isNaN(year)) {
        return res.status(400).json({ success: false, message: 'Año inválido' });
    }
    const result = await endpointsController.getTeamsByYear(year);
    res.json(result);
});

router.get('/api/circuits/:year', async (req: Request, res: Response) => {
    const year = parseInt(req.params.year, 10);
    if (isNaN(year)) {
        return res.status(400).json({ success: false, message: 'Año inválido' });
    }
    const result = await endpointsController.getCircuitsByYear(year);
    res.json(result);
});

export default router;