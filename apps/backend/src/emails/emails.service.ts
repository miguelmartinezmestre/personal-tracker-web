import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { render } from '@react-email/components';
import { WelcomeEmail } from './welcome-email';

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

  async send() {
    const emailHtml = await render(
      WelcomeEmail({
        username: 'alanturing',
        userImage: 'https://localhost:3000',
        invitedByUsername: 'Alan',
        invitedByEmail: 'alan.turing@example.com',
        teamName: 'Enigma',
        teamImage: 'https://localhost:3000',
        inviteLink: 'https://vercel.com/teams/invite/foo',
        inviteFromIp: '204.13.186.218',
        inviteFromLocation: 'São Paulo, Brazil',
      }),
    );

    const options = {
      from: 'you@example.com',
      to: 'user@gmail.com',
      subject: 'hello world',
      html: emailHtml,
    };

    await this.transporter.sendMail(options);
  }
}
