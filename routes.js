const express = require('express');
const router = express.Router();
const connection = require('./providers/server');
const openai = require('./openai');
const { handleSms } = require('./bot_twilio');

/**
 * Ruta para obtener información sobre productos.
 * @name GET /productos
 * @function
 * @memberof module:rutas
 * @inner
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} res - Objeto de respuesta HTTP.
 * @returns {void}
 */
router.get('/productos', (req, res) => {
    /**
     * Consulta SQL para obtener información básica sobre productos.
     * @type {string}
     */
    const sql = 'SELECT Nombre, Precio_Lista, Marca FROM Producto LIMIT 30';

    connection.query(sql, (error, result) => {
        if (error) {
            console.error('Error al recuperar datos de la base de datos: ' + error.message);
            res.status(500).json({ error: 'Error al recuperar datos de la base de datos' });
        } else {
            if (result.length > 0) {
                res.status(200).json({ data: result });
            } else {
                res.status(404).json({ message: 'No se encontraron productos' });
            }
        }
    });
});

/**
 * Ruta para manejar mensajes SMS.
 * @name POST /sms
 * @function
 * @memberof module:rutas
 * @inner
 * @param {Object} req - Objeto de solicitud HTTP que contiene el mensaje SMS.
 * @param {Object} res - Objeto de respuesta HTTP.
 * @returns {void}
 */
router.post('/sms', handleSms);

/**
 * Módulo que proporciona rutas para la aplicación.
 * @module rutas
 */
module.exports = router;
