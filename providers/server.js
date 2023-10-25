const mysql = require('mysql');

const connection = mysql.createConnection({
    host: process.env.BD_HOSTNAME,
    user: process.env.BD_USER,
    password: process.env.BD_PASSWORD,
    database: process.env.BD_NAME,
});

connection.connect((error) => {
    if (error) {
        console.error('Error al conectar a la base de datos: ' + error.message);
        return;
    }
    console.log('Conexión exitosa a la base de datos MySQL');
});

module.exports = connection;