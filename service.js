const OracleBot = require('@oracle/bots-node-sdk');
const { response } = require('express');
const { WebhookClient, WebhookEvent } = OracleBot.Middleware;
//const connection = require('./providers/server');

module.exports = (app, connection) => {
  const logger = console;
  let bot = '';
  let input = '';
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
    .on(WebhookEvent.MESSAGE_SENT, message => {
      input = (message);
      logger.info('Message to bot:', message)
      //logger.info("Esto es el texto que regresa", message.messagePayload.text)
    })
    .on(WebhookEvent.MESSAGE_RECEIVED, message => {
      // message was received from bot. forward to messaging client.
      bot = (message);
      logger.info('Message from bot:', message);
      sqlScript()
      //logger.info("Esto es el texto que regresa", message.messagePayload.text)
      // TODO: implement send to client...
    });


  // Create endpoint for bot webhook channel configurtion (Outgoing URI)
  app.post('/bot/message', webhook.receiver());
  
  // Integrate with messaging client according to their specific SDKs, etc.
  app.post('/test/message', (req, res) => {
    const { user, text } = req.body;
    const MessageModel = webhook.MessageModel();
    const message = {
      userId: user,
      messagePayload: MessageModel.textConversationMessage(text)
    };
    // send to bot webhook channel
    webhook.send(message)
      .then(() => res.send('ok'), e => res.status(400).end(e.message));
  });

  function sqlScript(){
    const user = input.userId;
    const text = input.messagePayload.text
    const messageBot = bot.messagePayload.text
    const actions = bot.messagePayload.actions
    //console.log(actions[0].label);
    const sql = 'INSERT INTO Conversacion (idCliente, mensajeUsuario, mensajeBot, fecha, hora) VALUES ( ?, ?, ?, ?, ?)';
    const values = [user, text, messageBot, ( new Date().getFullYear() + "/" + (new Date().getMonth() + 1) + "/" + new Date().getDate() ), (new Date().getHours() + ":" + new Date().getMinutes() + ":" + new Date().getSeconds())];
    connection.query(sql, values, (error, result) => {
      if (error) {
        console.error('Error al insertar datos en la base de datos: ' + error.message);
        //res.status(500).json({ error: 'Error al insertar datos en la base de datos' });
      } else {
        console.log('Datos insertados exitosamente');
        //res.status(200).json({ message: 'Datos insertados exitosamente' });
      }
    });
  }
}