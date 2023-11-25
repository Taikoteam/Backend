const { Client, GatewayIntentBits } = require('discord.js');
const { OpenAI } = require("openai");
const connection = require('./providers/server');
require("dotenv").config();


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
        const clienteId = 1
        console.log("Si estoy entrando a hacer el query")
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

async function getDisponibilityProduct(nombre_producto){
    console.log(`Consultando la disponibilidad del producto: ${nombre_producto}`);
    return new Promise((resolve, reject) => {
        console.log("Estoy haciendo un nuevo query")
        connection.query('SELECT P.Pk_Id, P.Disponibilidad FROM Producto AS P WHERE P.Nombre = ?;',
        [nombre_producto],
        (error, results, fields) => {
            if (error) {
                console.error('Error en la consulta a la base de datos:', error);
                reject(error);
            } else {
                console.log('Resultados de la consulta:', results[0]);
                resolve(results.length > 0 ? results[0] : null);
            }
        }
        )
    })
}

async function RealizarPedido(){
    const Cliente_Id = 1;
    const Fecha = '2023-11-22';
    console.log(`Realizando un nuevo pedido para el cliente`);
    return new Promise((resolve, reject) => {
        console.log("Estoy haciendo un nuevo query");

        connection.query(
        'INSERT INTO Pedido (Cliente_Id, Fecha) VALUES (?, ?);',
        [Cliente_Id, Fecha],
        (error, results, fields) => {
            if (error) {
                console.error('Error en la consulta a la base de datos:', error);
                reject(error);
            } else {
                console.log('Pedido realizado con éxito. ID del pedido:', results.insertId);
                resolve(results);
        }
      }
    );
  });
}

async function RealizarEnvio(Direccion){
    const Id_Tipo_Envio = Math.floor(Math.random() * 3) + 1;
    const Id_tipo_contenedor = Math.floor(Math.random() * 7) + 1;
    const Fecha = '2023-11-23'
    console.log(`Realizando un nuevo envio para el cliente`);
    return new Promise((resolve, reject) => {
        console.log("Estoy haciendo un nuevo query");

        connection.query(
        'INSERT INTO Envio (Id_Tipo_Envio, Id_tipo_contenedor, Direccion, Fecha_Envio) VALUES (?, ?, ?, ?);',
        [Id_Tipo_Envio, Id_tipo_contenedor, Direccion, Fecha],
        (error, results, fields) => {
            if (error) {
                console.error('Error en la consulta a la base de datos:', error);
                reject(error);
            } else {
                console.log('Pedido realizado con éxito. ID del pedido:', results.insertId);
                resolve(results);
        }
      }
    );
  });
}

async function ObtenerIdPedido(){
    return new Promise((resolve, reject) => {
        console.log("Estoy haciendo un nuevo query");
    
        connection.query(
          'SELECT Pedido_Id FROM Detalles_Pedido ORDER BY Pedido_Id DESC LIMIT 1;',
          (error, results, fields) => {
            if (error) {
              console.error('Error en la consulta a la base de datos:', error);
              reject(error);
            } else {
              console.log('Último pedido obtenido con éxito:', results[0]);
              resolve(results.length > 0 ? results[0] : null);
            }
          }
        );
      });
}

async function ObtenerUltimoPedido() {
    return new Promise((resolve, reject) => {
      console.log("Estoy haciendo un nuevo query");
  
      connection.query(
        'SELECT Id FROM Pedido ORDER BY Id DESC LIMIT 1;',
        (error, results, fields) => {
          if (error) {
            console.error('Error en la consulta a la base de datos:', error);
            reject(error);
          } else {
            console.log('Último pedido obtenido con éxito:', results[0]);
            resolve(results.length > 0 ? results[0] : null);
          }
        }
      );
    });
  }

  async function ObtenerUltimoEnvio() {
    return new Promise((resolve, reject) => {
      console.log("Estoy haciendo un nuevo query");
  
      connection.query(
        'SELECT Id FROM Envio ORDER BY Id DESC LIMIT 1;',
        (error, results, fields) => {
          if (error) {
            console.error('Error en la consulta a la base de datos:', error);
            reject(error);
          } else {
            console.log('Último pedido obtenido con éxito:', results[0]);
            resolve(results.length > 0 ? results[0] : null);
          }
        }
      );
    });
  }

async function RealizarDetalles(Id, cantidad){
    const Pedido_id = await ObtenerUltimoPedido()
    const Envio_id = await ObtenerUltimoEnvio()
    const estatus = 'En ruta'
    console.log(`Realizando un nuevo detallesPedido para el cliente`);
    return new Promise((resolve, reject) => {
        console.log("Estoy haciendo un nuevo query");

        connection.query(
        'INSERT INTO Detalles_Pedido (Producto_Id, Pedido_Id, Cantidades, Envio_Id) VALUES (?, ?, ?, ?);',
        [Id, Pedido_id.Id, cantidad, Envio_id.Id, estatus],
        (error, results, fields) => {
            if (error) {
                console.error('Error en la consulta a la base de datos:', error);
                reject(error);
            } else {
                console.log('Pedido realizado con éxito. ID del pedido:', results.insertId);
                resolve(results);
        }
      }
    );
  });
}

function esConsultaDePedido(mensaje) {
    return mensaje.toLowerCase().startsWith("estatus del pedido");
}

function esRealizarPedido(mensaje){
    return mensaje.toLowerCase().startsWith("quiero hacer un pedido");
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
        userStates[channelId] = { awaitingOrderNumber: false, awaitingDataPedido: false };
    }
    console.log(message.content);
    if (esConsultaDePedido(message.content) && !userStates[channelId].awaitingOrderNumber && !userStates[channelId].awaitingDataPedido) {
        userStates[channelId].awaitingOrderNumber = true;
        userStates[channelId].awaitingDataPedido = false;
        message.reply("Por favor, envíame el número de tu pedido.");
        return;
    }
    else if (esRealizarPedido(message.content) && !userStates[channelId].awaitingOrderNumber && !userStates[channelId].awaitingDataPedido){
        userStates[channelId].awaitingOrderNumber = false;
        userStates[channelId].awaitingDataPedido = true;
        message.reply("Escribe que quieres ordenar en el siguiente orden y separado por punto y coma (;): Nombre del producto, cantidad, direccion de envio");
        return;
    }

    if (userStates[channelId].awaitingOrderNumber) {
        const orderNumber = message.content.trim();
        userStates[channelId].awaitingOrderNumber = false; // Resetear el estado

        try {
            const status = await getStatusOfOrder(orderNumber);
            console.log(status)
            let reply;
            if (status) {
                reply = `El estatus de la orden ${orderNumber} de ${status.Cantidades} pz de ${status.Nombre_Producto}, enviado a ${status.Direccion_de_Envio} es: ${status.Estatus}`;
            } else {
                reply = `Lo siento, no pude encontrar información sobre el pedido número ${orderNumber}.`;
            }
            userStates[channelId] = { awaitingOrderNumber: false, awaitingDataPedido: false };
            message.reply(reply);
        } catch (error) {
            console.error('Error al consultar la base de datos:', error);
            message.reply('Hubo un error al procesar tu solicitud.');
        }
        return;
    }

    else if (userStates[channelId].awaitingDataPedido){
        try{const detallesPedido = message.content
            var especificaciones = detallesPedido.split("; ");
            const nombre_producto = especificaciones[0];
            const direccion = especificaciones[2];
            const cantidad = parseInt(especificaciones[1], 10);
            // [ 'Pelota de perro', 5, 'Ciudad A Calle B' ]
            const disponibilidad = await getDisponibilityProduct(nombre_producto)
            
            if (disponibilidad === null){
                reply = `Lo siento, pero creo que el producto que quieres no existe en nuestra tienda o no seguiste el formato solicitado`
                userStates[channelId].awaitingOrderNumber = false;
                userStates[channelId].awaitingDataPedido = true;
            }
            else if (disponibilidad.Disponibilidad === 1){
                console.log(disponibilidad.Pk_Id)
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

            message.reply(reply);
            userStates[channelId] = { awaitingOrderNumber: false, awaitingDataPedido: false };
        }
        catch (error){
            console.error('Error al consultar la base de datos:', error);
            message.reply('Hubo un error al procesar tu solicitud.');
        }
        return;
        
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
            messagesLoaded = true;
        }
    }

    if(!messagesLoaded){ 
        await addMessage(openAiThreadId, message.content);
    }

    const run = await openai.beta.threads.runs.create(openAiThreadId, { assistant_id: process.env.ASSISTANT_ID });
    const status = await statusCheckLoop(openAiThreadId, run.id);
    const messages = await openai.beta.threads.messages.list(openAiThreadId);
    let response = messages.data[0].content[0].text.value;
    response = response.substring(0, 1999); // Discord msg length limit

    console.log(response);
    console.log("Esto es message: ", message.content, "\nEsto es response: ", response)
    message.reply(response);
});

// Authenticate Discord
client.login(process.env.DISCORD_TOKEN);