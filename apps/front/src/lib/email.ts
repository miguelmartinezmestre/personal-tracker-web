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

    // Log email instead of sending in development
    console.log('='.repeat(80));
    console.log('📧 EMAIL WOULD BE SENT:');
    console.log('To:', email);
    console.log('Subject:', options.subject);
    console.log('HTML Content:', emailHtml);
    console.log('='.repeat(80));

    // Uncomment to actually send email:
    // await transporter.sendMail(options);
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

    // Log email instead of sending in development
    console.log('='.repeat(80));
    console.log('📧 EMAIL WOULD BE SENT:');
    console.log('To:', email);
    console.log('Subject:', options.subject);
    console.log('Reset Link:', link);
    console.log('HTML Content:', emailHtml);
    console.log('='.repeat(80));

    // Uncomment to actually send email:
    // await transporter.sendMail(options);
}