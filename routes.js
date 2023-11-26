const express = require('express');
const router = express.Router();
const connection = require('./providers/server');
const openai = require('./openai');
const multer = require('multer');
const path = require('path');
const { exec } = require('child_process');

router.get('/productos', (req, res) => {
    const sql = 'SELECT Nombre, Precio_Lista, Marca FROM Producto LIMIT 30';
    
    connection.query(sql, (error, result) => {
        if (error) {
            console.error('Error al recuperar datos de la base de datos: ' + error.message);
            return res.status(500).json({ error: 'Error al recuperar datos de la base de datos' });
        } else {
            if (result.length > 0) {
                return res.status(200).json({ data: result });
            } else {
                return res.status(404).json({ message: 'No se encontraron productos' });
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

// Definir una bandera para verificar si la ruta se ha ejecutado
let routeExecuted = false;

router.post('/obtenerArchivo', upload.single('file'), (req, res) => {
    // Verificar si la ruta ya se ha ejecutado en esta solicitud
    if (routeExecuted) {
        // Si ya se ejecutó, puedes responder con un mensaje de error o lo que sea apropiado
        return res.status(400).send('Esta ruta ya se ha ejecutado en esta solicitud.');
    }

    // Establecer la bandera como verdadera para indicar que la ruta se ha ejecutado
    routeExecuted = true;

    // Resto del código de manejo de la solicitud
    if (!req.file) {
        return res.status(400).send('No se subió ningún archivo.');
    }

    console.log('Archivo recibido:', req.file);

    // Ruta del archivo cargado
    const filePath = req.file.path.replace(/\\/g, "/");
    console.log('Ruta del archivo:', filePath);

    // Ejecutar el script de Python sin generar una cadena de comando
    const { spawn } = require('child_process');
    const pythonProcess = spawn('python', ['invoicekv.py', filePath]);

    let pythonData = ''; // Variable para almacenar los datos del script de Python

    pythonProcess.stdout.on('data', (data) => {
        // La salida del script de Python se recibe aquí
        console.log(`Resultado del procesamiento de documentos: ${data}`);
        pythonData += data; // Almacenar los datos en la variable
    });

    let responseSent = false;

    pythonProcess.stderr.on('data', (data) => {
        if (!responseSent) {
            console.error(`Error en el script de Python: ${data}`);
            res.status(500).send('Error en el script de Python.');
            responseSent = true;
        }
    });
    
    pythonProcess.on('close', (code) => {
        if (!responseSent) {
            if (code === 0) {
                res.send(pythonData);
            } else {
                res.status(500).send('Error en el script de Python.');
            }
            responseSent = true;
        }
    });
    
});

module.exports = router;
