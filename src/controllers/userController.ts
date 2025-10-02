import dotenv from 'dotenv';
import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import db from '../config/db';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { sendOk, sendBadParam, sendUnauthorized, sendServerError, sendConflict } from '../utils/messages';
import jwt from 'jsonwebtoken';

dotenv.config();

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
export const addUser = async (req: Request, res: Response) => {
    const { username, password, email } = req.body;
    const endpoint = `${req.method} ${req.url}`;
    const ip = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '';

    if (!username || !password || !email) {
        return sendBadParam(res, undefined, ip, 'Todos los campos son obligatorios', endpoint);
    }

    try {
        const [usernameRows] = await db.promise().query<RowDataPacket[]>('SELECT COUNT(*) as count FROM users WHERE username = ?', [username]);
        if (usernameRows[0].count > 0) {
            return sendConflict(res, undefined, ip, 'El nombre de usuario ya está en uso', endpoint);
        }
        const [emailRows] = await db.promise().query<RowDataPacket[]>('SELECT COUNT(*) as count FROM users WHERE email = ?', [email]);
        if (emailRows[0].count > 0) {
            return sendConflict(res, undefined, ip, 'El email ya está en uso', endpoint);
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const created_at = Math.floor(Date.now() / 1000);
        const query = 'INSERT INTO users (username, password, email, created_at) VALUES (?, ?, ?, ?)';
        await db.promise().query<ResultSetHeader>(query, [username, hashedPassword, email, created_at]);

        return sendOk(res, undefined, ip, { message: 'Usuario añadido correctamente' }, endpoint);

    } catch (error) {
        console.error('Error al procesar la solicitud:', error);
        return sendServerError(res, undefined, ip, 'Error en el servidor', endpoint);
    }
};
 
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
export const loginUser = async (req: Request, res: Response) => {
    const { username, password } = req.body;
    const endpoint = `${req.method} ${req.url}`;
    const ip = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '';

    if (!username || !password) {
        return sendBadParam(res, undefined, ip, 'Username y password son obligatorios', endpoint);
    }

    try {
        const [results] = await db.promise().query<RowDataPacket[]>('SELECT * FROM users WHERE username = ?', [username]);
        if (results.length === 0) {
            return sendUnauthorized(res, undefined, ip, 'Usuario no encontrado', endpoint);
        }

        const user = results[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return sendUnauthorized(res, undefined, ip, 'Contraseña incorrecta', endpoint);
        }

        if (!JWT_SECRET) {
            throw new Error('JWT_SECRET is not defined. Please set it in your environment variables.');
        }

        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });
        return sendOk(res, undefined, ip, { message: 'Inicio de sesión exitoso', token }, endpoint);
        
    } catch (error) {
        console.error('Error al procesar la solicitud:', error);
        return sendServerError(res, undefined, ip, 'Error en el servidor', endpoint);
    }
};

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
export const changePassword = async (req: Request, res: Response) => {
    const { username, oldPassword, newPassword } = req.body;
    const endpoint = `${req.method} ${req.url}`;
    const ip = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '';

    if (!username || !oldPassword || !newPassword) {
        return sendBadParam(res, undefined, ip, 'Username, oldPassword y newPassword son obligatorios', endpoint);
    }

    try {
        const [results] = await db.promise().query<RowDataPacket[]>('SELECT * FROM users WHERE username = ?', [username]);
        if (results.length === 0) {
            return sendUnauthorized(res, undefined, ip, 'Usuario no encontrado', endpoint);
        }

        const user = results[0];
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            return sendUnauthorized(res, undefined, ip, 'Contraseña incorrecta', endpoint);
        }

        const isSamePassword = await bcrypt.compare(newPassword, user.password);
        if (isSamePassword) {
            return sendBadParam(res, undefined, ip, 'La nueva contraseña no puede ser igual a la anterior', endpoint);
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        const updateQuery = 'UPDATE users SET password = ? WHERE username = ?';
        const [updateResult] = await db.promise().query<ResultSetHeader>(updateQuery, [hashedNewPassword, username]);

        if (updateResult.affectedRows === 0) {
            return sendServerError(res, undefined, ip, 'No se pudo actualizar la contraseña', endpoint);
        }

        return sendOk(res, undefined, ip, { message: 'Contraseña actualizada correctamente' }, endpoint);

    } catch (error) {
        console.error('Error al procesar la solicitud:', error);
        return sendServerError(res, undefined, ip, 'Error en el servidor', endpoint);
    }
};
