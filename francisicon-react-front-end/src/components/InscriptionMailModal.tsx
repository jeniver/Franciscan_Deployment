import React, { useState, useEffect } from 'react';
import { XIcon, SendIcon, MailIcon, PaperclipIcon, Loader2Icon, CheckCircle2Icon, AlertCircleIcon } from 'lucide-react';
import inscriptionEmailService from '../services/inscriptionEmailService';

interface InscriptionMailModalProps {
    isOpen: boolean;
    onClose: () => void;
    inscriptionCode: string;
    recipientEmail: string;
    applicantName: string;
    onSuccess?: () => void;
    // This can be passed if we already have the PDF base64 generated
    pdfBase64?: string;
}

export function InscriptionMailModal({
    isOpen,
    onClose,
    inscriptionCode,
    recipientEmail,
    applicantName,
    onSuccess,
    pdfBase64
}: InscriptionMailModalProps) {
    const [to, setTo] = useState(recipientEmail);
    const [subject, setSubject] = useState(`Inscription Agreement - ${inscriptionCode}`);
    const [body, setBody] = useState(`
Dear ${applicantName},

Please find the attached Inscription Agreement for your reference.

Should you have any questions, please do not hesitate to contact us.

Warm regards,
Franciscan Columbarium
  `.trim());

    const [isSending, setIsSending] = useState(false);
    const [sendError, setSendError] = useState<string | null>(null);
    const [isSent, setIsSent] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setTo(recipientEmail);
            setIsSent(false);
            setSendError(null);
        }
    }, [isOpen, recipientEmail]);

    if (!isOpen) return null;

    const handleSend = async () => {
        if (!to) {
            setSendError('Recipient email is required');
            return;
        }

        setIsSending(true);
        setSendError(null);

        try {
            await inscriptionEmailService.sendEmail(inscriptionCode, {
                to,
                subject,
                body: body.replace(/\n/g, '<br/>'),
                attachment: pdfBase64
            });

            setIsSent(true);
            if (onSuccess) onSuccess();

            // Close after a short delay
            setTimeout(() => {
                onClose();
            }, 2000);
        } catch (err: any) {
            setSendError(err.message || 'Failed to send email. Please try again.');
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="bg-gradient-to-r from-[#8b2828] to-[#7d1f1f] px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-white">
                        <MailIcon className="w-6 h-6" />
                        <h2 className="text-xl font-bold font-display">Send Inscription Agreement</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-full transition-all"
                    >
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Form Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {isSent ? (
                        <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                                <CheckCircle2Icon className="w-12 h-12 text-green-600" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900">Email Sent!</h3>
                                <p className="text-gray-500 mt-1">The inscription agreement has been successfully sent to {to}.</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {sendError && (
                                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3">
                                    <AlertCircleIcon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                                    <p className="text-sm font-medium">{sendError}</p>
                                </div>
                            )}

                            <div className="space-y-4">
                                {/* To */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1 ml-1 uppercase tracking-wider">Recipient Email</label>
                                    <input
                                        type="email"
                                        value={to}
                                        onChange={(e) => setTo(e.target.value)}
                                        placeholder="example@email.com"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8b2828]/20 focus:border-[#8b2828] transition-all outline-none"
                                    />
                                </div>

                                {/* Subject */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1 ml-1 uppercase tracking-wider">Subject</label>
                                    <input
                                        type="text"
                                        value={subject}
                                        onChange={(e) => setSubject(e.target.value)}
                                        placeholder="Enter subject line"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8b2828]/20 focus:border-[#8b2828] transition-all outline-none"
                                    />
                                </div>

                                {/* Body */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1 ml-1 uppercase tracking-wider">Message</label>
                                    <textarea
                                        value={body}
                                        onChange={(e) => setBody(e.target.value)}
                                        rows={8}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8b2828]/20 focus:border-[#8b2828] transition-all outline-none resize-none font-sans"
                                    />
                                </div>

                                {/* Attachment Badge */}
                                <div className="flex items-center gap-2 p-3 bg-[#8b2828]/5 border border-[#8b2828]/10 rounded-xl border-dashed">
                                    <PaperclipIcon className="w-4 h-4 text-[#8b2828]" />
                                    <span className="text-sm font-medium text-gray-700">Inscription-Agreement-{inscriptionCode}.pdf</span>
                                    {!pdfBase64 && (
                                        <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold uppercase ml-auto">
                                            Auto-Generated
                                        </span>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                {!isSent && (
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
                        <button
                            onClick={onClose}
                            disabled={isSending}
                            className="px-6 py-2.5 text-gray-600 font-semibold hover:bg-gray-100 rounded-xl transition-all disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSend}
                            disabled={isSending}
                            className="px-8 py-2.5 bg-gradient-to-r from-[#8b2828] to-[#7d1f1f] text-white font-bold rounded-xl shadow-lg shadow-[#8b2828]/20 hover:shadow-xl hover:shadow-[#8b2828]/30 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSending ? (
                                <>
                                    <Loader2Icon className="w-5 h-5 animate-spin" />
                                    <span>Sending...</span>
                                </>
                            ) : (
                                <>
                                    <SendIcon className="w-5 h-5" />
                                    <span>Send Email</span>
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
