/**
 * Configuración e inicialización de la instancia de OpenAI para interactuar con el asistente.
 * @typedef {Object} OpenAIConfig
 * @property {string} apiKey - La clave de API de OpenAI.
 */

/**
 * Función asíncrona que utiliza la API de OpenAI para recuperar un asistente.
 * @async
 * @function openaiFunc
 * @returns {Promise<void>} Una promesa que se resuelve cuando se completa la operación.
 * @throws {Error} Se lanza un error si hay un problema al recuperar el asistente.
 */

// Carga de las variables de entorno desde el archivo .env
require('dotenv').config();

// Creación de una instancia de OpenAI con la clave de API proporcionada
const OpenAI = require('openai').default;
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Llamada a la función que recupera el asistente de OpenAI
async function openaiFunc() {
    try {
        // Recuperación del asistente mediante la API de OpenAI
        const myAssistant = await openai.beta.assistants.retrieve("asst_vQJ29eUwTh8o5ujGe81F7IJz", {
            headers: {
                'OpenAI-Beta': 'assistants=v1'
            }
        });

        // Registro en la consola de que el asistente ha sido recuperado con éxito
        console.log("Asistente recuperado");
    } catch (error) {
        // Manejo de errores en caso de que falle la recuperación del asistente
        console.error("Error al recuperar el asistente:", error);
    }
}

// Llamada a la función principal
openaiFunc();
