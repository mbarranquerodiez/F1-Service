import { Request, Response } from 'express';
import db from '../config/db';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { sendOk, sendBadParam, sendUnauthorized, sendServerError, sendConflict, sendNotFound } from '../utils/messages';
import { verifyToken } from '../utils/tokenDecode';


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
export const getWeather = async (req: Request, res: Response) => {
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
export const getAllYearRaces = async (req: Request, res: Response) => {
    const endpoint = `${req.method} ${req.url}`;
    const ip = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '';

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

    // Llamada a la API externa de OpenF1
    const apiUrl = `https://f1api.dev/api/${year}`;
    const fetch = require('node-fetch');
    const response = await fetch(apiUrl);
        if (!response.ok) {
            return sendServerError(res, undefined, ip, 'Error al consultar la API', endpoint);
        }
            const data = await response.json();

            if (!Array.isArray(data.races) || data.races.length === 0) {
                return sendNotFound(res, undefined, ip, 'No se encontraron carreras para ese año', endpoint);
            }

            return sendOk(res, undefined, ip, { races: data.races }, endpoint);

    } catch (error) {
        console.error('Error al procesar la solicitud:', error);
        return sendServerError(res, undefined, ip, 'Error en el servidor', endpoint);
    }
};

