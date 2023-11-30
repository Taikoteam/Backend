const mysql = require('mysql');

const connection = mysql.createConnection({
    host: process.env.BD_HOSTNAME,
    user: process.env.BD_USER,
    password: process.env.BD_PASSWORD,
    database: process.env.BD_NAME,
});


module.exports = connection;