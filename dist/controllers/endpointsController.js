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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCircuits = exports.EndPoitnsController = void 0;
const db_1 = __importDefault(require("../config/db"));
const messages_1 = require("../utils/messages");
class EndPoitnsController {
    constructor() {
        this.getRaceDetails = (city, country, timestamp) => __awaiter(this, void 0, void 0, function* () {
            console.log("city", city);
            console.log("country", country);
            console.log("timestamp", timestamp);
            if (!city || !country || !timestamp) {
                const response = {
                    success: false,
                    message: "Faltan parámetros obligatorios"
                };
                return response;
            }
            try {
                // 1. Obtener coordenadas con Nominatim
                const nominatimUrl = `https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&format=json`;
                console.log('Petición a la URL Nominatim:', nominatimUrl);
                const fetch = require('node-fetch');
                const nominatimRes = yield fetch(nominatimUrl);
                if (!nominatimRes.ok) {
                    const response = {
                        success: false,
                        message: "Error al consultar la API de Nominatim"
                    };
                    return response;
                }
                const nominatimData = yield nominatimRes.json();
                if (!Array.isArray(nominatimData) || nominatimData.length === 0) {
                    const response = {
                        success: false,
                        message: "No se encontraron coordenadas para la ciudad y país proporcionados"
                    };
                    return response;
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
                    const response = {
                        success: false,
                        message: "Error al consultar la API de Open-Meteo"
                    };
                    return response;
                }
                const meteoData = yield meteoRes.json();
                if (!meteoData.hourly || !meteoData.hourly.time) {
                    const response = {
                        success: false,
                        message: "No se encontraron datos meteorológicos"
                    };
                    return response;
                }
                // Buscar el índice de la hora exacta
                const index = meteoData.hourly.time.findIndex((t) => t.substring(11, 16) === hour);
                if (index === -1) {
                    const response = {
                        success: false,
                        message: "No se encontraron datos para ese momento"
                    };
                    return response;
                }
                // Devolver solo temperatura y lluvia
                const result = {
                    temperature: meteoData.hourly.temperature_2m[index],
                    rain: meteoData.hourly.rain ? meteoData.hourly.rain[index] : undefined
                };
                const response = {
                    success: true,
                    raceDetails: result
                };
                return response;
            }
            catch (error) {
                console.error('Error al procesar la solicitud:', error);
                const response = {
                    success: false,
                    message: 'Error al procesar la solicitud'
                };
                return response;
            }
        });
        this.getRacesByYear = (year) => __awaiter(this, void 0, void 0, function* () {
            try {
                // Validar el parámetro year
                if (!year || isNaN(year) || year < 1950 || year > new Date().getFullYear()) {
                    throw new Error('Invalid year provided');
                }
                // Llamada a la API externa de OpenF1
                const apiUrl = `https://f1api.dev/api/${year}`;
                const response = yield fetch(apiUrl);
                if (!response.ok) {
                    throw new Error(`API request failed with status ${response.status}`);
                }
                const data = yield response.json();
                // Verificar si races existe y es un array
                if (!Array.isArray(data.races) || data.races.length === 0) {
                    return [];
                }
                return data.races;
            }
            catch (error) {
                throw error; // Re-lanzar el error para que el llamador lo maneje
            }
        });
        this.getRacesInfo = () => __awaiter(this, void 0, void 0, function* () {
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
        this.getAllDriverByYear = (year) => __awaiter(this, void 0, void 0, function* () {
            try {
                if (!year) {
                    const response = {
                        success: false,
                        message: "No se proporcionó el año"
                    };
                    return response;
                }
                const apiUrl = `https://f1api.dev/api/${year}/drivers`;
                const fetch = require('node-fetch');
                const response = yield fetch(apiUrl);
                if (!response.ok) {
                    const response = {
                        success: false,
                        message: "No se encontraron datos de pilotos"
                    };
                    return response;
                }
                const data = yield response.json();
                let drivers = undefined;
                if (Array.isArray(data === null || data === void 0 ? void 0 : data.drivers)) {
                    drivers = data.drivers;
                }
                else if (Array.isArray(data)) {
                    drivers = data;
                }
                if (!drivers || drivers.length === 0) {
                    const response = {
                        success: false,
                        message: "No se encontraron pilotos para ese año"
                    };
                    return response;
                }
                const responseData = {
                    success: true,
                    drivers: drivers
                };
                return responseData;
            }
            catch (error) {
                const response = {
                    success: false,
                    message: "Error al realizar petición a la API externa"
                };
                return response;
            }
            ;
        });
        this.getDriverDetails = (year, driverId) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                if (!year || !driverId) {
                    console.error('Faltan parámetros obligatorios');
                    const response = {
                        success: false,
                        message: 'Faltan parámetros obligatorios'
                    };
                    return response;
                }
                const apiUrl = `https://f1api.dev/api/${encodeURIComponent(year)}/drivers/${encodeURIComponent(driverId)}`;
                const fetch = require('node-fetch');
                const responseApi = yield fetch(apiUrl);
                if (!responseApi.ok) {
                    // Si la API devuelve 404, reflejamos 404; otros errores -> 500
                    if (responseApi.status === 404) {
                        const response = {
                            success: false,
                            message: 'Piloto no encontrado para ese año'
                        };
                        return response;
                    }
                    const response = {
                        success: false,
                        message: 'Error al Consultar la API'
                    };
                    return response;
                }
                const data = yield responseApi.json();
                // La API puede devolver un objeto o un array con un solo elemento. Normalizamos.
                let raw = undefined;
                if (Array.isArray(data) && data.length > 0) {
                    raw = data[0];
                }
                else if (data && typeof data === 'object') {
                    raw = data;
                }
                if (!raw) {
                    const response = {
                        success: false,
                        message: 'Piloto no encontrado para ese año'
                    };
                    return response;
                }
                // Extraer y filtrar solo los campos solicitados
                const d = raw.driver || {};
                const t = raw.team || {};
                const filtered = {
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
                const nameParts = [d.name, d.surname].filter(Boolean);
                let wikiTitle = undefined;
                if (nameParts.length === 2) {
                    wikiTitle = `${nameParts[0]}_${nameParts[1]}`;
                    try {
                        const wikiUrl = `https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiTitle)}`;
                        const fetch = require('node-fetch');
                        const wikiRes = yield fetch(wikiUrl, { headers: { 'accept': 'application/json' } });
                        if (wikiRes.ok) {
                            const wikiData = yield wikiRes.json();
                            if (wikiData && typeof wikiData.extract === 'string') {
                                filtered.description = wikiData.extract;
                            }
                        }
                    }
                    catch (e) {
                        console.warn('No se pudo obtener el resumen de Wikipedia:', e);
                    }
                }
                // Llamada a Google News RSS para obtener noticias del último año y añadirlas al JSON
                try {
                    const fetch = require('node-fetch');
                    const { XMLParser } = require('fast-xml-parser');
                    const personForQuery = wikiTitle || nameParts.join('_');
                    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(personForQuery)}&hl=es&gl=ES&ceid=ES:es`;
                    const rssRes = yield fetch(rssUrl, { headers: { 'accept': 'application/rss+xml, application/xml;q=0.9, */*;q=0.8' } });
                    if (rssRes.ok) {
                        const rssText = yield rssRes.text();
                        const parser = new XMLParser({ ignoreAttributes: false });
                        const rssJson = parser.parse(rssText);
                        const items = (_b = (_a = rssJson === null || rssJson === void 0 ? void 0 : rssJson.rss) === null || _a === void 0 ? void 0 : _a.channel) === null || _b === void 0 ? void 0 : _b.item;
                        const list = Array.isArray(items) ? items : items ? [items] : [];
                        // Tomar únicamente las últimas 10 noticias por fecha de publicación (más recientes primero)
                        const news = list
                            .map((it) => {
                            const title = it === null || it === void 0 ? void 0 : it.title;
                            const link = typeof (it === null || it === void 0 ? void 0 : it.link) === 'string' ? it.link : undefined;
                            const pubDateStr = it === null || it === void 0 ? void 0 : it.pubDate;
                            const pub = pubDateStr ? new Date(pubDateStr) : undefined;
                            return { title, link, date: pub ? pub.toISOString() : undefined, _pub: pub };
                        })
                            .filter((n) => n.title && n.link && n._pub)
                            .sort((a, b) => b._pub.getTime() - a._pub.getTime())
                            .slice(0, 10)
                            .map((n) => ({ title: n.title, link: n.link, date: n.date }));
                        if (news.length > 0) {
                            filtered.news = news;
                        }
                        else {
                            filtered.news = [];
                        }
                    }
                    else {
                        filtered.news = [];
                    }
                }
                catch (e) {
                    console.warn('No se pudieron obtener noticias de Google News:', e);
                    filtered.news = [];
                }
                const response = {
                    success: true,
                    driver: filtered
                };
                console.log('Response:', response.driver.news);
                return response;
            }
            catch (error) {
                console.error('Error al procesar la solicitud:', error);
                const response = {
                    success: false,
                    message: 'Error al procesar la solicitud'
                };
                return response;
            }
        });
        this.getGalleryPageInfo = (filters) => __awaiter(this, void 0, void 0, function* () {
            console.log("1");
            try {
                // Asumimos que la clave de API de Unsplash está en una variable de entorno
                const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
                if (!UNSPLASH_ACCESS_KEY) {
                    throw new Error('Clave de API de Unsplash no configurada');
                }
                console.log("2");
                // Parámetros base para la API
                let query = '';
                if (filters === null) {
                    query = 'Formula1'; // Caso especial: búsqueda solo con "Formula1"
                }
                else if (filters && filters.query) {
                    query = filters.query;
                }
                // Puedes agregar más filtros si es necesario
                console.log("3");
                const apiUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=20`;
                console.log("4");
                const response = yield fetch(apiUrl, {
                    method: 'GET',
                    headers: {
                        Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`
                    }
                });
                console.log("5");
                if (!response.ok) {
                    return {
                        success: false,
                        message: 'No se encontraron datos de la galería'
                    };
                }
                console.log("6");
                const data = yield response.json();
                console.log("7");
                console.log(data);
                // Mapear los datos de la respuesta a una estructura simple con información asociada
                const gallery = data.results.map((photo) => ({
                    id: photo.id,
                    url: photo.urls.regular, // URL de imagen mediana
                    urlFull: photo.urls.full, // URL de imagen completa
                    alt: photo.alt_description || 'Imagen sin descripción',
                    photographer: photo.user.name,
                    photographerUrl: photo.user.links.html,
                    likes: photo.likes,
                    width: photo.width,
                    height: photo.height,
                    // Puedes agregar más campos como color: photo.color, etc.
                }));
                console.log(gallery);
                console.log("8");
                return { success: true, gallery: gallery };
            }
            catch (error) {
                console.error('Error al obtener información de la galería:', error);
                return { success: false, message: 'Error al obtener información de la galería' };
            }
        });
        this.getCircuits = () => __awaiter(this, void 0, void 0, function* () {
            try {
                db_1.default.query(`SELECT 
                    id,,
                    name,  
                FROM circuits
                ORDER BY name DESC`, [], (err, rows) => {
                    if (err) {
                        console.error('Error al ejecutar la consulta:', err);
                        return null;
                    }
                    const circuits = Array.isArray(rows) ? rows : [];
                    return circuits;
                });
            }
            catch (error) {
                console.error('Error al listar circuitos:', error);
                return null;
            }
        });
        this.loadCircuitDetails = (id) => __awaiter(this, void 0, void 0, function* () {
            if (!id) {
                return null;
            }
            try {
                db_1.default.query(`SELECT 
                id, 
                location, 
                name, 
                opened, 
                first_gp, 
                length, 
                altitude, 
                bbox, 
                geom,
                /* Si 'geom' es un tipo espacial, MySQL devolverá el GeoJSON aquí */
                ST_AsGeoJSON(geom) AS geom_geojson
             FROM circuits
             WHERE id = ?
             LIMIT 1`, [id], (err, rows) => {
                    if (err) {
                        console.error('Error al ejecutar la consulta:', err);
                        return null;
                    }
                    if (!rows || rows.length === 0) {
                        return null;
                    }
                    const row = rows[0];
                    // Helpers de parseo tolerante
                    const parseJsonMaybe = (val) => {
                        try {
                            if (val == null)
                                return undefined;
                            if (Buffer.isBuffer(val)) {
                                const s = val.toString('utf8');
                                return JSON.parse(s);
                            }
                            if (typeof val === 'string') {
                                return JSON.parse(val);
                            }
                            if (typeof val === 'object')
                                return val;
                            return undefined;
                        }
                        catch (_a) {
                            return undefined;
                        }
                    };
                    // Parsear bbox y geom (admite JSON en string, Buffer o objeto)
                    let bbox = parseJsonMaybe(row.bbox);
                    let geometry = undefined;
                    // Prioridad: columna calculada ST_AsGeoJSON
                    if (row.geom_geojson) {
                        geometry = parseJsonMaybe(row.geom_geojson);
                    }
                    // Si no hay, intentar con la columna original
                    if (!geometry) {
                        geometry = parseJsonMaybe(row.geom);
                    }
                    // Si viene como Feature con geometry dentro
                    if (geometry && geometry.type === 'Feature' && geometry.geometry) {
                        geometry = geometry.geometry;
                    }
                    // Asegurar que la geometría tiene formato GeoJSON esperado
                    if (!geometry || !geometry.type || !geometry.coordinates) {
                        return null;
                    }
                    const feature = {
                        type: 'Feature',
                        properties: {
                            id: row.id,
                            Location: row.location,
                            Name: row.name,
                            opened: row.opened,
                            firstgp: row.first_gp,
                            length: row.length,
                            altitude: row.altitude
                        },
                        bbox: Array.isArray(bbox) ? bbox : undefined,
                        geometry
                    };
                    return feature;
                });
            }
            catch (error) {
                console.error('Error al consultar el circuito:', error);
                return null;
            }
        });
    }
}
exports.EndPoitnsController = EndPoitnsController;
/**
 * Listar todos los circuitos con campos seleccionados.
 * @route GET /api/endpoints/circuits
 * @group Circuits
 * @returns {object} 200 - { circuits: Array<{id, location, name, opened, first_gp, length, altitude}> }
 * @returns {object} 500 - Error interno del servidor
 */
const getCircuits = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const endpoint = `${req.method} ${req.url}`;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    try {
        db_1.default.query(`SELECT 
                id,
                location,
                name,
                opened,
                first_gp,
                length,
                altitude
             FROM circuits
             ORDER BY name DESC`, [], (err, rows) => {
            if (err) {
                console.error('Error al ejecutar la consulta:', err);
                return (0, messages_1.sendServerError)(res, undefined, ip, 'Error al consultar la base de datos', endpoint);
            }
            const circuits = Array.isArray(rows) ? rows : [];
            return (0, messages_1.sendOk)(res, undefined, ip, { circuits }, endpoint);
        });
    }
    catch (error) {
        console.error('Error al listar circuitos:', error);
        return (0, messages_1.sendServerError)(res, undefined, ip, 'Error en el servidor', endpoint);
    }
});
exports.getCircuits = getCircuits;
