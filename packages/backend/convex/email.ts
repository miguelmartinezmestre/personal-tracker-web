// import * as nodemailer from 'nodemailer';

// type SendEmailArgs = {
//     to: string;
//     subject: string;
//     text?: string;
//     html?: string;
// };

// function getSmtpConfig() {
//     const host = process.env.SMTP_HOST;
//     const portRaw = process.env.SMTP_PORT;
//     const port = portRaw ? Number(portRaw) : undefined;
//     const secure = process.env.SMTP_SECURE === 'true' || port === 465;
//     const user = process.env.SMTP_USER;
//     const pass = process.env.SMTP_PASS;
//     const from = process.env.EMAIL_FROM ?? 'no-reply@metricas.local';

//     return { host, port, secure, user, pass, from };
// }

// export async function sendEmail({ to, subject, text, html }: SendEmailArgs): Promise<void> {
//     const { host, port, secure, user, pass, from } = getSmtpConfig();

//     if (!host || !port) {
//         // In dev/test environments we allow running without SMTP configured.
//         if (process.env.NODE_ENV !== 'production') {
//             console.warn('[email] SMTP not configured (SMTP_HOST/SMTP_PORT). Email not sent:', {
//                 to,
//                 subject,
//             });
//         }
//         return;
//     }

//     const transporter = nodemailer.createTransport({
//         host,
//         port,
//         secure,
//         auth: user && pass ? { user, pass } : undefined,
//     });

//     await transporter.sendMail({
//         from,
//         to,
//         subject,
//         text,
//         html,
//     });
// }
