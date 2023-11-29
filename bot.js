const { Client, GatewayIntentBits } = require('discord.js');
const { OpenAI } = require("openai");
const connection = require('./providers/server');
require("dotenv").config();
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Estado de los usuarios o canales
const userStates = {};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));


client.once('ready', () => {
    console.log('Bot is ready!');
});

const threadMap = {};
const getOpenAiThreadId = (discordThreadId) => threadMap[discordThreadId];
const addThreadToMap = (discordThreadId, openAiThreadId) => {
    threadMap[discordThreadId] = openAiThreadId;
};

const terminalStates = ["cancelled", "failed", "completed", "expired"];

const statusCheckLoop = async (openAiThreadId, runId) => {
    const run = await openai.beta.threads.runs.retrieve(openAiThreadId, runId);
    if (terminalStates.indexOf(run.status) < 0) {
        await sleep(1000);
        return statusCheckLoop(openAiThreadId, runId);
    }
    return run.status;
};

const addMessage = (threadId, content) => openai.beta.threads.messages.create(threadId, { role: "user", content });

async function getStatusOfOrder(orderNumber) {
    console.log(`Consultando el estatus del pedido: ${orderNumber}`);
    return new Promise((resolve, reject) => {
        const clienteId = 1;
        console.log("Si estoy entrando a hacer el query");
        connection.query(
            'SELECT P.Id AS Pedido_ID,DP.Estatus,P.Fecha,PR.Nombre AS Nombre_Producto,DP.Cantidades,E.Direccion AS Direccion_de_Envio FROM Pedido AS P JOIN Detalles_Pedido AS DP ON P.Id = DP.Pedido_Id JOIN Producto AS PR ON DP.Producto_Id = PR.Pk_Id JOIN Envio AS E ON DP.Envio_Id = E.Id WHERE P.Id = ? AND P.Cliente_Id = ?;',
            [orderNumber, clienteId],
            (error, results, fields) => {
                if (error) {
                    console.error('Error en la consulta a la base de datos:', error);
                    reject(error);
                } else {
                    console.log('Resultados de la consulta:', results[0]);
                    resolve(results.length > 0 ? results[0] : null);
                }
            }
        );
    });
}

function esConsultaDePedido(mensaje) {
    return mensaje.toLowerCase().startsWith("estatus del pedido");
}

function extraerNumeroDePedido(mensaje) {
    const partes = mensaje.split(" ");
    const numeroPedido = partes.length > 3 ? partes[3] : null;
    console.log(`extraerNumeroDePedido: ${numeroPedido}`);
    return numeroPedido;
}

client.on('messageCreate', async message => {
    if (message.author.bot || !message.content || message.content === '') return;

    let messagesLoaded = false; // Inicializa messagesLoaded aqui
    const channelId = message.channel.id; // Identificador único del canal o usuario
    if (!userStates[channelId]) {
        userStates[channelId] = { awaitingOrderNumber: false };
    }

    if (esConsultaDePedido(message.content) && !userStates[channelId].awaitingOrderNumber) {
        userStates[channelId].awaitingOrderNumber = true;
        message.reply("Por favor, envíame el número de tu pedido.");
        return;
    }

    try {
        if (message.attachments.size > 0) {
            console.log("Esto es el archivo: ", message.attachments.first());
            const attachment = message.attachments.first();
            console.log(`Archivo adjunto recibido: ${attachment.attachment}`);
    
            // Descargar el archivo usando Axios (No es necesario en este caso)
            // const response = await axios.get(attachment.attachment, { responseType: 'arraybuffer' });
            // const buffer = Buffer.from(response.data);
    
            // Almacena el archivo temporalmente como PDF
            /*const tempDir = path.join(__dirname, 'temp');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir);
            }
            const tempFilePath = path.join(__dirname, 'temp', `${attachment.name}`);
            
            // Guardar el archivo adjunto directamente
            const fileStream = fs.createWriteStream(tempFilePath);
            const attachmentStream = await axios.get(attachment.attachment, { responseType: 'stream' });
    
            attachmentStream.data.pipe(fileStream);
    
            await new Promise((resolve, reject) => {
                fileStream.on('finish', resolve);
                fileStream.on('error', reject);
            });
    
            // Puedes hacer lo que quieras con el archivo PDF aquí
            // En este ejemplo, simplemente lo enviaré de vuelta como respuesta
            message.reply(`Se ha procesado el archivo PDF: ${attachment.name}`);
    
            // Envía el archivo PDF al endpoint si es necesario
            const endpointUrl = process.env.OBTENER_ARCHIVO;  // Reemplaza con tu URL de endpoint
            const formData = new FormData();
            formData.append('file', fs.createReadStream(tempFilePath));

            const endpointResponse = await axios.post(endpointUrl, formData, {
                headers: {
                    ...formData.getHeaders(),
                },
            });*/
    
            // Puedes manejar la respuesta del endpoint según tus necesidades
            const endpointResult = endpointResponse.data;
            console.log(endpointResult);
        }
    } catch (error) {
        console.error('Error al manejar el archivo adjunto:', error);
        message.reply('Hubo un error al procesar tu solicitud.');
    }finally {
    // Elimina el archivo PDF temporal después de usarlo, incluso si hay un error
        if (tempFilePath && fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
        }
    }

    if (userStates[channelId].awaitingOrderNumber) {
        const orderNumber = message.content.trim();
        userStates[channelId].awaitingOrderNumber = false; // Resetear el estado
        try {
            const status = await getStatusOfOrder(orderNumber);
            let reply;
            if (status) {
                reply = `El estatus de la orden ${orderNumber} de ${status.Cantidades} pz de ${status.Nombre_Producto}, enviado a ${status.Direccion_de_Envio} es: ${status.Estatus}`;
            } else {
                reply = `Lo siento, no pude encontrar información sobre el pedido número ${orderNumber}.`;
            }
            
            message.reply(reply);
        
            messagesLoaded = true;
        } catch (error) {
            console.error('Error al consultar la base de datos:', error);
            message.reply('Hubo un error al procesar tu solicitud.');
        }
        return ;
    }

    const discordThreadId = message.channel.id;
    let openAiThreadId = getOpenAiThreadId(discordThreadId);
    
    if(!openAiThreadId){
        const thread = await openai.beta.threads.create();
        openAiThreadId = thread.id;
        addThreadToMap(discordThreadId, openAiThreadId);

        if(message.channel.isThread()){
            const starterMsg = await message.channel.fetchStarterMessage();
            const otherMessagesRaw = await message.channel.messages.fetch();
            const otherMessages = Array.from(otherMessagesRaw.values()).map(msg => msg.content).reverse();
            const messages = [starterMsg.content, ...otherMessages].filter(msg => !!msg && msg !== '');
            await Promise.all(messages.map(msg => addMessage(openAiThreadId, msg)));
            await main()
            messagesLoaded = true;
        }
    }

    if(!messagesLoaded){ 
        await addMessage(openAiThreadId, message.content);
    }

    const run = await openai.beta.threads.runs.create(openAiThreadId, { assistant_id: process.env.ASSISTANT_ID });
    const messages = await openai.beta.threads.messages.list(openAiThreadId);
    let response = messages.data[0].content[0].text.value;
    response = response.substring(0, 1999); // Discord msg length limit

    console.log("Esto es message: ", message.content, "\nEsto es response: ", response)
    message.reply(response);
});

// Authenticate Discord
client.login(process.env.DISCORD_TOKEN);
