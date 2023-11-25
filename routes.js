const express = require('express');
const router = express.Router();
const connection = require('./providers/server');
const openai = require('./openai');
const multer = require('multer');
const path = require('path')

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

router.get('/pruebaOpenAI', (req, res) => {
  openai()
});


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'temp/'); // Carpeta donde se guardarán los archivos
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

router.post('/obtenerArchivo', upload.single('file'), (req, res) => {
    console.log('Archivo recibido:', req.file);
    res.send('Archivo recibido con éxito.');
});


module.exports = router;
