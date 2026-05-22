'use node';

import nodemailer from 'nodemailer';
import { getSmtpEmailConfig } from '../../platform/email/config';

export async function sendSmtpEmailJob(args: {
    to: string | string[];
    subject: string;
    text?: string;
    html?: string;
}) {
    const config = getSmtpEmailConfig();
    const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
            user: config.user,
            pass: config.password,
        },
    });

    await transporter.sendMail({
        from: config.from,
        to: args.to,
        subject: args.subject,
        text: args.text,
        html: args.html,
    });

    return { message: 'Email sent successfully' };
}
