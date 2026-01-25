import React, { useState } from 'react';
import { XIcon, MailIcon, SendIcon, CheckCircleIcon, AlertCircleIcon, Loader2Icon } from 'lucide-react';
import { mailTestService, MailTestResponse } from '../services/mailTestService';

interface MailTestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MailTestModal({ isOpen, onClose }: MailTestModalProps) {
  const [formData, setFormData] = useState({
    to: '',
    subject: 'Mail connectivity test',
    message: 'This is a test email from the Franciscan backend.'
  });
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<MailTestResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const result = await mailTestService.sendTestEmail(formData);
      setResponse(result);
    } catch (err: any) {
      setError(err.message || 'Failed to send test email');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      to: '',
      subject: 'Mail connectivity test',
      message: 'This is a test email from the Franciscan backend.'
    });
    setResponse(null);
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-[#8b2828] to-[#7d1f1f] px-6 py-4 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <MailIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Email Test Tool</h2>
                <p className="text-sm text-white text-opacity-90">Test email connectivity from backend</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Recipient Email */}
              <div>
                <label htmlFor="to" className="block text-sm font-medium text-gray-700 mb-2">
                  Recipient Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="to"
                  value={formData.to}
                  onChange={(e) => setFormData({ ...formData, to: e.target.value })}
                  placeholder="recipient@example.com"
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8b2828] focus:border-transparent"
                  disabled={loading}
                />
              </div>

              {/* Subject */}
              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                  Subject <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Email subject"
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8b2828] focus:border-transparent"
                  disabled={loading}
                />
              </div>

              {/* Message */}
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                  Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Email message content"
                  required
                  rows={5}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8b2828] focus:border-transparent resize-none"
                  disabled={loading}
                />
              </div>

              {/* Success Response */}
              {response && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-green-900 mb-1">Email Sent Successfully!</h4>
                      <p className="text-sm text-green-800 mb-2">{response.message}</p>
                      <p className="text-xs text-green-700">
                        Timestamp: {new Date(response.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Response */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircleIcon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-red-900 mb-1">Error</h4>
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#8b2828] text-white rounded-lg hover:bg-[#7d1f1f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {loading ? (
                    <>
                      <Loader2Icon className="w-5 h-5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <SendIcon className="w-5 h-5" />
                      Send Test Email
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={loading}
                  className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Close
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

