import RegisterEmail from '@/emails/confirm-email';
import RecoverPasswordEmail from '@/emails/recover-password';
import { render } from '@react-email/components';
import * as nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: 'localhost',
    port: 1025,
    secure: false,
    auth: {
        user: 'user',
        pass: 'password',
    },
});

export async function sendWelcomeEmail(username: string, email: string) {
    const emailHtml = await render(
        RegisterEmail({
            username,
        }),
    );

    const options = {
        from: 'you@example.com',
        to: email,
        subject: `Welcome ${username}`,
        html: emailHtml,
    };

    await transporter.sendMail(options);
}

export async function sendRecoverPasswordEmail(
    username: string,
    email: string,
    link: string,
) {
    const emailHtml = await render(
        RecoverPasswordEmail({
            username,
            link,
        }),
    );

    const options = {
        from: 'you@example.com',
        to: email,
        subject: `Recuperar contraseña en Metricas`,
        html: emailHtml,
    };

    await transporter.sendMail(options);
}