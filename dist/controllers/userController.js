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
exports.changePassword = exports.loginUser = exports.addUser = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const db_1 = __importDefault(require("../config/db"));
const messages_1 = require("../utils/messages");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
dotenv_1.default.config();
const JWT_SECRET = process.env.JWT_SECRET;
/**
 * Añadir un nuevo usuario.
 * @route POST /api/users/add
 * @group User
 * @param {string} username.body.required - Nombre de usuario
 * @param {string} password.body.required - Contraseña del usuario
 * @param {string} email.body.required - Email del usuario
 * @returns {object} 200 - Usuario añadido correctamente
 * @returns {object} 400 - Solicitud incorrecta
 * @returns {object} 409 - Conflicto, el nombre de usuario ya existe
 * @returns {object} 500 - Error interno del servidor
 */
const addUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { username, password, email } = req.body;
    const endpoint = `${req.method} ${req.url}`;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    if (!username || !password || !email) {
        return (0, messages_1.sendBadParam)(res, undefined, ip, 'Todos los campos son obligatorios', endpoint);
    }
    try {
        const [usernameRows] = yield db_1.default.promise().query('SELECT COUNT(*) as count FROM users WHERE username = ?', [username]);
        if (usernameRows[0].count > 0) {
            return (0, messages_1.sendConflict)(res, undefined, ip, 'El nombre de usuario ya está en uso', endpoint);
        }
        const [emailRows] = yield db_1.default.promise().query('SELECT COUNT(*) as count FROM users WHERE email = ?', [email]);
        if (emailRows[0].count > 0) {
            return (0, messages_1.sendConflict)(res, undefined, ip, 'El email ya está en uso', endpoint);
        }
        const hashedPassword = yield bcrypt_1.default.hash(password, 10);
        // Omitir created_at en la consulta, ya que usa CURRENT_TIMESTAMP por defecto
        const query = 'INSERT INTO users (username, password, email) VALUES (?, ?, ?)';
        yield db_1.default.promise().query(query, [username, hashedPassword, email]);
        return (0, messages_1.sendOk)(res, undefined, ip, { message: 'Usuario añadido correctamente' }, endpoint);
    }
    catch (error) {
        console.error('Error al procesar la solicitud:', error);
        return (0, messages_1.sendServerError)(res, undefined, ip, 'Error en el servidor', endpoint);
    }
});
exports.addUser = addUser;
/**
 * Iniciar sesión de usuario.
 * @route POST /api/users/login
 * @group User
 * @param {string} username.body.required - Nombre de usuario
 * @param {string} password.body.required - Contraseña del usuario
 * @returns {object} 200 - Inicio de sesión exitoso con token
 * @returns {object} 400 - Solicitud incorrecta
 * @returns {object} 401 - No autorizado
 * @returns {object} 500 - Error interno del servidor
 */
const loginUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { username, password } = req.body;
    const endpoint = `${req.method} ${req.url}`;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    if (!username || !password) {
        return (0, messages_1.sendBadParam)(res, undefined, ip, 'Username y password son obligatorios', endpoint);
    }
    try {
        const [results] = yield db_1.default.promise().query('SELECT * FROM users WHERE username = ?', [username]);
        if (results.length === 0) {
            return (0, messages_1.sendUnauthorized)(res, undefined, ip, 'Usuario no encontrado', endpoint);
        }
        const user = results[0];
        const isMatch = yield bcrypt_1.default.compare(password, user.password);
        if (!isMatch) {
            return (0, messages_1.sendUnauthorized)(res, undefined, ip, 'Contraseña incorrecta', endpoint);
        }
        if (!JWT_SECRET) {
            throw new Error('JWT_SECRET is not defined. Please set it in your environment variables.');
        }
        const token = jsonwebtoken_1.default.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });
        res.cookie('access_token', token, {
            httpOnly: true, // Evita acceso desde JavaScript (mejora seguridad)
            secure: process.env.NODE_ENV === 'production', // Solo HTTPS en producción
            sameSite: 'strict', // Protege contra CSRF
            maxAge: 3600 * 1000 // 1 hora en milisegundos
        });
        return (0, messages_1.sendOk)(res, undefined, ip, { message: 'Inicio de sesión exitoso', token }, endpoint);
    }
    catch (error) {
        console.error('Error al procesar la solicitud:', error);
        return (0, messages_1.sendServerError)(res, undefined, ip, 'Error en el servidor', endpoint);
    }
});
exports.loginUser = loginUser;
/**
 * Cambiar la contraseña de un usuario.
 * @route PATCH /api/users/changepassword
 * @group User
 * @param {string} username.body.required - Nombre de usuario
 * @param {string} oldPassword.body.required - Contraseña anterior
 * @param {string} newPassword.body.required - Nueva contraseña
 * @returns {object} 200 - Contraseña actualizada correctamente
 * @returns {object} 400 - Solicitud incorrecta
 * @returns {object} 401 - No autorizado, nombre de usuario o contraseña anterior incorrectos
 * @returns {object} 500 - Error interno del servidor
 */
const changePassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { username, oldPassword, newPassword } = req.body;
    const endpoint = `${req.method} ${req.url}`;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    if (!username || !oldPassword || !newPassword) {
        return (0, messages_1.sendBadParam)(res, undefined, ip, 'Username, oldPassword y newPassword son obligatorios', endpoint);
    }
    try {
        const [results] = yield db_1.default.promise().query('SELECT * FROM users WHERE username = ?', [username]);
        if (results.length === 0) {
            return (0, messages_1.sendUnauthorized)(res, undefined, ip, 'Usuario no encontrado', endpoint);
        }
        const user = results[0];
        const isMatch = yield bcrypt_1.default.compare(oldPassword, user.password);
        if (!isMatch) {
            return (0, messages_1.sendUnauthorized)(res, undefined, ip, 'Contraseña incorrecta', endpoint);
        }
        const isSamePassword = yield bcrypt_1.default.compare(newPassword, user.password);
        if (isSamePassword) {
            return (0, messages_1.sendBadParam)(res, undefined, ip, 'La nueva contraseña no puede ser igual a la anterior', endpoint);
        }
        const hashedNewPassword = yield bcrypt_1.default.hash(newPassword, 10);
        const updateQuery = 'UPDATE users SET password = ? WHERE username = ?';
        const [updateResult] = yield db_1.default.promise().query(updateQuery, [hashedNewPassword, username]);
        if (updateResult.affectedRows === 0) {
            return (0, messages_1.sendServerError)(res, undefined, ip, 'No se pudo actualizar la contraseña', endpoint);
        }
        return (0, messages_1.sendOk)(res, undefined, ip, { message: 'Contraseña actualizada correctamente' }, endpoint);
    }
    catch (error) {
        console.error('Error al procesar la solicitud:', error);
        return (0, messages_1.sendServerError)(res, undefined, ip, 'Error en el servidor', endpoint);
    }
});
exports.changePassword = changePassword;
