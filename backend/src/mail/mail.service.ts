import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { Transporter } from 'nodemailer';

type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly configService: ConfigService) {
    const provider = this.configService.get<string>('email.provider') ?? 'console';

    if (provider === 'smtp') {
      const host = this.configService.get<string>('email.smtpHost');
      const port = this.configService.get<number>('email.smtpPort') ?? 587;
      const user = this.configService.get<string>('email.smtpUser');
      const pass = this.configService.get<string>('email.smtpPass');

      if (host && user && pass) {
        this.transporter = nodemailer.createTransport({
          host,
          port,
          secure: port === 465,
          auth: { user, pass },
        });
      } else {
        this.logger.warn('SMTP provider selected but credentials are incomplete. Using console fallback.');
      }
    }
  }

  async sendEmail(input: SendEmailInput) {
    const from = this.configService.get<string>('email.from') ?? 'no-reply@gothyxan.app';

    if (!this.transporter) {
      this.logger.log(
        `[EMAIL:console] to=${input.to} subject=${input.subject} message=${input.text}`,
      );
      return;
    }

    await this.transporter.sendMail({
      from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
  }
}
