const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

class MailService {
  constructor() {
    this.transporter = null;
    this.configured = false;
  }

  _ensureTransporter() {
    if (this.transporter) {
      return;
    }

    const {
      MAIL_HOST,
      MAIL_PORT,
      MAIL_SECURE,
      MAIL_USER,
      MAIL_PASSWORD,
      MAIL_FROM,
      MAIL_FROM_NAME,
      MAIL_REQUIRE_TLS,
      MAIL_IGNORE_TLS
    } = process.env;

    if (!MAIL_HOST || !MAIL_FROM) {
      logger.warn('Mail service not configured – missing MAIL_HOST or MAIL_FROM. Email notifications disabled.');
      return;
    }

    try {
      const port = MAIL_PORT ? parseInt(MAIL_PORT, 10) : 587;
      const secure = MAIL_SECURE === 'true' || port === 465;

      this.transporter = nodemailer.createTransport({
        host: MAIL_HOST,
        port,
        secure,
        requireTLS: MAIL_REQUIRE_TLS === 'true',
        ignoreTLS: MAIL_IGNORE_TLS === 'true',
        auth: MAIL_USER && MAIL_PASSWORD ? {
          user: MAIL_USER,
          pass: MAIL_PASSWORD
        } : undefined,
        tls: {
          // Allow opting out of strict cert checking in development
          rejectUnauthorized: MAIL_REQUIRE_TLS === 'true'
        }
      });
      this.configured = true;

      // Verify connection in background; don't throw to callers
      Promise.resolve().then(() => this.transporter.verify())
        .then(() => {
          logger.info('Mail transporter verified and ready');
        })
        .catch((verifyError) => {
          logger.warn('Mail transporter verification failed:', {
            message: verifyError?.message,
            code: verifyError?.code,
            response: verifyError?.response
          });
        });
    } catch (error) {
      logger.error('Failed to initialize mail transporter:', error.message);
      this.transporter = null;
      this.configured = false;
    }
  }

  async sendMail({ to, subject, text, html, attachments }) {
    this._ensureTransporter();

    if (!this.transporter) {
      return {
        success: false,
        skipped: true,
        message: 'Mail transporter not configured'
      };
    }

    if (!to) {
      throw new Error('Recipient email address is required');
    }

    try {
      const fromHeader = (process.env.MAIL_FROM_NAME && process.env.MAIL_FROM)
        ? `"${process.env.MAIL_FROM_NAME}" <${process.env.MAIL_FROM}>`
        : process.env.MAIL_FROM;

      const info = await this.transporter.sendMail({
        from: fromHeader,
        to,
        subject,
        text,
        html,
        attachments: attachments && attachments.length > 0 ? attachments : undefined
      });

      return {
        success: true,
        messageId: info?.messageId
      };
    } catch (error) {
      logger.error('Failed to send email:', {
        message: error?.message,
        code: error?.code,
        response: error?.response
      });
      return {
        success: false,
        skipped: false,
        message: error?.message || 'Failed to send email'
      };
    }
  }

  async sendNicheBookingConfirmation({
    recipientEmail,
    booking,
    application,
    contact,
    nominee
  }) {
    if (!recipientEmail) {
      return {
        success: false,
        skipped: true,
        message: 'Recipient email not provided'
      };
    }

    const subject = `Niche Booking Confirmation - ${booking.code}`;
    const contactName = contact?.name || 'Valued Member';

    const lines = [
      `Dear ${contactName},`,
      '',
      'Your niche booking has been successfully created. Below are the booking details:',
      '',
      `Booking Code: ${booking.code}`,
      `Booked Date: ${booking.bookedDate?.toISOString?.() || booking.bookedDate}`,
      `Application Code: ${application?.code || 'N/A'}`,
      `Niche Code: ${application?.niche?.code || 'N/A'}`,
      nominee?.name ? `Beneficiary/Nominee: ${nominee.name}` : null,
      '',
      'Thank you for choosing Franciscan Columbarium.'
    ].filter(Boolean);

    const textBody = lines.join('\n');

    const htmlBody = `
      <p>Dear ${contactName},</p>
      <p>Your niche booking has been successfully created. Below are the booking details:</p>
      <ul>
        <li><strong>Booking Code:</strong> ${booking.code}</li>
        <li><strong>Booked Date:</strong> ${booking.bookedDate?.toISOString?.() || booking.bookedDate}</li>
        <li><strong>Application Code:</strong> ${application?.code || 'N/A'}</li>
        <li><strong>Niche Code:</strong> ${application?.niche?.code || 'N/A'}</li>
        ${nominee?.name ? `<li><strong>Beneficiary/Nominee:</strong> ${nominee.name}</li>` : ''}
      </ul>
      <p>Thank you for choosing Franciscan Columbarium.</p>
    `;

    return this.sendMail({
      to: recipientEmail,
      subject,
      text: textBody,
      html: htmlBody
    });
  }

  async sendNicheApplicationAcknowledgement({
    recipientEmail,
    application,
    invoicePath,
    invoiceFileName
  }) {
    if (!recipientEmail) {
      return {
        success: false,
        skipped: true,
        message: 'Recipient email not provided'
      };
    }

    const applicantName = application?.applicant?.name || application?.applicantName || 'Applicant';
    const subjectSuffix = application?.code || application?.applicationNumber ? ` ${application.code || application.applicationNumber}` : '';
    const subject = `Niche Application${subjectSuffix} - Invoice & Next Steps`;
    const nicheCode = application?.nicheDetails?.nicheCode || application?.niche?.code || application?.nicheCode || 'N/A';
    const chapelName = application?.nicheDetails?.chapel || application?.nicheDetails?.chapelName || application?.niche?.chapelName || 'Franciscan Columbarium';
    const amount = application?.nicheDetails?.amount || application?.niche?.amount || application?.amount || application?.niche?.totalAmount || '0.00';
    const applicationCode = application?.code || application?.applicationNumber || 'N/A';

    const greetingName = applicantName || 'Applicant';

    const textLines = [
      `Dear ${greetingName},`,
      '',
      'Thank you for submitting your niche application with Franciscan Columbarium.',
      `Application Number: ${applicationCode}`,
      `Niche: ${nicheCode}`,
      `Chapel: ${chapelName}`,
      `Amount: ${amount}`,
      '',
      'Attached to this email you will find the provisional invoice for your records.',
      'Our team will reach out if any further information is required.',
      '',
      'Warm regards,',
      'Franciscan Columbarium'
    ];

    const htmlBody = `
      <p>Dear ${greetingName},</p>
      <p>Thank you for submitting your niche application with Franciscan Columbarium.</p>
      <p>
        <strong>Application Number:</strong> ${applicationCode}<br/>
        <strong>Niche:</strong> ${nicheCode}<br/>
        <strong>Chapel:</strong> ${chapelName}<br/>
        <strong>Amount:</strong> ${amount}
      </p>
      <p>The provisional invoice has been attached for your reference.</p>
      <p>Our team will reach out if any further information is required.</p>
      <p>Warm regards,<br/>Franciscan Columbarium</p>
    `;

    const attachments = [];
    if (invoicePath) {
      attachments.push({
        filename: invoiceFileName || invoicePath.split(/[\\/]/).pop(),
        path: invoicePath
      });
    }

    return this.sendMail({
      to: recipientEmail,
      subject,
      text: textLines.join('\n'),
      html: htmlBody,
      attachments
    });
  }
}

module.exports = new MailService();
