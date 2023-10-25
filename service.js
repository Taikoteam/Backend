const OracleBot = require('@oracle/bots-node-sdk');
const { response } = require('express');
const { WebhookClient, WebhookEvent } = OracleBot.Middleware;

module.exports = (app) => {
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
  


  // Integrate with messaging client according to their specific SDKs, etc.
  app.post('/test/message', (req, res) => {
    const { user, text } = req.body;
    // construct message to bot from the client message format
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