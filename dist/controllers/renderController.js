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
exports.renderHome = exports.renderLogin = void 0;
const messages_1 = require("../utils/messages");
const tokenDecode_1 = require("../utils/tokenDecode");
const endpointsController_1 = require("./endpointsController");
/************************************************************************ */
const renderLogin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
exports.renderLogin = renderLogin;
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
const renderHome = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const infoHomeRacesInfo = yield (0, endpointsController_1.getRacesInfo)();
        console.log(infoHomeRacesInfo.lastRace.race[0].raceName);
        // Renderizar la plantilla EJS sin datos dinámicos por ahora
        res.render('home', { infoHomeRacesInfo });
    }
    catch (error) {
        console.error('Error al procesar la solicitud:', error);
        return (0, messages_1.sendServerError)(res, undefined, ip, 'Error en el servidor', endpoint);
    }
});
exports.renderHome = renderHome;
