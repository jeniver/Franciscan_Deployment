import api from './api';
import { invoicePdfService } from './invoicePdfService';

interface SendThankYouEmailParams {
  to: string;
  applicationCode: string;
  applicantName: string;
  invoiceData?: {
    invoiceNo: string;
    invoiceDate: string;
    totalAmount: number;
  };
}

interface SendInvoiceEmailParams {
  to: string;
  applicationCode: string;
  applicantName: string;
  invoiceData: {
    invoiceNo: string;
    invoiceDate: string;
    dueDate: string;
    totalAmount: number;
    nicheAmount: number;
    serviceAmount: number;
    taxAmount: number;
  };
  nicheDetails: {
    nicheCode: string;
    chapel: string;
  };
}

export const applicationEmailService = {
  /**
   * Send thank you email after application creation
   */
  sendThankYouEmail: async (params: SendThankYouEmailParams): Promise<void> => {
    try {
      const emailSubject = `Thank You - Niche Application ${params.applicationCode} Created Successfully`;
      const emailMessage = `Dear ${params.applicantName},

Thank you for submitting your niche application with Franciscan Columbarium.

Your application has been successfully created with the following details:
- Application Code: ${params.applicationCode}
${params.invoiceData ? `- Invoice Number: ${params.invoiceData.invoiceNo}\n- Total Amount: $${params.invoiceData.totalAmount.toLocaleString()}` : ''}

We will review your application and contact you if we need any additional information.

Thank you for choosing Franciscan Columbarium.

Best regards,
Franciscan Columbarium Management Team`;

      await api.post('/api/utils/mail-test', {
        to: params.to,
        subject: emailSubject,
        message: emailMessage
      });
    } catch (error) {
      console.error('Error sending thank you email:', error);
      // Don't throw - email failure shouldn't block the application creation
    }
  },

  /**
   * Send invoice email with PDF attachment (if backend supports it)
   * For now, we'll send a notification email with invoice details
   */
  sendInvoiceEmail: async (params: SendInvoiceEmailParams): Promise<void> => {
    try {
      const emailSubject = `Invoice - Niche Application ${params.applicationCode}`;
      const emailMessage = `Dear ${params.applicantName},

Please find below the invoice details for your niche application:

Application Code: ${params.applicationCode}
Invoice Number: ${params.invoiceData.invoiceNo}
Invoice Date: ${params.invoiceData.invoiceDate}
Due Date: ${params.invoiceData.dueDate}

Niche Details:
- Niche Code: ${params.nicheDetails.nicheCode}
- Chapel: ${params.nicheDetails.chapel}

Payment Summary:
- Niche Reservation Fee: $${params.invoiceData.nicheAmount.toLocaleString()}
- Service Fee: $${params.invoiceData.serviceAmount.toLocaleString()}
- GST (7%): $${params.invoiceData.taxAmount.toLocaleString()}
- Total Amount Due: $${params.invoiceData.totalAmount.toLocaleString()}

You can download the invoice PDF from the application portal.

Thank you for your business.

Best regards,
Franciscan Columbarium Management Team`;

      await api.post('/api/utils/mail-test', {
        to: params.to,
        subject: emailSubject,
        message: emailMessage
      });
    } catch (error) {
      console.error('Error sending invoice email:', error);
      // Don't throw - email failure shouldn't block the application creation
    }
  }
};

export default applicationEmailService;

