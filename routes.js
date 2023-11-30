const express = require('express');
const router = express.Router();
const connection = require('./providers/server');
const openai = require('./openai');
const multer = require('multer');
const path = require('path');
const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');
const { spawn } = require('child_process');
//const upload = multer({ dest: 'uploads/' });
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

// Función para subir un archivo al bucket de OCI
function uploadToOCIBucket(filePath, bucketName, namespace) {
    // Asegúrate de que los argumentos estén correctamente formateados como cadenas
    const command = `oci os object put --namespace ${namespace} --bucket-name ${bucketName} --file "${filePath}" --no-multipart`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${error}`);
            return;
        }
        if (stderr) {
            console.error(`stderr: ${stderr}`);
            return;
        }
        console.log(`stdout: ${stdout}`);
    });
}

router.post('/obtenerArchivo', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('No se subió ningún archivo.');
    }

    const fileStats = fs.statSync(req.file.path); // Obtener el tamaño del archivo
    const fileStream = fs.createReadStream(req.file.path);
    const ociUrl = `https://axyzzksibayy.objectstorage.us-phoenix-1.oci.customer-oci.com/p/j9zjaTRHqnhBLPobl0ZVzfADhjXQN4pzRh_MbVN5pAlrpXdd5zTOypRJgZ52zAnG/n/axyzzksibayy/b/bucket-20231101-1735/o/${req.file.originalname}`;

    try {
        const response = await fetch(ociUrl, {
            method: 'PUT',
            body: fileStream,
            headers: {
                'Content-Type': 'application/octet-stream',
                'Content-Length': fileStats.size.toString(), // Agregar tamaño del archivo
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error al subir el archivo:', errorText);
            return res.status(500).send(`Error al subir el archivo: ${errorText}`);
        }

        console.log('Archivo subido correctamente');

        // Ejecutar el script de Python para procesar el archivo
        const pythonProcess = spawn('python', ['invoicekv.py', req.file.originalname]);

        let pythonData = '';
        pythonProcess.stderr.on('data', (data) => {
            console.error(`stderr: ${data.toString()}`);
            //pythonData += data.toString();
        });

        pythonProcess.on('close', (code) => {
            if (code === 0) {
                res.send(pythonData);
            } else {
                res.status(500).send('Error en el script de Python.');
            }
        });

    } catch (error) {
        console.error(error);
        return res.status(500).send('Error al subir el archivo al bucket de OCI.');
    } finally {
        // Opcional: Eliminar el archivo subido del servidor local
        fs.unlink(req.file.path, (err) => {
            if (err) console.error('Error al eliminar el archivo local:', err);
        });
    }
});

module.exports = router;
