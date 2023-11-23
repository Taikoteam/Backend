require('dotenv').config();
const OpenAI = require('openai').default;

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

async function openaiFunc() {
  try {
    const myAssistant = await openai.beta.assistants.retrieve("asst_vQJ29eUwTh8o5ujGe81F7IJz", {
      headers: {
        'OpenAI-Beta': 'assistants=v1'
      }
    });
    console.log("Asistente recuperado");
  } catch (error) {
    console.error("Error al recuperar el asistente:", error);
  }
}

openaiFunc()