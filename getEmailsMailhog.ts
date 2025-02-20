const axios = require('axios');

// URL de la API de MailHog (por defecto en puerto 8025)
const MAILHOG_API = 'http://localhost:8025/api/v2/messages';

async function getEmails() {
    try {
        const response = await axios.get(MAILHOG_API);
        const emails = response.data.items;

        // Procesar cada correo
        emails.forEach(email => {
            const from = email.Content.Headers.From[0];
            const subject = email.Content.Headers.Subject[0];
            const body = email.Content.Body; // Puede estar en base64

            // Decodificar el cuerpo si está en base64
            const decodedBody = Buffer.from(body, 'base64').toString('utf-8');

            // console.log('De:', from);
            // console.log('Asunto:', subject);
            // console.log('Contenido:', decodedBody);
            // console.log('----------------------------------');
        });
    } catch (error) {
        console.error('Error al obtener correos:', error.message);
    }
}

// Ejecutar la función
getEmails();
