const express = require('express');
const service = require('./service');
require('dotenv').config()
const connection = require('./providers/server');
const logger = console;
const cors = require('cors');
const app = express();
service(app, connection);

app.use(cors());

const database = require('./routes');
app.use('/database', database);

// Importar la función processMessage de bot.js
const { processMessage } = require('./bot'); // Asegúrate de que la ruta sea correcta

// Middleware para procesar mensajes entrantes
app.post('/message', async (req, res) => {
    const incomingMsg = req.body.message;
    const senderId = req.body.senderId || 'default-sender';

    try {
        // Procesar el mensaje utilizando la función processMessage de bot.js
        const response = await processMessage(incomingMsg, senderId);

        // Enviar la respuesta al frontend
        res.json({ reply: response });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

const server = app.listen(process.env.PORT || 3000, () => {
  console.log('El servidor está escuchando en el puerto 3000'); // Agregado
  logger.info(`Servidor corriendo`);
  connection.connect((error) => {
    if (error) {
      console.error('Error al conectar a la base de datos: ' + error.message);
      return;
    }
    console.log('Conexión exitosa a la base de datos MySQL');
  });
});

module.exports = server;
