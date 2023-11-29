const express = require('express');
const cors = require('cors');
require('dotenv').config();
const connection = require('./providers/server');

// Importar handleSms desde bot_twilio.js
const { handleSms } = require('./bot_twilio');

const app = express();

// Configuración inicial del servidor y la base de datos
const service = require('./service');
service(app, connection);

// Middlewares
app.use(cors());
app.use(express.urlencoded({ extended: false })); // Asegúrate de usar urlencoded para parsear los cuerpos de peticiones POST

// Rutas
const database = require('./routes');
app.use('/database', database);
app.use('/sms', handleSms);

// Iniciar el servidor
const server = app.listen(process.env.PORT || 3000, () => {
    console.log('El servidor está escuchando en el puerto 3000');
    connection.connect((error) => {
        if (error) {
            console.error('Error al conectar a la base de datos: ' + error.message);
            return;
        }
        console.log('Conexión exitosa a la base de datos MySQL');
    });
});

module.exports = server;
