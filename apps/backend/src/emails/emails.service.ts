import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { render } from '@react-email/components';
import { RegisterEmail } from './emails/register-email';
import RecoverPasswordEmail from './emails/recover-password';

@Injectable()
export class EmailsService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: 'localhost',
      port: 1025,
      secure: false,
      auth: {
        user: 'user',
        pass: 'password',
      },
    });
  }

  async sendWelcomeEmail(username: string, email: string) {
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

    await this.transporter.sendMail(options);
  }

  async sendRecoverPasswordEmail(username: string, email: string, link: string) {
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

    await this.transporter.sendMail(options);
  }
}
