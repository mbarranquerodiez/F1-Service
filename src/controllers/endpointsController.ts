import { Request, Response } from 'express';
import db from '../config/db';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { sendOk, sendBadParam, sendUnauthorized, sendServerError, sendConflict, sendNotFound } from '../utils/messages';
import { verifyToken } from '../utils/tokenDecode';



export class EndPoitnsController {

    getWeather = async (req: Request, res: Response) => {
        const endpoint = `${req.method} ${req.url}`;
        const ip = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '';
        const { city, country, timestamp } = req.params;
    
        if (!city || !country || !timestamp) {
            return sendBadParam(res, undefined, ip, 'Ciudad, país y fecha son obligatorios', endpoint);
        }
    
        try {
            // 1. Obtener coordenadas con Nominatim
            const nominatimUrl = `https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&format=json`;
            console.log('Petición a la URL Nominatim:', nominatimUrl);
            const fetch = require('node-fetch');
            const nominatimRes = await fetch(nominatimUrl);
            if (!nominatimRes.ok) {
                return sendServerError(res, undefined, ip, 'Error al consultar la API de Nominatim', endpoint);
            }
            const nominatimData = await nominatimRes.json();
            if (!Array.isArray(nominatimData) || nominatimData.length === 0) {
                return sendNotFound(res, undefined, ip, 'Ciudad no encontrada', endpoint);
            }
            const { lat, lon, display_name } = nominatimData[0];
    
            // 2. Obtener tiempo con Open-Meteo (histórico o pronóstico)
            const date = timestamp.substring(0,10);
            const hour = timestamp.substring(11,16); // HH:mm
            const today = new Date().toISOString().substring(0,10);
            let meteoUrl;
            if (date < today) {
                // Datos históricos desde el año 2000 usando archive-api
                meteoUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,rain,precipitation&start_date=${date}&end_date=${date}&timezone=auto`;
            } else {
                // Datos actuales/futuros
                meteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,precipitation&start_date=${date}&end_date=${date}&timezone=auto`;
            }
            const meteoRes = await fetch(meteoUrl);
            if (!meteoRes.ok) {
                return sendServerError(res, undefined, ip, 'Error al consultar la API de Open-Meteo', endpoint);
            }
            const meteoData = await meteoRes.json();
            if (!meteoData.hourly || !meteoData.hourly.time) {
                return sendNotFound(res, undefined, ip, 'No se encontraron datos meteorológicos', endpoint);
            }
            // Buscar el índice de la hora exacta
            const index = meteoData.hourly.time.findIndex((t: string) => t.substring(11,16) === hour);
            if (index === -1) {
                return sendNotFound(res, undefined, ip, 'No se encontraron datos para ese momento', endpoint);
            }
            // Devolver solo temperatura y lluvia
            const result = {
                temperature: meteoData.hourly.temperature_2m[index],
                rain: meteoData.hourly.rain ? meteoData.hourly.rain[index] : undefined
            };
            return sendOk(res, undefined, ip, result, endpoint);
        } catch (error) {
            console.error('Error al procesar la solicitud:', error);
            return sendServerError(res, undefined, ip, 'Error en el servidor', endpoint);
        }
    };

    getAllYearRaces = async (year : number) => {
    
        try {
          // Validar el parámetro year
          if (!year || isNaN(year) || year < 1950 || year > new Date().getFullYear()) {
            throw new Error('Invalid year provided');
          }
          // Llamada a la API externa de OpenF1
          const apiUrl = `https://f1api.dev/api/${year}`;
          const response = await fetch(apiUrl);
      
          if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
          }
      
          const data = await response.json();

      
          // Verificar si races existe y es un array
          if (!Array.isArray(data.races) || data.races.length === 0) {
            return [];
          }
      
          return data.races;
      
        } catch (error) {
          throw error; // Re-lanzar el error para que el llamador lo maneje
        }
    };

    getRacesInfo = async () => {
        try {
            // Solicitud a la API de última carrera
            const lastRaceResponse = await fetch('https://f1api.dev/api/current/last');
            const lastRaceData = await lastRaceResponse.json();
    
    
            // Solicitud a la API de próxima carrera
            const nextRaceResponse = await fetch('https://f1api.dev/api/current/next');
            const nextRaceData = await nextRaceResponse.json();
    
            // Manejar respuestas
            const racesInfo = {
                lastRace: lastRaceResponse.ok ? lastRaceData : { error: lastRaceData.message || 'No se encontraron datos de la última carrera' },
                nextRace: nextRaceResponse.ok ? nextRaceData : { error: nextRaceData.message || 'No se encontraron datos de la próxima carrera' }
            };
    
            return racesInfo;
        } catch (error) {
            console.error('Error al obtener información de carreras:', error);
            return {
                lastRace: { error: 'Error al conectar con la API de última carrera' },
                nextRace: { error: 'Error al conectar con la API de próxima carrera' }
            };
        }
    };


}


/**
 * Obtener el tiempo histórico en una ciudad y país en una fecha usando Nominatim y Open-Meteo.
 * @route GET /api/endpoints/weather/:city/:country/:timestamp
 * @group Weather
 * @param {string} city.path.required - Nombre de la ciudad
 * @param {string} country.path.required - Nombre del país
 * @param {string} timestamp.path.required - Fecha y hora en formato ISO (YYYY-MM-DDTHH:mm)
 * @returns {object} 200 - Información meteorológica
 * @returns {object} 400 - Solicitud incorrecta
 * @returns {object} 404 - Ciudad o datos meteorológicos no encontrados
 * @returns {object} 500 - Error interno del servidor
 */



/**
 * Obtener todas las carreras por año.
 * @route GET /api/races/{year}
 * @group Race
 * @param {number} year.path.required - Año de las carreras a consultar
 * @returns {object} 200 - Lista de carreras para el año especificado
 * @returns {object} 401 - No autorizado, token no proporcionado o inválido
 * @returns {object} 404 - No se encontraron carreras
 * @returns {object} 500 - Error interno del servidor
 * @security Token Bearer
 */



/**
 * Obtener todas las carreras por año.
 * @route GET /api/current/{year}
 * @group Race
 * @param {number} year.path.required - Año de las carreras a consultar
 * @returns {object} 200 - Lista de carreras para el año especificado
 * @returns {object} 401 - No autorizado, token no proporcionado o inválido
 * @returns {object} 404 - No se encontraron carreras
 * @returns {object} 500 - Error interno del servidor
 * @security Token Bearer
 */



/**
 * Obtener los pilotos por año.
 * @route GET /api/endpoints/drivers/{year}
 * @group Driver
 * @param {number} year.path.required - Año de los pilotos a consultar
 * @returns {object} 200 - Lista de pilotos para el año especificado
 * @returns {object} 401 - No autorizado, token no proporcionado o inválido
 * @returns {object} 404 - No se encontraron pilotos
 * @returns {object} 500 - Error interno del servidor
 * @security Token Bearer
 */
export const getYearDrivers = async (req: Request, res: Response) => {
    const endpoint = `${req.method} ${req.url}`;
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';

    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
        return sendUnauthorized(res, undefined, ip, 'Token no proporcionado', endpoint);
    }

    try {
        const decoded = await verifyToken(token);
        if (typeof decoded !== 'object' || decoded === null) {
            console.error('Decodificación fallida, no es un objeto válido.');
            return sendUnauthorized(res, undefined, ip, 'Token inválido', endpoint);
        }

        const { year } = req.params;
        if (!year) {
            return sendBadParam(res, undefined, ip, 'Año no proporcionado', endpoint);
        }

        const apiUrl = `https://f1api.dev/api/${year}/drivers`;
        const fetch = require('node-fetch');
        const response = await fetch(apiUrl);
        if (!response.ok) {
            return sendServerError(res, undefined, ip, 'Error al consultar la API', endpoint);
        }
        const data = await response.json();

        let drivers: any[] | undefined = undefined;
        if (Array.isArray(data?.drivers)) {
            drivers = data.drivers;
        } else if (Array.isArray(data)) {
            drivers = data;
        }

        if (!drivers || drivers.length === 0) {
            return sendNotFound(res, undefined, ip, 'No se encontraron pilotos para ese año', endpoint);
        }

        return sendOk(res, undefined, ip, { drivers }, endpoint);
    } catch (error) {
        console.error('Error al procesar la solicitud:', error);
        return sendServerError(res, undefined, ip, 'Error en el servidor', endpoint);
    }
};

/**
 * Obtener los datos de un piloto en un año concreto.
 * @route GET /api/drivers/{year}/{id_driver}
 * @group Driver
 * @param {number} year.path.required - Año a consultar
 * @param {string} id_driver.path.required - Identificador del piloto
 * @returns {object} 200 - Datos del piloto para ese año
 * @returns {object} 401 - No autorizado, token no proporcionado o inválido
 * @returns {object} 404 - Piloto no encontrado para ese año
 * @returns {object} 500 - Error interno del servidor
 * @security Token Bearer
 */
export const getYearDriver = async (req: Request, res: Response) => {
    const endpoint = `${req.method} ${req.url}`;
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';

    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
        return sendUnauthorized(res, undefined, ip, 'Token no proporcionado', endpoint);
    }

    try {
        const decoded = await verifyToken(token);
        if (typeof decoded !== 'object' || decoded === null) {
            console.error('Decodificación fallida, no es un objeto válido.');
            return sendUnauthorized(res, undefined, ip, 'Token inválido', endpoint);
        }

        const { year, id_driver } = req.params;
        if (!year || !id_driver) {
            return sendBadParam(res, undefined, ip, 'Año e id_driver son obligatorios', endpoint);
        }

        const apiUrl = `https://f1api.dev/api/${encodeURIComponent(year)}/drivers/${encodeURIComponent(id_driver)}`;
        const fetch = require('node-fetch');
        const response = await fetch(apiUrl);
        if (!response.ok) {
            // Si la API devuelve 404, reflejamos 404; otros errores -> 500
            if (response.status === 404) {
                return sendNotFound(res, undefined, ip, 'Piloto no encontrado para ese año', endpoint);
            }
            return sendServerError(res, undefined, ip, 'Error al consultar la API', endpoint);
        }
        const data = await response.json();

        // La API puede devolver un objeto o un array con un solo elemento. Normalizamos.
        let raw: any = undefined;
        if (Array.isArray(data) && data.length > 0) {
            raw = data[0];
        } else if (data && typeof data === 'object') {
            raw = data;
        }

        if (!raw) {
            return sendNotFound(res, undefined, ip, 'Piloto no encontrado para ese año', endpoint);
        }

        // Extraer y filtrar solo los campos solicitados
        const d = raw.driver || {};
        const t = raw.team || {};

        const filtered: any = {
            driverId: d.driverId,
            name: d.name,
            surname: d.surname,
            nationality: d.nationality,
            birthday: d.birthday,
            number: d.number,
            shortName: d.shortName,
            team: {
                teamId: t.teamId,
                teamName: t.teamName,
                teamNationality: t.teamNationality,
                firstAppeareance: t.firstAppeareance,
                constructorsChampionships: t.constructorsChampionships,
                driversChampionships: t.driversChampionships
            }
        };

        // Construir título de Wikipedia "Nombre_Apellido" y consultar summary en español
        const nameParts = [d.name, d.surname].filter(Boolean) as string[];
        let wikiTitle: string | undefined = undefined;
        if (nameParts.length === 2) {
            wikiTitle = `${nameParts[0]}_${nameParts[1]}`;
            try {
                const wikiUrl = `https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiTitle)}`;
                const fetch = require('node-fetch');
                const wikiRes = await fetch(wikiUrl, { headers: { 'accept': 'application/json' } });
                if (wikiRes.ok) {
                    const wikiData = await wikiRes.json();
                    if (wikiData && typeof wikiData.extract === 'string') {
                        filtered.description = wikiData.extract;
                    }
                }
            } catch (e) {
                console.warn('No se pudo obtener el resumen de Wikipedia:', e);
            }
        }

        // Llamada a Google News RSS para obtener noticias del último año y añadirlas al JSON
        try {
            const fetch = require('node-fetch');
            const { XMLParser } = require('fast-xml-parser');
            const personForQuery = wikiTitle || nameParts.join('_');
            const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(personForQuery)}&hl=es&gl=ES&ceid=ES:es`;
            const rssRes = await fetch(rssUrl, { headers: { 'accept': 'application/rss+xml, application/xml;q=0.9, */*;q=0.8' } });
            if (rssRes.ok) {
                const rssText = await rssRes.text();
                const parser = new XMLParser({ ignoreAttributes: false });
                const rssJson = parser.parse(rssText);
                const items = rssJson?.rss?.channel?.item;
                const list: any[] = Array.isArray(items) ? items : items ? [items] : [];

                // Tomar únicamente las últimas 10 noticias por fecha de publicación (más recientes primero)
                const news = list
                    .map((it: any) => {
                        const title = it?.title;
                        const link = typeof it?.link === 'string' ? it.link : undefined;
                        const pubDateStr = it?.pubDate;
                        const pub = pubDateStr ? new Date(pubDateStr) : undefined;
                        return { title, link, date: pub ? pub.toISOString() : undefined, _pub: pub };
                    })
                    .filter((n: any) => n.title && n.link && n._pub)
                    .sort((a: any, b: any) => (b._pub as Date).getTime() - (a._pub as Date).getTime())
                    .slice(0, 10)
                    .map((n: any) => ({ title: n.title, link: n.link, date: n.date }));

                if (news.length > 0) {
                    filtered.news = news;
                } else {
                    filtered.news = [];
                }
            } else {
                filtered.news = [];
            }
        } catch (e) {
            console.warn('No se pudieron obtener noticias de Google News:', e);
            (filtered as any).news = [];
        }

        return sendOk(res, undefined, ip, { driver: filtered }, endpoint);
    } catch (error) {
        console.error('Error al procesar la solicitud:', error);
        return sendServerError(res, undefined, ip, 'Error en el servidor', endpoint);
    }
};


