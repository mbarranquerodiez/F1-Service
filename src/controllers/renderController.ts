import { Request, Response } from 'express';
import db from '../config/db';
import { sendOk, sendBadParam, sendUnauthorized, sendServerError, sendConflict, sendNotFound } from '../utils/messages';
import { verifyToken } from '../utils/tokenDecode';
import {EndPoitnsController} from './endpointsController';

const endpointsController = new EndPoitnsController();
/************************************************************************ */

export class RenderController{

    renderLogin = async (req: Request, res: Response) => {
        const endpoint = `${req.method} ${req.url}`;
        const ip = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '';
    
        try {
            res.render('login');
        } catch (error) {
            console.error('Error al renderizar la página de login:', error);
            return sendServerError(res, undefined, ip, 'Error en el servidor', endpoint);
        }
    };
    
    /**
     * Cambiar la contraseña de un usuario.
     * @route GET /api/home
     * @group User
     * @param {string} req.headers.authorization - token de acceso 
     * @returns {object} 200 - Carga Home
     * @returns {object} 400 - Solicitud incorrecta
     * @returns {object} 401 - No autorizado, nombre de usuario o contraseña anterior incorrectos
     * @returns {object} 500 - Error interno del servidor
     */
    
    renderHome = async (req: Request, res: Response) => {
    
        const endpoint = `${req.method} ${req.url}`;
        const token = req.cookies.access_token
        const ip = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '';
    
    
        if (!token) {
    
            return sendUnauthorized(res, undefined, ip, 'Token no proporcionado', endpoint);
        }
    
        
        try {
            
            const decoded = await verifyToken(token);
    
            if (typeof decoded !== 'object' || decoded === null) {
                console.error('Decodificación fallida, no es un objeto válido.');
                return sendUnauthorized(res, undefined, ip, 'Token inválido', endpoint);
            }
            const infoHomeRacesInfo = await endpointsController.getRacesInfo();
            console.log(infoHomeRacesInfo.lastRace.race[0].raceName)
    
            // Renderizar la plantilla EJS sin datos dinámicos por ahora
            res.render('home', {infoHomeRacesInfo});
        } catch (error) {
            console.error('Error al procesar la solicitud:', error);
            return sendServerError(res, undefined, ip, 'Error en el servidor', endpoint);
        }
    };
    
    
    
    renderAllRacesByYear = async (req: Request, res: Response) => {
    
        const endpoint = `${req.method} ${req.url}`;
        const token = req.cookies.access_token
        const ip = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '';
        console.log(req.query.year)
    
    
        const yearString = req.query.year as string | undefined;
        const year = yearString && !isNaN(parseInt(yearString, 10)) 
        ? parseInt(yearString, 10) 
        : new Date().getFullYear();
    
      // Validate year
      if (isNaN(year) || year < 1900 || year > 2100) {
        return res.status(400).json({ error: 'Invalid year' });
      }
       
    
        if (!token) {
    
            return sendUnauthorized(res, undefined, ip, 'Token no proporcionado', endpoint);
        }
    
        
        try {
            
            const decoded = await verifyToken(token);
    
            if (typeof decoded !== 'object' || decoded === null) {
                console.error('Decodificación fallida, no es un objeto válido.');
                return sendUnauthorized(res, undefined, ip, 'Token inválido', endpoint);
            }
    
    
            const infoAllYearRaces = await endpointsController.getAllYearRaces(year);
            res.render('allRaces', {year, infoAllYearRaces});
    
        } catch (error) {
            console.error('Error al procesar la solicitud:', error);
            return sendServerError(res, undefined, ip, 'Error en el servidor', endpoint);
        }
    };

}







