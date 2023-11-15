const express = require('express');
const router = express.Router();
const connection = require('./providers/server');

router.get('/productos', (req, res) => {
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

module.exports = router;
