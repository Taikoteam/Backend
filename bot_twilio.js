const { OpenAI } = require("openai");
const twilio = require('twilio');
require("dotenv").config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const threadMap = {};
const getOpenAiThreadId = (senderId) => threadMap[senderId];
const addThreadToMap = (senderId, openAiThreadId) => {
    console.log(`Adding thread: ${openAiThreadId} for sender: ${senderId}`);
    threadMap[senderId] = openAiThreadId;
};

const terminalStates = ["cancelled", "failed", "completed", "expired"];
const statusCheckLoop = async (openAiThreadId, runId) => {
    console.log(`Checking status for thread: ${openAiThreadId}, run: ${runId}`);
    const run = await openai.beta.threads.runs.retrieve(openAiThreadId, runId);

    if (terminalStates.indexOf(run.status) < 0) {
        await sleep(1000);
        return statusCheckLoop(openAiThreadId, runId);
    }

    console.log(`Run ${runId} completed with status: ${run.status}`);
    return run.status;
};

const addMessage = (threadId, content) => {
    console.log(`Adding message to thread: ${threadId}`);
    return openai.beta.threads.messages.create(threadId, { role: "user", content });
};

const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

async function handleSms(req, res) {
    console.log("Received SMS");
    const incomingMsg = req.body.Body;
    const senderId = req.body.From;
    let openAiThreadId = getOpenAiThreadId(senderId);

    if (!openAiThreadId) {
        console.log(`Creating new thread for sender: ${senderId}`);
        const thread = await openai.beta.threads.create();
        openAiThreadId = thread.id;
        addThreadToMap(senderId, openAiThreadId);
    }

    await addMessage(openAiThreadId, incomingMsg);

    console.log(`Creating run for thread: ${openAiThreadId}`);
    const run = await openai.beta.threads.runs.create(openAiThreadId, { assistant_id: process.env.ASSISTANT_ID });

    const status = await statusCheckLoop(openAiThreadId, run.id);
    const messages = await openai.beta.threads.messages.list(openAiThreadId);
    let response = messages.data[0].content[0].text.value;
    response = response.substring(0, 1600); // Limit for SMS length

    console.log(`Sending response: ${response}`);
    const twilioClient = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    twilioClient.messages.create({
        body: response,
        from: 'whatsapp:+14155238886', // Tu número de Twilio para WhatsApp
        to: senderId // El número que envió el mensaje a tu Twilio
    }).then(message => console.log(`Message sent with SID: ${message.sid}`))
    .catch(error => console.error(`Error sending message: ${error}`));

    res.status(200).end();
}

module.exports = { handleSms };
