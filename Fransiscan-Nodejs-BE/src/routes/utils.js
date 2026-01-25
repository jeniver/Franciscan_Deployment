const express = require('express');
const router = express.Router();
const MailService = require('../services/MailService');
const { authenticateToken } = require('../middleware/auth');
const { getStats: getCacheStats } = require('../utils/cache');
const logger = require('../utils/logger');

/**
 * @route   POST /api/utils/mail-test
 * @desc    Send a simple email to verify SMTP connectivity
 * @access  Private (JWT required)
 * @body    { to: string, subject?: string, message?: string }
 */
router.post('/mail-test', authenticateToken, async(req, res) => {
  try {
    const { to, subject, message } = req.body || {};

    if (!to || typeof to !== 'string' || !to.trim()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_RECIPIENT',
          message: 'Recipient email (to) is required'
        }
      });
    }

    const trimmedRecipient = to.trim();
    const testSubject = subject && subject.trim()
      ? subject.trim()
      : '[Franciscan] Mail connectivity test';

    const defaultMessage = message && message.trim()
      ? message.trim()
      : 'This is a connectivity test email from the Franciscan backend.';

    const timestamp = new Date().toISOString();

    const result = await MailService.sendMail({
      to: trimmedRecipient,
      subject: testSubject,
      text: `${defaultMessage}\n\nSent at: ${timestamp}`,
      html: `<p>${defaultMessage}</p><p><small>Sent at: ${timestamp}</small></p>`
    });

    if (!result.success) {
      const statusCode = result.skipped ? 503 : 500;
      return res.status(statusCode).json({
        success: false,
        skipped: result.skipped || false,
        error: {
          code: result.skipped ? 'MAIL_NOT_CONFIGURED' : 'MAIL_SEND_FAILED',
          message: result.message || 'Unable to send test email'
        }
      });
    }

    return res.status(200).json({
      success: true,
      message: `Test email sent to ${trimmedRecipient}`,
      timestamp
    });
  } catch (error) {
    logger.error('Mail test endpoint failed:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to send test email'
      }
    });
  }
});

/**
 * @route   GET /api/utils/cache-stats
 * @desc    Get cache statistics for monitoring performance
 * @access  Private (JWT required)
 */
router.get('/cache-stats', authenticateToken, async(req, res) => {
  try {
    const stats = getCacheStats();
    const hitRate = parseFloat(stats.hitRate);
    
    return res.status(200).json({
      success: true,
      data: {
        ...stats,
        hitRate: `${hitRate.toFixed(2)}%`,
        recommendations: {
          hitRate: hitRate < 50 
            ? 'Consider increasing cache TTL or implementing cache warming for common queries'
            : hitRate < 70
            ? 'Cache performance is good. Consider cache warming for further improvement.'
            : 'Cache performance is excellent'
        }
      }
    });
  } catch (error) {
    logger.error('Cache stats endpoint failed:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to retrieve cache statistics'
      }
    });
  }
});

module.exports = router;

