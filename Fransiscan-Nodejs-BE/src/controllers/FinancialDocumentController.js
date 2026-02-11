const BaseController = require('./BaseController');

/**
 * Financial Document Controller Base Class
 * Provides shared functionality for Invoice and Receipt controllers
 */
class FinancialDocumentController extends BaseController {
    constructor() {
        super();
    }

    /**
     * Validate code and authentication parameters
     * @param {Object} req - Express request
     * @param {Object} res - Express response
     * @returns {Object|null} Validated parameters or null if validation fails
     */
    validateCodeAndAuth(req, res) {
        const { code } = req.params;
        const userId = req.user?.userId;
        const churchId = req.user?.churchId;

        if (!code) {
            this.sendError(res, 'Code is required', 400);
            return null;
        }

        if (!userId || !churchId) {
            this.sendError(res, 'Authentication required', 401);
            return null;
        }

        return { code, userId, churchId };
    }

    /**
     * Generic method to get document by code
     * @param {Object} req - Express request
     * @param {Object} res - Express response
     * @param {Object} service - Service instance
     * @param {string} docType - Document type name (for logging)
     * @returns {Promise<void>}
     */
    async getDocumentByCode(req, res, service, docType) {
        const params = this.validateCodeAndAuth(req, res);
        if (!params) return;

        try {
            const result = await service.getByCode(params.code, params.churchId);

            if (!result || !result.success) {
                return this.sendError(res, result?.error?.message || `${docType} not found`, 404);
            }

            return this.sendSuccess(res, result.data, `${docType} retrieved successfully`);
        } catch (error) {
            return this.sendError(res, error.message || `Failed to retrieve ${docType}`, 500);
        }
    }

    /**
     * Validate required fields in request body
     * @param {Object} body - Request body
     * @param {Array<string>} requiredFields - Array of required field names
     * @returns {Object|null} Error object if validation fails, null otherwise
     */
    validateRequiredFields(body, requiredFields) {
        const missingFields = requiredFields.filter(field => !body[field]);

        if (missingFields.length > 0) {
            return {
                code: 'VALIDATION_ERROR',
                message: `Missing required fields: ${missingFields.join(', ')}`
            };
        }

        return null;
    }

    /**
     * Select specific fields from object
     * @param {Object} obj - Source object
     * @param {Array<string>} fields - Fields to select
     * @param {Object} fieldMap - Mapping of API field names to DB field names
     * @returns {Object} Object with only selected fields
     */
    selectFields(obj, fields, fieldMap = {}) {
        const result = {};

        fields.forEach(field => {
            const dbField = fieldMap[field] || field;
            if (obj[dbField] !== undefined) {
                result[field] = obj[dbField];
            }
        });

        return result;
    }
}

module.exports = FinancialDocumentController;
