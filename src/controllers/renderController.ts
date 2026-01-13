import { Request, Response } from 'express';
import db from '../config/db';
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
            return res.render("errorPage", {
                errorCode: 500,
                errorMessage: 'Error interno del servidor',
                errorDetails: 'No se pudo cargar la página de login'
            });
        }
    }; 
    renderCreateAccount = async (req: Request, res: Response) => {
        const endpoint = `${req.method} ${req.url}`;
        const ip = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '';
    
        try {
            res.render('createAccount');
        } catch (error) {
            console.error('Error al renderizar la página de createAccount:', error);
            return res.render("errorPage", {
                errorCode: 500,
                errorMessage: 'Error interno del servidor',
                errorDetails: 'No se pudo cargar la página de registro'
            });
        }
    }; 
    renderChangePassword = async (req: Request, res: Response) => {
        const endpoint = `${req.method} ${req.url}`;
        const ip = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '';
    
        try {
            res.render('changePassword');
        } catch (error) {
            console.error('Error al renderizar la página de changePassword:', error);
            return res.render("errorPage", {
                errorCode: 500,
                errorMessage: 'Error interno del servidor',
                errorDetails: 'No se pudo cargar la página de cambio de contraseña'
            });
        }
    };
    renderHome = async (req: Request, res: Response) => {
    
        const endpoint = `${req.method} ${req.url}`;
        const token = req.cookies.access_token
        const ip = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '';
    
    
        if (!token) {
            return res.render("errorPage", {
                errorCode: 401,
                errorMessage: 'Acceso no autorizado',
                errorDetails: 'Debes iniciar sesión para acceder a esta página'
            });
        }
    
        
        try {
            
            const decoded = await verifyToken(token);
    
            if (typeof decoded !== 'object' || decoded === null) {
                console.error('Decodificación fallida, no es un objeto válido.');
                return res.render("errorPage", {
                    errorCode: 401,
                    errorMessage: 'Sesión inválida',
                    errorDetails: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.'
                });
            }
            const infoHomeRacesInfo = await endpointsController.getRacesInfo();

            // Renderizar la plantilla EJS sin datos dinámicos por ahora
            res.render('home', {infoHomeRacesInfo});
        } catch (error) {
            console.error('Error al procesar la solicitud:', error);
            return res.render("errorPage", {
                errorCode: 500,
                errorMessage: 'Error interno del servidor',
                errorDetails: 'No se pudo cargar la página principal'
            });
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
            return res.render("errorPage", {
                errorCode: 401,
                errorMessage: 'Acceso no autorizado',
                errorDetails: 'Debes iniciar sesión para acceder a esta página'
            });
        }
    
        
        try {
            
            const decoded = await verifyToken(token);

            if (typeof decoded !== 'object' || decoded === null) {
                console.error('Decodificación fallida, no es un objeto válido.');
                return res.render("errorPage", {
                    errorCode: 401,
                    errorMessage: 'Sesión inválida',
                    errorDetails: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.'
                });
            }


            const result = await endpointsController.getRacesByYear(year);
            const infoAllYearRaces = result.races;
            const actualYear = result.actualYear; // Año real usado si hubo fallback

            res.render('allRaces', {year: actualYear, infoAllYearRaces});
    
        } catch (error) {
            console.error('Error al procesar la solicitud:', error);
            return res.render("errorPage", {
                errorCode: 500,
                errorMessage: 'Error interno del servidor',
                errorDetails: 'No se pudieron cargar las carreras. Inténtalo de nuevo más tarde.'
            });
        }
    };
    renderRaceDetails = async (req: Request, res: Response) => {

        const endpoint = `${req.method} ${req.url}`;
        const token = req.cookies.access_token
        const ip = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '';

        const city = req.query.city as string;
        const country = req.query.country as string;
        const timestamp = req.query.timestamp as string;
        const yearStr = req.query.year as string;
        const roundStr = req.query.round as string;

        if (!city || !country || !timestamp) {
            return res.render("errorPage", {
                errorCode: 400,
                errorMessage: 'Parámetros faltantes',
                errorDetails: 'Faltan parámetros obligatorios: ciudad, país y fecha de la carrera.'
            });
        }

          if (!token) {
            return res.render("errorPage", {
                errorCode: 401,
                errorMessage: 'Acceso no autorizado',
                errorDetails: 'Debes iniciar sesión para acceder a esta página'
            });
        }

        try {
            
            const decoded = await verifyToken(token);
    
            if (typeof decoded !== 'object' || decoded === null) {
                console.error('Decodificación fallida, no es un objeto válido.');
                return res.render("errorPage", {
                    errorCode: 401,
                    errorMessage: 'Sesión inválida',
                    errorDetails: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.'
                });
            }

            const infoRaceDetails = await endpointsController.getRaceDetails(city, country, timestamp);

            if(infoRaceDetails.success === true){
                let infoRaceResults = null;
                
                // Obtener resultados solo si tenemos year y round
                if (yearStr && roundStr) {
                    const year = parseInt(yearStr);
                    const round = parseInt(roundStr);
                    
                    if (!isNaN(year) && !isNaN(round)) {
                        infoRaceResults = await endpointsController.getRaceResults(year, round);
                    }
                }
                
                res.render('raceDetails', { 
                    infoRaceDetails,
                    infoRaceResults: infoRaceResults && infoRaceResults.success ? infoRaceResults : null
                });
            }else{
                res.render("errorPage", { 
                    errorCode: 404,
                    errorMessage: (infoRaceDetails as any).message || 'Error al obtener detalles de la carrera',
                    errorDetails: 'No se pudieron obtener los datos meteorológicos para esta carrera'
                });
            }

        } catch (error) {
            console.error('Error al procesar la solicitud:', error);
            return res.render("errorPage", { 
                errorCode: 500,
                errorMessage: 'Error del servidor',
                errorDetails: 'Ocurrió un error al procesar la solicitud de detalles de la carrera'
            });
        }

    };
    renderAllDriversByYear = async (req: Request, res: Response) => {

    
        const endpoint = `${req.method} ${req.url}`;
        const token = req.cookies.access_token
        const ip = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '';
    
    
        const yearString = req.query.year as string | undefined;
        const year = yearString && !isNaN(parseInt(yearString, 10)) ? parseInt(yearString, 10) : new Date().getFullYear();
    
      // Validate year
      if (isNaN(year) || year < 1900 || year > 2100) {
        return res.render("errorPage", {
            errorCode: 400,
            errorMessage: 'Parámetro inválido',
            errorDetails: `El año ${year} no es válido. Debe estar entre 1900 y 2100.`
        });
      }
         
     
          if (!token) {
                return res.render("errorPage", {
                    errorCode: 401,
                    errorMessage: 'Acceso no autorizado',
                    errorDetails: 'Debes iniciar sesión para acceder a esta página'
                });
            }
    
        
        try {
            
            const decoded = await verifyToken(token);
    
            if (typeof decoded !== 'object' || decoded === null) {
                console.error('Decodificación fallida, no es un objeto válido.');
                return res.render("errorPage", {
                    errorCode: 401,
                    errorMessage: 'Sesión inválida',
                    errorDetails: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.'
                });
            }
    
    
            const infoAllYearDriversByYear =  await endpointsController.getAllDriverByYear(year);
            if(infoAllYearDriversByYear.success === true){
                const actualYear = infoAllYearDriversByYear.actualYear || year;
                res.render('allDrivers', {year: actualYear, infoAllYearDriversByYear});
            }else{
                res.render("errorPage", {
                    errorCode: 404,
                    errorMessage: 'message' in infoAllYearDriversByYear ? infoAllYearDriversByYear.message : "No se encontraron datos",
                    errorDetails: `No se pudieron cargar los pilotos para el año ${year}`
                });
            }
    
        } catch (error) {
            console.error('Error al procesar la solicitud:', error);
            return res.render("errorPage", {
                errorCode: 500,
                errorMessage: 'Error interno del servidor',
                errorDetails: 'No se pudieron cargar los pilotos. Inténtalo de nuevo más tarde.'
            });
        }
    }
    renderDriverDetails = async (req: Request, res: Response) => {
        const endpoint = `${req.method} ${req.url}`;
        const token = req.cookies.access_token
        const ip = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '';
        
        const yearString = req.query.year as string | undefined;
        const driverId = req.query.driverId as string | undefined;
        const year = yearString && !isNaN(parseInt(yearString, 10)) ? parseInt(yearString, 10) : new Date().getFullYear();
    
        // Validar parámetros
        if (isNaN(year) || year < 1900 || year > 2100 || !driverId) {
            return res.render("errorPage", {
                errorCode: 400,
                errorMessage: 'Parámetros inválidos',
                errorDetails: 'El año o el ID del piloto proporcionados no son válidos.'
            });
        }

        // Validar token
        if (!token) {
            return res.render("errorPage", {
                errorCode: 401,
                errorMessage: 'Acceso no autorizado',
                errorDetails: 'Debes iniciar sesión para acceder a esta página'
            });
        }

        try {
            const decoded = await verifyToken(token);

            if (typeof decoded !== 'object' || decoded === null) {
                console.error('Decodificación fallida, no es un objeto válido.');
                return res.render("errorPage", {
                    errorCode: 401,
                    errorMessage: 'Sesión inválida',
                    errorDetails: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.'
                });
            }

            const infoDriverDetails = await endpointsController.getDriverDetails(year, driverId);

            if(infoDriverDetails.success === true){
                res.render('driverDetails', {year, infoDriverDetails});
            }else{
                res.render("errorPage", {
                    errorCode: 404,
                    errorMessage: (infoDriverDetails as any).message || 'Error al obtener detalles del piloto',
                    errorDetails: 'No se pudieron obtener los datos del piloto'
                });
            }

        } catch (error) {
            console.error('Error al procesar la solicitud:', error);
            return res.render("errorPage", {
                errorCode: 500,
                errorMessage: 'Error interno del servidor',
                errorDetails: 'No se pudieron cargar los detalles del piloto. Inténtalo de nuevo más tarde.'
            });
        }
    }
    renderGallery = async (req: Request, res: Response) => {

    
        const endpoint = `${req.method} ${req.url}`;
        const token = req.cookies.access_token
        const ip = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '';
    
    
          if (!token) {
                return res.render("errorPage", {
                    errorCode: 401,
                    errorMessage: 'Acceso no autorizado',
                    errorDetails: 'Debes iniciar sesión para acceder a esta página'
                });
            }
    
        
        try {

            // Solución sencilla: declara filters con tipo union para permitir null
            let filters: any | null = req.query;

        // Si no hay nada en la query (objeto vacío), setear a null
             if (Object.keys(filters as any).length === 0) {
                filters = null;
             }

            const decoded = await verifyToken(token);
    
            if (typeof decoded !== 'object' || decoded === null) {
                console.error('Decodificación fallida, no es un objeto válido.');
            }
            const inforGalleryPage = await endpointsController.getGalleryPageInfo(filters);

            // Pasar los filtros actuales a la vista para mantenerlos seleccionados
            const selectedYear = filters && filters.year ? filters.year : '2025';
            const selectedTeam = filters && filters.team ? filters.team : '';
            const selectedRace = filters && filters.race ? filters.race : '';

            res.render('galleryF1', { 
                inforGalleryPage,
                selectedYear,
                selectedTeam,
                selectedRace
            });

        } catch (error) {
            console.error('Error al procesar la solicitud:', error);
            return res.render("errorPage", {
                errorCode: 500,
                errorMessage: 'Error interno del servidor',
                errorDetails: 'No se pudo cargar la galería. Inténtalo de nuevo más tarde.'
            });
        }
    }
    renderCircuits = async (req: Request, res: Response) => {

    
        const endpoint = `${req.method} ${req.url}`;
        const token = req.cookies.access_token
        const ip = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '';
    
    
          if (!token) {
                return res.render("errorPage", {
                    errorCode: 401,
                    errorMessage: 'Acceso no autorizado',
                    errorDetails: 'Debes iniciar sesión para acceder a esta página'
                });
            }
    
        
        try {
            
            const decoded = await verifyToken(token);
    
            if (typeof decoded !== 'object' || decoded === null) {
                console.error('Decodificación fallida, no es un objeto válido.');
                return res.render("errorPage", {
                    errorCode: 401,
                    errorMessage: 'Sesión inválida',
                    errorDetails: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.'
                });
            }
            const circuitsInfo = await endpointsController.getCircuits();

            res.render('circuits', { circuitsInfo });
        } catch (error) {
            console.error('Error al procesar la solicitud:', error);
            return res.render("errorPage", {
                errorCode: 500,
                errorMessage: 'Error interno del servidor',
                errorDetails: 'No se pudieron cargar los circuitos. Inténtalo de nuevo más tarde.'
            });
        }
    };
    loadCircuitDetails = async (req: Request, res: Response) => {

        const endpoint = `${req.method} ${req.url}`;
        const token = req.cookies.access_token
        const ip = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '';

        if (!token) {
            return res.render("errorPage", {
                errorCode: 401,
                errorMessage: 'Acceso no autorizado',
                errorDetails: 'Debes iniciar sesión para acceder a esta página'
            });
        }

        try {

            const decoded = await verifyToken(token);

            if (typeof decoded !== 'object' || decoded === null) {
                console.error('Decodificación fallida, no es un objeto válido.');
                return res.render("errorPage", {
                    errorCode: 401,
                    errorMessage: 'Sesión inválida',
                    errorDetails: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.'
                });
            }
            
            const id = req.query.id as string;  // Trata como string directamente

            if (!id) {
                return res.render("errorPage", {
                    errorCode: 400,
                    errorMessage: 'Parámetro faltante',
                    errorDetails: 'El ID del circuito es obligatorio.'
                });
            }
            const circuit = await endpointsController.loadCircuitDetails(id);
            res.render('circuitDetails', { circuit });
        } catch (error) {
            console.error('Error al cargar información del circuito:', error);
            return res.render("errorPage", {
                errorCode: 500,
                errorMessage: 'Error interno del servidor',
                errorDetails: 'No se pudieron cargar los detalles del circuito. Inténtalo de nuevo más tarde.'
            });
        }
    };

    // API: Obtener equipos por año
    getTeamsByYearAPI = async (req: Request, res: Response) => {
        try {
            const year = parseInt(req.params.year);
            
            if (isNaN(year) || year < 1950 || year > new Date().getFullYear()) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Año inválido' 
                });
            }

            const result = await endpointsController.getTeamsByYear(year);
            return res.json(result.teams);
        } catch (error) {
            return res.status(500).json({ 
                success: false, 
                message: 'Error al obtener equipos' 
            });
        }
    };

    // API: Obtener circuitos por año
    getCircuitsByYearAPI = async (req: Request, res: Response) => {
        try {
            const year = parseInt(req.params.year);
            
            if (isNaN(year) || year < 1950 || year > new Date().getFullYear()) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Año inválido' 
                });
            }

            const result = await endpointsController.getCircuitsByYear(year);
            return res.json(result);
        } catch (error) {
            return res.status(500).json({ 
                success: false, 
                message: 'Error al obtener circuitos' 
            });
        }
    };

    };
