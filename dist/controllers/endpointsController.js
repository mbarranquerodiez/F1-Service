"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRacesInfo = exports.getAllYearRaces = exports.getWeather = void 0;
const messages_1 = require("../utils/messages");
const tokenDecode_1 = require("../utils/tokenDecode");
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
const getWeather = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const endpoint = `${req.method} ${req.url}`;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const { city, country, timestamp } = req.params;
    if (!city || !country || !timestamp) {
        return (0, messages_1.sendBadParam)(res, undefined, ip, 'Ciudad, país y fecha son obligatorios', endpoint);
    }
    try {
        // 1. Obtener coordenadas con Nominatim
        const nominatimUrl = `https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&format=json`;
        console.log('Petición a la URL Nominatim:', nominatimUrl);
        const fetch = require('node-fetch');
        const nominatimRes = yield fetch(nominatimUrl);
        if (!nominatimRes.ok) {
            return (0, messages_1.sendServerError)(res, undefined, ip, 'Error al consultar la API de Nominatim', endpoint);
        }
        const nominatimData = yield nominatimRes.json();
        if (!Array.isArray(nominatimData) || nominatimData.length === 0) {
            return (0, messages_1.sendNotFound)(res, undefined, ip, 'Ciudad no encontrada', endpoint);
        }
        const { lat, lon, display_name } = nominatimData[0];
        // 2. Obtener tiempo con Open-Meteo (histórico o pronóstico)
        const date = timestamp.substring(0, 10);
        const hour = timestamp.substring(11, 16); // HH:mm
        const today = new Date().toISOString().substring(0, 10);
        let meteoUrl;
        if (date < today) {
            // Datos históricos desde el año 2000 usando archive-api
            meteoUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,rain,precipitation&start_date=${date}&end_date=${date}&timezone=auto`;
        }
        else {
            // Datos actuales/futuros
            meteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,precipitation&start_date=${date}&end_date=${date}&timezone=auto`;
        }
        const meteoRes = yield fetch(meteoUrl);
        if (!meteoRes.ok) {
            return (0, messages_1.sendServerError)(res, undefined, ip, 'Error al consultar la API de Open-Meteo', endpoint);
        }
        const meteoData = yield meteoRes.json();
        if (!meteoData.hourly || !meteoData.hourly.time) {
            return (0, messages_1.sendNotFound)(res, undefined, ip, 'No se encontraron datos meteorológicos', endpoint);
        }
        // Buscar el índice de la hora exacta
        const index = meteoData.hourly.time.findIndex((t) => t.substring(11, 16) === hour);
        if (index === -1) {
            return (0, messages_1.sendNotFound)(res, undefined, ip, 'No se encontraron datos para ese momento', endpoint);
        }
        // Devolver solo temperatura y lluvia
        const result = {
            temperature: meteoData.hourly.temperature_2m[index],
            rain: meteoData.hourly.rain ? meteoData.hourly.rain[index] : undefined
        };
        return (0, messages_1.sendOk)(res, undefined, ip, result, endpoint);
    }
    catch (error) {
        console.error('Error al procesar la solicitud:', error);
        return (0, messages_1.sendServerError)(res, undefined, ip, 'Error en el servidor', endpoint);
    }
});
exports.getWeather = getWeather;
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
const getAllYearRaces = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const endpoint = `${req.method} ${req.url}`;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const token = (_a = req.headers['authorization']) === null || _a === void 0 ? void 0 : _a.split(' ')[1];
    if (!token) {
        return (0, messages_1.sendUnauthorized)(res, undefined, ip, 'Token no proporcionado', endpoint);
    }
    try {
        const decoded = yield (0, tokenDecode_1.verifyToken)(token);
        if (typeof decoded !== 'object' || decoded === null) {
            console.error('Decodificación fallida, no es un objeto válido.');
            return (0, messages_1.sendUnauthorized)(res, undefined, ip, 'Token inválido', endpoint);
        }
        const { year } = req.params;
        if (!year) {
            return (0, messages_1.sendBadParam)(res, undefined, ip, 'Año no proporcionado', endpoint);
        }
        // Llamada a la API externa de OpenF1
        const apiUrl = `https://f1api.dev/api/${year}`;
        const fetch = require('node-fetch');
        const response = yield fetch(apiUrl);
        if (!response.ok) {
            return (0, messages_1.sendServerError)(res, undefined, ip, 'Error al consultar la API', endpoint);
        }
        const data = yield response.json();
        if (!Array.isArray(data.races) || data.races.length === 0) {
            return (0, messages_1.sendNotFound)(res, undefined, ip, 'No se encontraron carreras para ese año', endpoint);
        }
        return (0, messages_1.sendOk)(res, undefined, ip, { races: data.races }, endpoint);
    }
    catch (error) {
        console.error('Error al procesar la solicitud:', error);
        return (0, messages_1.sendServerError)(res, undefined, ip, 'Error en el servidor', endpoint);
    }
});
exports.getAllYearRaces = getAllYearRaces;
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
const getRacesInfo = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Solicitud a la API de última carrera
        const lastRaceResponse = yield fetch('https://f1api.dev/api/current/last');
        const lastRaceData = yield lastRaceResponse.json();
        // Solicitud a la API de próxima carrera
        const nextRaceResponse = yield fetch('https://f1api.dev/api/current/next');
        const nextRaceData = yield nextRaceResponse.json();
        // Manejar respuestas
        const racesInfo = {
            lastRace: lastRaceResponse.ok ? lastRaceData : { error: lastRaceData.message || 'No se encontraron datos de la última carrera' },
            nextRace: nextRaceResponse.ok ? nextRaceData : { error: nextRaceData.message || 'No se encontraron datos de la próxima carrera' }
        };
        return racesInfo;
    }
    catch (error) {
        console.error('Error al obtener información de carreras:', error);
        return {
            lastRace: { error: 'Error al conectar con la API de última carrera' },
            nextRace: { error: 'Error al conectar con la API de próxima carrera' }
        };
    }
});
exports.getRacesInfo = getRacesInfo;
