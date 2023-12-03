/**
 * Módulo que maneja las funciones relacionadas con la interacción a través de mensajes SMS.
 * @module bot_twilio
 */
const express = require('express');
const { urlencoded } = require('body-parser');
const { OpenAI } = require("openai");
const twilio = require('twilio');
require("dotenv").config();

/**
 * Instancia de OpenAI para la integración con el modelo de lenguaje.
 * @type {OpenAI}
 * @see {@link https://beta.openai.com/docs/}
 */
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const app = express();
app.use(urlencoded({ extended: false }));

const connection = require('./providers/server');

/**
 * Mapa que asocia los identificadores de los usuarios de WhatsApp con los hilos de OpenAI.
 * @type {Object.<string, string>}
 */
const threadMap = {};

/**
 * Obtiene el ID del hilo de OpenAI asociado a un usuario de WhatsApp.
 * @param {string} senderId - ID del remitente en WhatsApp.
 * @returns {string} - ID del hilo de OpenAI asociado al usuario.
 */
const getOpenAiThreadId = (senderId) => threadMap[senderId];

/**
 * Asocia un ID de hilo de OpenAI a un usuario de WhatsApp.
 * @param {string} senderId - ID del remitente en WhatsApp.
 * @param {string} openAiThreadId - ID del hilo de OpenAI asociado al usuario.
 */
const addThreadToMap = (senderId, openAiThreadId) => {
    threadMap[senderId] = openAiThreadId;
};

/**
 * Estados finales de los hilos de OpenAI.
 * @type {string[]}
 */
const terminalStates = ["cancelled", "failed", "completed", "expired"];
const statusCheckLoop = async (openAiThreadId, runId) => {
    const run = await openai.beta.threads.runs.retrieve(openAiThreadId, runId);

    if (terminalStates.indexOf(run.status) < 0) {
        await sleep(1000);
        return statusCheckLoop(openAiThreadId, runId);
    }
    return run.status;
};

/**
 * Añade un mensaje al hilo de OpenAI.
 * @param {string} threadId - ID del hilo de OpenAI.
 * @param {string} content - Contenido del mensaje.
 * @returns {Promise<object>} - Objeto de mensaje creado.
 */
const addMessage = (threadId, content) => {
    return openai.beta.threads.messages.create(threadId, { role: "user", content });
};

/**
 * Estados de los usuarios o canales.
 * @type {Object.<string, { awaitingOrderNumber: boolean, awaitingDataPedido: boolean }>}
 */
const userStates = {};

/**
 * Función de espera.
 * @param {number} ms - Milisegundos a esperar.
 * @returns {Promise<void>} - Promesa de espera.
 */
const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Obtiene el estatus de un pedido.
 * @param {string} orderNumber - Número de pedido.
 * @returns {Promise<object|null>} - Objeto con información del pedido o null si no se encuentra.
 */
async function getStatusOfOrder(orderNumber) {
    return new Promise((resolve, reject) => {
        const clienteId = 1
        connection.query(
            'SELECT P.Id AS Pedido_ID,DP.Estatus,P.Fecha,PR.Nombre AS Nombre_Producto,DP.Cantidades,E.Direccion AS Direccion_de_Envio FROM Pedido AS P JOIN Detalles_Pedido AS DP ON P.Id = DP.Pedido_Id JOIN Producto AS PR ON DP.Producto_Id = PR.Pk_Id JOIN Envio AS E ON DP.Envio_Id = E.Id WHERE P.Id = ? AND P.Cliente_Id = ?;',
            [orderNumber, clienteId],
            (error, results, fields) => {
                if (error) {
                    console.error('Error en la consulta a la base de datos:', error);
                    reject(error);
                }
                else {
                    resolve(results.length > 0 ? results[0] : null);
                }
            }
        );
    });
}

/**
 * Obtiene la disponibilidad de un producto.
 * @param {string} nombre_producto - Nombre del producto.
 * @returns {Promise<object|null>} - Objeto con información del producto o null si no se encuentra.
 */
async function getDisponibilityProduct(nombre_producto){
    return new Promise((resolve, reject) => {
        connection.query('SELECT P.Pk_Id, P.Disponibilidad FROM Producto AS P WHERE P.Nombre = ?;',
        [nombre_producto],
        (error, results, fields) => {
            if (error) {
                console.error('Error en la consulta a la base de datos:', error);
                reject(error);
            }
            else {
                resolve(results.length > 0 ? results[0] : null);
            }
        }
        )
    })
}

/**
 * Realiza un nuevo pedido.
 * @returns {Promise<object>} - Objeto con información del pedido realizado.
 */
async function RealizarPedido(){
    const Cliente_Id = 1;
    const Fecha = '2023-11-22';
    return new Promise((resolve, reject) => {
        connection.query(
        'INSERT INTO Pedido (Cliente_Id, Fecha) VALUES (?, ?);',
        [Cliente_Id, Fecha],
        (error, results, fields) => {
            if (error) {
                console.error('Error en la consulta a la base de datos:', error);
                reject(error);
            }
            else {
                resolve(results);
        }
    }
    );
});
}

/**
 * Realiza un nuevo envío.
 * @param {string} Direccion - Dirección del envío.
 * @returns {Promise<object>} - Objeto con información del envío realizado.
 */
async function RealizarEnvio(Direccion){
    const Id_Tipo_Envio = Math.floor(Math.random() * 3) + 1;
    const Id_tipo_contenedor = Math.floor(Math.random() * 7) + 1;
    const Fecha = '2023-11-23'
    return new Promise((resolve, reject) => {
        connection.query(
        'INSERT INTO Envio (Id_Tipo_Envio, Id_tipo_contenedor, Direccion, Fecha_Envio) VALUES (?, ?, ?, ?);',
        [Id_Tipo_Envio, Id_tipo_contenedor, Direccion, Fecha],
        (error, results, fields) => {
            if (error) {
                console.error('Error en la consulta a la base de datos:', error);
                reject(error);
            }
            else {
                resolve(results);
        }
    }
    );
});
}

/**
 * Obtiene el ID de un pedido.
 * @returns {Promise<object|null>} - Objeto con información del pedido o null si no se encuentra.
 */
async function ObtenerIdPedido(){
    return new Promise((resolve, reject) => {
        connection.query(
        'SELECT Pedido_Id FROM Detalles_Pedido ORDER BY Pedido_Id DESC LIMIT 1;',
        (error, results, fields) => {
            if (error) {
            console.error('Error en la consulta a la base de datos:', error);
            reject(error);
            }
            else {
            resolve(results.length > 0 ? results[0] : null);
            }
        }
        );
    });
}

/**
 * Obtiene el último pedido.
 * @returns {Promise<object|null>} - Objeto con información del último pedido o null si no se encuentra.
 */
async function ObtenerUltimoPedido() {
    return new Promise((resolve, reject) => {
    connection.query(
        'SELECT Id FROM Pedido ORDER BY Id DESC LIMIT 1;',
        (error, results, fields) => {
        if (error) {
            console.error('Error en la consulta a la base de datos:', error);
            reject(error);
        }
        else {
            resolve(results.length > 0 ? results[0] : null);
        }
        }
    );
    });
}

/**
 * Obtiene el último envío.
 * @returns {Promise<object|null>} - Objeto con información del último envío o null si no se encuentra.
 */
async function ObtenerUltimoEnvio() {
    return new Promise((resolve, reject) => {
    connection.query(
        'SELECT Id FROM Envio ORDER BY Id DESC LIMIT 1;',
        (error, results, fields) => {
        if (error) {
            console.error('Error en la consulta a la base de datos:', error);
            reject(error);
        }
        else {
            resolve(results.length > 0 ? results[0] : null);
        }
        }
    );
    });
}

/**
 * Realiza los detalles de un pedido.
 * @param {number} Id - ID del producto.
 * @param {number} cantidad - Cantidad del producto.
 * @returns {Promise<object>} - Objeto con información del detalle del pedido.
 */
async function RealizarDetalles(Id, cantidad){
    const Pedido_id = await ObtenerUltimoPedido()
    const Envio_id = await ObtenerUltimoEnvio()
    const estatus = 'En ruta'
    return new Promise((resolve, reject) => {
        connection.query(
        'INSERT INTO Detalles_Pedido (Producto_Id, Pedido_Id, Cantidades, Envio_Id) VALUES (?, ?, ?, ?);',
        [Id, Pedido_id.Id, cantidad, Envio_id.Id, estatus],
        (error, results, fields) => {
            if (error) {
                console.error('Error en la consulta a la base de datos:', error);
                reject(error);
            }
            else {
                resolve(results);
        }
    }
    );
});
}

/**
 * Verifica si un mensaje es una consulta de estatus de pedido.
 * @param {string} mensaje - Contenido del mensaje.
 * @returns {boolean} - true si el mensaje es una consulta de estatus de pedido, false de lo contrario.
 */
function esConsultaDePedido(mensaje) {
    return mensaje.toLowerCase().startsWith("estatus del pedido");
}

/**
 * Verifica si un mensaje es para realizar un pedido.
 * @param {string} mensaje - Contenido del mensaje.
 * @returns {boolean} - true si el mensaje es para realizar un pedido, false de lo contrario.
 */
function esRealizarPedido(mensaje){
    return mensaje.toLowerCase().startsWith("quiero hacer un pedido");
}

/**
 * Extrae el número de pedido de un mensaje.
 * @param {string} mensaje - Contenido del mensaje.
 * @returns {string|null} - Número de pedido o null si no se encuentra.
 */
function extraerNumeroDePedido(mensaje) {
    const partes = mensaje.split(" ");
    const numeroPedido = partes.length > 3 ? partes[3] : null;
    return numeroPedido;
}

/**
 * Cliente de Twilio para enviar mensajes de respuesta.
 * @type {object}
 */
const twilioClient = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

/**
 * Envia una respuesta a través de Twilio.
 * @param {string} senderId - ID del remitente en WhatsApp.
 * @param {string} replyText - Texto de la respuesta.
 */
const sendReply = (senderId, replyText) => {
    twilioClient.messages.create({
        body: replyText,
        from: 'whatsapp:+14155238886', // Reemplaza con tu número de Twilio para WhatsApp
        to: 'whatsapp:+5215539501267'
    })
    .then(message => console.log(`Message sent with SID: ${message.sid}`))
    .catch(error => console.error(`Error sending message: ${error}`));
};

/**
 * Maneja el proceso de recepción de mensajes SMS.
 * @param {object} req - Objeto de solicitud HTTP.
 * @param {object} res - Objeto de respuesta HTTP.
 * @returns {Promise<void>} - Promesa que se resuelve después de manejar el mensaje SMS.
 */
async function handleSms(req, res) {
    const incomingMsg = req.body.Body;
    const senderId = req.body.From;
    messagesLoaded = false; // Inicializa messagesLoaded aqui
    const channelId = req.body.WaId; // Identificador único del canal o usuario
    if (!userStates[channelId]) {
        userStates[channelId] = { awaitingOrderNumber: false, awaitingDataPedido: false };
    }
    if (esConsultaDePedido(req.body.Body) && !userStates[channelId].awaitingOrderNumber && !userStates[channelId].awaitingDataPedido) {
        userStates[channelId].awaitingOrderNumber = true;
        userStates[channelId].awaitingDataPedido = false;
        sendReply(senderId, "Por favor, envíame el número de tu pedido.");
        return;
    }
    else if (esRealizarPedido(req.body.Body) && !userStates[channelId].awaitingOrderNumber && !userStates[channelId].awaitingDataPedido){
        userStates[channelId].awaitingOrderNumber = false;
        userStates[channelId].awaitingDataPedido = true;
        sendReply(senderId, "Escribe que quieres ordenar en el siguiente orden y separado por punto y coma (;): Nombre del producto, cantidad, direccion de envio");
        return;
    }
    if (userStates[channelId].awaitingOrderNumber) {
        const orderNumber = req.body.Body.trim();
         userStates[channelId].awaitingOrderNumber = false; // Resetear el estado
        try {
            const status = await getStatusOfOrder(orderNumber);
            let reply;
            if (status) {
                reply = `El estatus de la orden ${orderNumber} de ${status.Cantidades} pz de ${status.Nombre_Producto}, enviado a ${status.Direccion_de_Envio} es: ${status.Estatus}`;
            }
            else {
                reply = `Lo siento, no pude encontrar información sobre el pedido número ${orderNumber}.`;
            }
            userStates[channelId] = { awaitingOrderNumber: false, awaitingDataPedido: false };
            sendReply(senderId, reply);
        }
        catch (error) {
            console.error('Error al consultar la base de datos:', error);
            sendReply(senderId, 'Hubo un error al procesar tu solicitud.');
        }
        return;
    }
    else if (userStates[channelId].awaitingDataPedido){
        try{const detallesPedido = req.body.Body
            var especificaciones = detallesPedido.split("; ");
            const nombre_producto = especificaciones[0];
            const direccion = especificaciones[2];
            const cantidad = parseInt(especificaciones[1], 10);
            const disponibilidad = await getDisponibilityProduct(nombre_producto)
            if (disponibilidad === null){
                reply = `Lo siento, pero creo que el producto que quieres no existe en nuestra tienda o no seguiste el formato solicitado`
                userStates[channelId].awaitingOrderNumber = false;
                userStates[channelId].awaitingDataPedido = true;
            }
            else if (disponibilidad.Disponibilidad === 1){
                await RealizarPedido()
                await RealizarEnvio(direccion)
                await RealizarDetalles(disponibilidad.Pk_Id, cantidad)
                const id_Pedido = await ObtenerIdPedido()
                reply = `Este es el resumen de tu pedido
                        Articulo: ${nombre_producto}
                        Cantidad: ${cantidad}
                        Dirección: ${direccion}
                        El número de pedido es: ${id_Pedido.Pedido_Id} este lo puedes usar para revisar el estatus posteriormente
                        Vuelve Pronto :)`;
            }
            else if (disponibilidad.Disponibilidad === 0){
                reply = `Lo siento, el producto ${nombre_producto} no se encuentra disponible actualmente`
            } 
            sendReply(senderId, reply);
            userStates[channelId] = { awaitingOrderNumber: false, awaitingDataPedido: false };
        }
        catch (error){
            console.error('Error al consultar la base de datos:', error);
            sendReply(senderId, 'Hubo un error al procesar tu solicitud.');
        }
        return;
    }
    let openAiThreadId = getOpenAiThreadId(senderId);

    if (!openAiThreadId) {
        const thread = await openai.beta.threads.create();
        openAiThreadId = thread.id;
        addThreadToMap(senderId, openAiThreadId);
    }

    const twilioThreadId = req.body.From;
    if (!openAiThreadId) {
        // Crea un nuevo hilo en OpenAI
        const thread = await openai.beta.threads.create();
        openAiThreadId = thread.id;
        addThreadToMap(twilioThreadId, openAiThreadId);
    }

    // Obtén el contenido del mensaje de WhatsApp
    const twilioMessageContent = req.body.Body;

    // Asegúrate de que el contenido del mensaje no esté vacío
    if (twilioMessageContent.trim() !== '') {
        await addMessage(openAiThreadId, twilioMessageContent);
    }
    const run = await openai.beta.threads.runs.create(openAiThreadId, { assistant_id: process.env.ASSISTANT_ID });
    const status = await statusCheckLoop(openAiThreadId, run.id);
    const messages = await openai.beta.threads.messages.list(openAiThreadId);
    let response = messages.data[0].content[0].text.value;
    response = response.substring(0, 1600); // Limit for SMS length
    return sendReply(openAiThreadId, response);
}

module.exports = { handleSms };
