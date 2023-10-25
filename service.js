const OracleBot = require('@oracle/bots-node-sdk');
const { response } = require('express');
const { WebhookClient, WebhookEvent } = OracleBot.Middleware;
//const connection = require('./providers/server');

module.exports = (app, connection) => {
  const logger = console;
  // initialize the application with OracleBot
  OracleBot.init(app, {
    logger,
  });

  // add webhook integration
  const webhook = new WebhookClient({
    channel: {
      url: process.env.BOT_WEBHOOK_URL,
      secret: process.env.BOT_WEBHOOK_SECRET,
    }
  });
  // Add webhook event handlers (optional)
  webhook
    .on(WebhookEvent.ERROR, err => logger.error('Error:', err.message))
    .on(WebhookEvent.MESSAGE_SENT, message => logger.info('Message to bot:', message))
    .on(WebhookEvent.MESSAGE_RECEIVED, message => {
      // message was received from bot. forward to messaging client.
      logger.info('Message from bot:', message);
      // TODO: implement send to client...
    });

  // Create endpoint for bot webhook channel configurtion (Outgoing URI)
  // NOTE: webhook.receiver also supports using a callback as a replacement for WebhookEvent.MESSAGE_RECEIVED.
  //  - Useful in cases where custom validations, etc need to be performed.
  /* app.post('/bot/message', webhook.receiver())
  .then((result) => {
    console.log(result);
  })
  .catch((error) => {
    console.error(error);
  }); */
  app.post('/bot/message', (req, res) => {
    // Aquí puedes manejar la solicitud POST
    // Puedes acceder a los datos de la solicitud a través de req.body, req.params, req.query, etc.
    // Por ejemplo, para acceder al cuerpo de la solicitud POST, puedes usar req.body
    console.log("PRUEBA",req.body.messagePayload.text);
    // Realiza algún procesamiento y envía una respuesta
    const responseData = { message: 'Respuesta del servidor' };
    res.json(responseData);
  });
  

console.log(new Date().getDate() + "/" + (new Date().getMonth() + 1) + "/" + new Date().getFullYear() );
console.log(new Date().getHours() + ":" + new Date().getMinutes() + ":" + new Date().getSeconds() );
  // Integrate with messaging client according to their specific SDKs, etc.
  app.post('/test/message', (req, res) => {
    const { user, text } = req.body;
    
    const sql = 'INSERT INTO Conversacion (idCliente, mensajeUsuario, fecha, hora) VALUES ( ?, ?, ?, ?)';
    const values = [user, text, ( new Date().getFullYear() + "/" + (new Date().getMonth() + 1) + "/" + new Date().getDate() ), (new Date().getHours() + ":" + new Date().getMinutes() + ":" + new Date().getSeconds())];

    connection.query(sql, values, (error, result) => {
      if (error) {
        console.error('Error al insertar datos en la base de datos: ' + error.message);
        res.status(500).json({ error: 'Error al insertar datos en la base de datos' });
      } else {
        console.log('Datos insertados exitosamente');
        res.status(200).json({ message: 'Datos insertados exitosamente' });
      }
    });
    const MessageModel = webhook.MessageModel();
    const message = {
      userId: user,
      messagePayload: MessageModel.textConversationMessage(text)
    };
    // send to bot webhook channel
    webhook.send(message)
      .then(() => res.send('ok'), e => res.status(400).end(e.message));
  });
}