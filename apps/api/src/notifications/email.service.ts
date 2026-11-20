import { Injectable, ServiceUnavailableException } from '@nestjs/common'
import nodemailer, { Transporter } from 'nodemailer'

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
})[character]!)

@Injectable()
export class EmailService {
  async sendFirstLoginEmail(email: string, displayName: string) {
    const recipientName = escapeHtml(displayName || 'there')
    await this.transporter().sendMail({
      from: this.fromAddress(),
      to: email,
      subject: 'Welcome to AI Resume Analyzer',
      text: `Hi ${displayName || 'there'},\n\nYour account is ready. You have a 24-hour free trial to explore your resume insights.`,
      html: `<p>Hi ${recipientName},</p><p>Your account is ready. You have a 24-hour free trial to explore your resume insights.</p>`,
    })
  }

  async sendPaymentConfirmation(email: string, displayName: string, planLabel: string, amountRupees: number) {
    const recipientName = escapeHtml(displayName || 'there')
    await this.transporter().sendMail({
      from: this.fromAddress(),
      to: email,
      subject: 'Your AI Resume Analyzer subscription is active',
      text: `Hi ${displayName || 'there'},\n\nYour ${planLabel} subscription payment of INR ${amountRupees} was verified and your subscription is active.`,
      html: `<p>Hi ${recipientName},</p><p>Your <strong>${escapeHtml(planLabel)}</strong> subscription payment of <strong>INR ${amountRupees}</strong> was verified and your subscription is active.</p>`,
    })
  }

  private fromAddress() {
    const from = process.env.SMTP_FROM
    if (!from) throw new ServiceUnavailableException('SMTP_FROM is not configured.')
    return from
  }

  private transporter(): Transporter {
    const host = process.env.SMTP_HOST
    const port = Number(process.env.SMTP_PORT || 587)
    const user = process.env.SMTP_USER
    const password = process.env.SMTP_PASSWORD
    if (!host || !user || !password || !Number.isInteger(port) || port < 1 || port > 65535) {
      throw new ServiceUnavailableException('SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASSWORD must be configured.')
    }
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass: password },
    })
  }
}
