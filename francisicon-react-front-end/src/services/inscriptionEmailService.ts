import api from './api';

export interface InscriptionEmailData {
    to: string;
    subject?: string;
    body?: string;
    attachment?: string; // base64 PDF
}

class InscriptionEmailService {
    /**
     * Send inscription agreement via email
     * @param inscriptionCode - Inscription request code
     * @param emailData - Email data including optional attachment
     * @returns Promise with result
     */
    async sendEmail(inscriptionCode: string, emailData: InscriptionEmailData) {
        try {
            const response = await api.post(`/api/inscription-agreements/${encodeURIComponent(inscriptionCode)}/send-email`, emailData);
            return response.data;
        } catch (error: any) {
            console.error('Error sending inscription email:', error);
            throw error.response?.data || new Error('Failed to send email');
        }
    }
}

export default new InscriptionEmailService();
