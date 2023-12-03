/**
 * Módulo que proporciona la conexión a la base de datos MySQL.
 * @module providers/server
 */

const mysql = require('mysql');

/**
 * Objeto de conexión a la base de datos MySQL.
 * @type {object}
 * @alias module:providers/server
 */
const connection = mysql.createConnection({
    /**
     * Hostname del servidor de base de datos.
     * @type {string}
     */
    host: process.env.BD_HOSTNAME,

    /**
     * Usuario para la conexión a la base de datos.
     * @type {string}
     */
    user: process.env.BD_USER,

    /**
     * Contraseña para la conexión a la base de datos.
     * @type {string}
     */
    password: process.env.BD_PASSWORD,

    /**
     * Nombre de la base de datos a la que conectarse.
     * @type {string}
     */
    database: process.env.BD_NAME,
});

/**
 * Exporta el objeto de conexión a la base de datos MySQL.
 * @type {object}
 * @alias module:providers/server
 */
module.exports = connection;
