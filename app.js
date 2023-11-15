const express = require('express');
const service = require('./service');
require('dotenv').config()
const connection = require('./providers/server');
const logger = console;
const cors = require('cors');
const app = express();
service(app, connection);

app.use(cors());

const database = require('./routes')

app.use('/database', database)


const server = app.listen(process.env.PORT || 3000, () => {
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