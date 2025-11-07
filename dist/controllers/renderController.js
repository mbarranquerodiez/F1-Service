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
exports.RenderController = void 0;
const messages_1 = require("../utils/messages");
const tokenDecode_1 = require("../utils/tokenDecode");
const endpointsController_1 = require("./endpointsController");
const endpointsController = new endpointsController_1.EndPoitnsController();
/************************************************************************ */
class RenderController {
    constructor() {
        this.renderLogin = (req, res) => __awaiter(this, void 0, void 0, function* () {
            const endpoint = `${req.method} ${req.url}`;
            const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
            try {
                res.render('login');
            }
            catch (error) {
                console.error('Error al renderizar la página de login:', error);
                return (0, messages_1.sendServerError)(res, undefined, ip, 'Error en el servidor', endpoint);
            }
        });
        this.renderHome = (req, res) => __awaiter(this, void 0, void 0, function* () {
            const endpoint = `${req.method} ${req.url}`;
            const token = req.cookies.access_token;
            const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
            if (!token) {
                return (0, messages_1.sendUnauthorized)(res, undefined, ip, 'Token no proporcionado', endpoint);
            }
            try {
                const decoded = yield (0, tokenDecode_1.verifyToken)(token);
                if (typeof decoded !== 'object' || decoded === null) {
                    console.error('Decodificación fallida, no es un objeto válido.');
                    return (0, messages_1.sendUnauthorized)(res, undefined, ip, 'Token inválido', endpoint);
                }
                const infoHomeRacesInfo = yield endpointsController.getRacesInfo();
                console.log(infoHomeRacesInfo.lastRace.race[0].raceName);
                // Renderizar la plantilla EJS sin datos dinámicos por ahora
                res.render('home', { infoHomeRacesInfo });
            }
            catch (error) {
                console.error('Error al procesar la solicitud:', error);
                return (0, messages_1.sendServerError)(res, undefined, ip, 'Error en el servidor', endpoint);
            }
        });
        this.renderAllRacesByYear = (req, res) => __awaiter(this, void 0, void 0, function* () {
            const endpoint = `${req.method} ${req.url}`;
            const token = req.cookies.access_token;
            const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
            const yearString = req.query.year;
            const year = yearString && !isNaN(parseInt(yearString, 10))
                ? parseInt(yearString, 10)
                : new Date().getFullYear();
            // Validate year
            if (isNaN(year) || year < 1900 || year > 2100) {
                return res.status(400).json({ error: 'Invalid year' });
            }
            if (!token) {
                return (0, messages_1.sendUnauthorized)(res, undefined, ip, 'Token no proporcionado', endpoint);
            }
            try {
                const decoded = yield (0, tokenDecode_1.verifyToken)(token);
                if (typeof decoded !== 'object' || decoded === null) {
                    console.error('Decodificación fallida, no es un objeto válido.');
                    return (0, messages_1.sendUnauthorized)(res, undefined, ip, 'Token inválido', endpoint);
                }
                const infoAllYearRaces = yield endpointsController.getRacesByYear(year);
                res.render('allRaces', { year, infoAllYearRaces });
            }
            catch (error) {
                console.error('Error al procesar la solicitud:', error);
                return (0, messages_1.sendServerError)(res, undefined, ip, 'Error en el servidor', endpoint);
            }
        });
        this.renderRaceDetails = (req, res) => __awaiter(this, void 0, void 0, function* () {
            const endpoint = `${req.method} ${req.url}`;
            const token = req.cookies.access_token;
            const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
            const city = req.query.city;
            const country = req.query.country;
            const timestamp = req.query.timestamp;
            if (!city || !country || !timestamp) {
                return res.status(400).json({ error: 'Faltan parámetros obligatorios' });
            }
            if (!token) {
                return (0, messages_1.sendUnauthorized)(res, undefined, ip, 'Token no proporcionado', endpoint);
            }
            try {
                const decoded = yield (0, tokenDecode_1.verifyToken)(token);
                if (typeof decoded !== 'object' || decoded === null) {
                    console.error('Decodificación fallida, no es un objeto válido.');
                    return (0, messages_1.sendUnauthorized)(res, undefined, ip, 'Token inválido', endpoint);
                }
                const infoRaceDetails = yield endpointsController.getRaceDetails(city, country, timestamp);
                if (infoRaceDetails.success === true) {
                    res.render('raceDetails', { infoRaceDetails });
                }
                else {
                    res.render("errorPage", { infoRaceDetails });
                }
            }
            catch (error) {
                console.error('Error al procesar la solicitud:', error);
                return (0, messages_1.sendServerError)(res, undefined, ip, 'Error en el servidor', endpoint);
            }
        });
        this.renderAllDriversByYear = (req, res) => __awaiter(this, void 0, void 0, function* () {
            const endpoint = `${req.method} ${req.url}`;
            const token = req.cookies.access_token;
            const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
            console.log(req.query.year);
            const yearString = req.query.year;
            const year = yearString && !isNaN(parseInt(yearString, 10)) ? parseInt(yearString, 10) : new Date().getFullYear();
            // Validate year
            if (isNaN(year) || year < 1900 || year > 2100) {
                return res.status(400).json({ error: 'Invalid year' });
            }
            if (!token) {
                return (0, messages_1.sendUnauthorized)(res, undefined, ip, 'Token no proporcionado', endpoint);
            }
            try {
                const decoded = yield (0, tokenDecode_1.verifyToken)(token);
                if (typeof decoded !== 'object' || decoded === null) {
                    console.error('Decodificación fallida, no es un objeto válido.');
                    return (0, messages_1.sendUnauthorized)(res, undefined, ip, 'Token inválido', endpoint);
                }
                const infoAllYearDriversByYear = yield endpointsController.getAllDriverByYear(year);
                if (infoAllYearDriversByYear.success === true) {
                    console.log("Entra en succes true", infoAllYearDriversByYear);
                    res.render('allDrivers', { year, infoAllYearDriversByYear });
                }
                else {
                    res.render("errorPage", { infoAllYearDriversByYear });
                }
            }
            catch (error) {
                console.error('Error al procesar la solicitud:', error);
                return (0, messages_1.sendServerError)(res, undefined, ip, 'Error en el servidor', endpoint);
            }
        });
        this.renderDriverDetails = (req, res) => __awaiter(this, void 0, void 0, function* () {
            const endpoint = `${req.method} ${req.url}`;
            const token = req.cookies.access_token;
            const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
            console.log(req.query.year, req.query.driverId);
            const yearString = req.query.year;
            const driverId = req.query.driverId;
            const year = yearString && !isNaN(parseInt(yearString, 10)) ? parseInt(yearString, 10) : new Date().getFullYear();
            // Validate year
            if (isNaN(year) || year < 1900 || year > 2100 || !driverId) {
                return res.status(400).json({ error: 'Invalid year or driverId' });
            }
            const infoDriverDetails = yield endpointsController.getDriverDetails(year, driverId);
            if (infoDriverDetails.success === true) {
                res.render('driverDetails', { year, infoDriverDetails });
            }
            else {
                res.render("errorPage", { infoDriverDetails });
            }
        });
        this.renderGallery = (req, res) => __awaiter(this, void 0, void 0, function* () {
            const endpoint = `${req.method} ${req.url}`;
            const token = req.cookies.access_token;
            const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
            if (!token) {
                return (0, messages_1.sendUnauthorized)(res, undefined, ip, 'Token no proporcionado', endpoint);
            }
            try {
                // Solución sencilla: declara filters con tipo union para permitir null
                let filters = req.query;
                console.log("Filtros recibidos en renderGallery:", filters);
                // Si no hay nada en la query (objeto vacío), setear a null
                if (Object.keys(filters).length === 0) {
                    filters = null;
                    console.log("No hay filtros en la query, se setea a null", filters);
                }
                const decoded = yield (0, tokenDecode_1.verifyToken)(token);
                if (typeof decoded !== 'object' || decoded === null) {
                    console.error('Decodificación fallida, no es un objeto válido.');
                }
                const inforGalleryPage = yield endpointsController.getGalleryPageInfo(filters);
                res.render('galleryF1', { inforGalleryPage });
            }
            catch (error) {
                console.error('Error al procesar la solicitud:', error);
                return (0, messages_1.sendServerError)(res, undefined, ip, 'Error en el servidor', endpoint);
            }
        });
        this.renderCircuits = (req, res) => __awaiter(this, void 0, void 0, function* () {
            const endpoint = `${req.method} ${req.url}`;
            const token = req.cookies.access_token;
            const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
            if (!token) {
                return (0, messages_1.sendUnauthorized)(res, undefined, ip, 'Token no proporcionado', endpoint);
            }
            try {
                const decoded = yield (0, tokenDecode_1.verifyToken)(token);
                if (typeof decoded !== 'object' || decoded === null) {
                    console.error('Decodificación fallida, no es un objeto válido.');
                    return (0, messages_1.sendUnauthorized)(res, undefined, ip, 'Token inválido', endpoint);
                }
                const circuitsInfo = yield endpointsController.getCircuits();
                res.render('circuits', { circuitsInfo });
            }
            catch (error) {
                console.error('Error al procesar la solicitud:', error);
                return (0, messages_1.sendServerError)(res, undefined, ip, 'Error en el servidor', endpoint);
            }
        });
        this.loadCircuitDetails = (req, res) => __awaiter(this, void 0, void 0, function* () {
            const endpoint = `${req.method} ${req.url}`;
            const token = req.cookies.access_token;
            const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
            if (!token) {
                return (0, messages_1.sendUnauthorized)(res, undefined, ip, 'Token no proporcionado', endpoint);
            }
            try {
                const decoded = yield (0, tokenDecode_1.verifyToken)(token);
                if (typeof decoded !== 'object' || decoded === null) {
                    console.error('Decodificación fallida, no es un objeto válido.');
                    return (0, messages_1.sendUnauthorized)(res, undefined, ip, 'Token inválido', endpoint);
                }
                const idString = req.params.id;
                const id = idString && !isNaN(parseInt(idString, 10)) ? parseInt(idString, 10) : undefined;
                if (!id) {
                    return (0, messages_1.sendBadParam)(res, undefined, ip, 'El id del circuito es obligatorio', endpoint);
                }
                const circuitInfo = yield endpointsController.loadCircuitDetails(id);
                return circuitInfo;
            }
            catch (error) {
                console.error('Error al cargar información del circuito:', error);
                throw error;
            }
        });
    }
}
exports.RenderController = RenderController;
;
