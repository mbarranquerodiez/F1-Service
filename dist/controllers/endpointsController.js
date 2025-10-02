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
exports.getAllYearRaces = exports.getCityCoordinates = exports.getWeatherAtTime = void 0;
/**
 * Obtener el tiempo histórico en unas coordenadas y fecha usando Open-Meteo.
 * @route GET /api/weather/:lat/:lon/:timestamp
 * @group Weather
 * @param {string} lat.path.required - Latitud
 * @param {string} lon.path.required - Longitud
 * @param {string} timestamp.path.required - Fecha y hora en formato ISO (YYYY-MM-DDTHH:mm)
 * @returns {object} 200 - Información meteorológica
 * @returns {object} 400 - Solicitud incorrecta
 * @returns {object} 404 - Datos no encontrados
 * @returns {object} 500 - Error interno del servidor
 */
const getWeatherAtTime = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const endpoint = `${req.method} ${req.url}`;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const { lat, lon, timestamp } = req.params;
    if (!lat || !lon || !timestamp) {
        return (0, messages_1.sendBadParam)(res, undefined, ip, 'Latitud, longitud y timestamp son obligatorios', endpoint);
    }
    try {
        // Open-Meteo API para datos históricos
        const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,precipitation,weathercode&start_date=${timestamp.substring(0, 10)}&end_date=${timestamp.substring(0, 10)}&timezone=auto`;
        console.log('Petición a la URL:', apiUrl);
        const fetch = require('node-fetch');
        const response = yield fetch(apiUrl);
        if (!response.ok) {
            return (0, messages_1.sendServerError)(res, undefined, ip, 'Error al consultar la API de Open-Meteo', endpoint);
        }
        const data = yield response.json();
        if (!data.hourly || !data.hourly.time) {
            return (0, messages_1.sendNotFound)(res, undefined, ip, 'No se encontraron datos meteorológicos', endpoint);
        }
        // Buscar el índice de la hora exacta
        const index = data.hourly.time.findIndex((t) => t.startsWith(timestamp));
        if (index === -1) {
            return (0, messages_1.sendNotFound)(res, undefined, ip, 'No se encontraron datos para ese momento', endpoint);
        }
        // Devolver solo temperatura y precipitación
        const result = {
            temperature_2m: data.hourly.temperature_2m[index],
            precipitation: data.hourly.precipitation[index]
        };
        return (0, messages_1.sendOk)(res, undefined, ip, result, endpoint);
    }
    catch (error) {
        console.error('Error al procesar la solicitud:', error);
        return (0, messages_1.sendServerError)(res, undefined, ip, 'Error en el servidor', endpoint);
    }
});
exports.getWeatherAtTime = getWeatherAtTime;
/**
 * Obtener coordenadas de una ciudad y país usando Nominatim.
 * @route GET /api/location/:city/:country
 * @group Location
 * @param {string} city.path.required - Nombre de la ciudad
 * @param {string} country.path.required - Nombre del país
 * @returns {object} 200 - Coordenadas de la ciudad
 * @returns {object} 400 - Solicitud incorrecta
 * @returns {object} 404 - Ciudad no encontrada
 * @returns {object} 500 - Error interno del servidor
 */
const getCityCoordinates = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const endpoint = `${req.method} ${req.url}`;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const { city, country } = req.params;
    if (!city || !country) {
        return (0, messages_1.sendBadParam)(res, undefined, ip, 'Ciudad y país son obligatorios', endpoint);
    }
    try {
        const apiUrl = `https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&format=json`;
        console.log('Petición a la URL:', apiUrl);
        const fetch = require('node-fetch');
        const response = yield fetch(apiUrl);
        if (!response.ok) {
            return (0, messages_1.sendServerError)(res, undefined, ip, 'Error al consultar la API de Nominatim', endpoint);
        }
        const data = yield response.json();
        if (!Array.isArray(data) || data.length === 0) {
            return (0, messages_1.sendNotFound)(res, undefined, ip, 'Ciudad no encontrada', endpoint);
        }
        // Devolver solo la primera coincidencia
        const { lat, lon, display_name } = data[0];
        return (0, messages_1.sendOk)(res, undefined, ip, { lat, lon, display_name }, endpoint);
    }
    catch (error) {
        console.error('Error al procesar la solicitud:', error);
        return (0, messages_1.sendServerError)(res, undefined, ip, 'Error en el servidor', endpoint);
    }
});
exports.getCityCoordinates = getCityCoordinates;
const messages_1 = require("../utils/messages");
const tokenDecode_1 = require("../utils/tokenDecode");
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
