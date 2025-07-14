// const axios = require('axios');

// const MAILHOG_API = 'http://localhost:8025/api/v2/messages';

// async function getEmails() {
//     try {
//         const response = await axios.get(MAILHOG_API);
//         const emails = response.data.items;

//         emails.forEach(email => {
//             const from = email.Content.Headers.From[0];
//             const subject = email.Content.Headers.Subject[0];
//             const body = email.Content.Body;

//             const decodedBody = Buffer.from(body, 'base64').toString('utf-8');
//         });
//     } catch (error) {
//         console.error('Error al obtener correos:', error.message);
//     }
// }

// getEmails();
