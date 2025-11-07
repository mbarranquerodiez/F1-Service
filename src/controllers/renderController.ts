import { Request, Response } from 'express';
import db from '../config/db';
import { sendOk, sendBadParam, sendUnauthorized, sendServerError, sendConflict, sendNotFound } from '../utils/messages';
import { verifyToken } from '../utils/tokenDecode';
import {EndPoitnsController} from './endpointsController';
import { info } from 'console';

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
    
    
            const infoAllYearRaces = await endpointsController.getRacesByYear(year);

            res.render('allRaces', {year, infoAllYearRaces});
    
        } catch (error) {
            console.error('Error al procesar la solicitud:', error);
            return sendServerError(res, undefined, ip, 'Error en el servidor', endpoint);
        }
    };
    renderRaceDetails = async (req: Request, res: Response) => {

        const endpoint = `${req.method} ${req.url}`;
        const token = req.cookies.access_token
        const ip = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '';

        const city = req.query.city as string ;
        const country = req.query.country as string ;
        const timestamp = req.query.timestamp as string;

        if (!city || !country || !timestamp) {
            return res.status(400).json({ error: 'Faltan parámetros obligatorios' });
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

            const infoRaceDetails = await endpointsController.getRaceDetails(city, country, timestamp);

            if(infoRaceDetails.success === true){
                res.render('raceDetails', {infoRaceDetails});
            }else{
                res.render("errorPage", {infoRaceDetails});
            }

        } catch (error) {
            console.error('Error al procesar la solicitud:', error);
            return sendServerError(res, undefined, ip, 'Error en el servidor', endpoint);
        }

    };
    renderAllDriversByYear = async (req: Request, res: Response) => {

    
        const endpoint = `${req.method} ${req.url}`;
        const token = req.cookies.access_token
        const ip = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '';
        console.log(req.query.year)
    
    
        const yearString = req.query.year as string | undefined;
        const year = yearString && !isNaN(parseInt(yearString, 10)) ? parseInt(yearString, 10) : new Date().getFullYear();
    
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
    
    
            const infoAllYearDriversByYear =  await endpointsController.getAllDriverByYear(year);
            if(infoAllYearDriversByYear.success === true){
                console.log("Entra en succes true",infoAllYearDriversByYear);
                res.render('allDrivers', {year, infoAllYearDriversByYear});
            }else{
                res.render("errorPage", {infoAllYearDriversByYear});
            }
    
        } catch (error) {
            console.error('Error al procesar la solicitud:', error);
            return sendServerError(res, undefined, ip, 'Error en el servidor', endpoint);
        }
    }
    renderDriverDetails = async (req: Request, res: Response) => {

    
        const endpoint = `${req.method} ${req.url}`;
        const token = req.cookies.access_token
        const ip = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '';
        console.log(req.query.year, req.query.driverId)
    
    
        const yearString = req.query.year as string | undefined;
        const driverId = req.query.driverId as string | undefined;
        const year = yearString && !isNaN(parseInt(yearString, 10)) ? parseInt(yearString, 10) : new Date().getFullYear();
    
      // Validate year
      if (isNaN(year) || year < 1900 || year > 2100 || !driverId) {
        return res.status(400).json({ error: 'Invalid year or driverId' });
      }

      const infoDriverDetails = await endpointsController.getDriverDetails(year, driverId);

      if(infoDriverDetails.success === true){
          res.render('driverDetails', {year, infoDriverDetails});
      }else{
          res.render("errorPage", {infoDriverDetails});
      }

    }
    renderGallery = async (req: Request, res: Response) => {

    
        const endpoint = `${req.method} ${req.url}`;
        const token = req.cookies.access_token
        const ip = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '';
    
    
          if (!token) {
                return sendUnauthorized(res, undefined, ip, 'Token no proporcionado', endpoint);
            }
    
        
        try {

            // Solución sencilla: declara filters con tipo union para permitir null
            let filters: any | null = req.query;
            console.log("Filtros recibidos en renderGallery:", filters);

        // Si no hay nada en la query (objeto vacío), setear a null
             if (Object.keys(filters as any).length === 0) {
                filters = null;
                console.log("No hay filtros en la query, se setea a null", filters);
             }

            const decoded = await verifyToken(token);
    
            if (typeof decoded !== 'object' || decoded === null) {
                console.error('Decodificación fallida, no es un objeto válido.');
            }
            const inforGalleryPage = await endpointsController.getGalleryPageInfo(filters);


            res.render('galleryF1', { inforGalleryPage });

        } catch (error) {
            console.error('Error al procesar la solicitud:', error);
            return sendServerError(res, undefined, ip, 'Error en el servidor', endpoint);
        }
    }
    renderCircuits = async (req: Request, res: Response) => {

    
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
            const circuitsInfo = await endpointsController.getCircuits();

            res.render('circuits', { circuitsInfo });
        } catch (error) {
            console.error('Error al procesar la solicitud:', error);
            return sendServerError(res, undefined, ip, 'Error en el servidor', endpoint);
        }
    };

    loadCircuitDetails = async (req: Request, res: Response) => {

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

            const idString  = req.params.id as string | undefined;
            const id = idString && !isNaN(parseInt(idString, 10)) ? parseInt(idString, 10) : undefined;
       


            if (!id) {
                return sendBadParam(res, undefined, ip, 'El id del circuito es obligatorio', endpoint);
            }
            const circuitInfo = await endpointsController.loadCircuitDetails(id);
            return circuitInfo;
        } catch (error) {
            console.error('Error al cargar información del circuito:', error);
            throw error;
        }
    };
    };
