const logger = require('../utils/logger');

/**
 * Invoice Factory
 * Creates invoice objects from different application types
 */
class InvoiceFactory {
    /**
     * Create invoice from Niche Application
     * @param {Object} application - Niche application data
     * @param {Array} items - Invoice items
     * @param {number} userId - User ID
     * @param {number} churchId - Church ID
     * @returns {Object} Invoice data object
     */
    static fromNicheApplication(application, items, userId, churchId) {
        const totalAmount = this.calculateTotal(items);

        return {
            transactionDate: application.AgreementDate || application.AppliedDate || new Date(),
            refDocNumber: application.Code,
            refDocName: 'NAPP',
            customerName: application.ApplicantName || 'Unknown Customer',
            totalAmount: totalAmount,
            payingAmount: totalAmount,
            paymentMode: 'Cash',
            paymentModeDocNo: null,
            taxCode: 'GST',
            taxPercentage: 9,
            taxAmount: this.calculateTaxAmount(items),
            addressNo: application.ApplicantAddressNo || null,
            address: application.ApplicantAddressLine1 || null,
            address2: application.ApplicantAddressLine2 || null,
            addressCity: application.ApplicantAddressCity || null,
            districtCode: application.ApplicantAddressState || null,
            country: application.ApplicantAddressCountry || null,
            nicheApplicationId: application.NicheApplicationId,
            churchId: churchId,
            userId: userId,
            status: 2,
            details: items.map(item => this.createDetail(item, application.Code, 'NAPP'))
        };
    }

    /**
     * Create invoice from Inscription Request
     * @param {Object} inscription - Inscription request data
     * @param {Array} items - Invoice items
     * @param {number} userId - User ID
     * @param {number} churchId - Church ID
     * @returns {Object} Invoice data object
     */
    static fromInscriptionRequest(inscription, items, userId, churchId) {
        const totalAmount = this.calculateTotal(items);

        return {
            transactionDate: new Date(),
            refDocNumber: inscription.Code,
            refDocName: 'INCR',
            customerName: inscription.ApplicantName || 'Unknown Customer',
            totalAmount: totalAmount,
            payingAmount: totalAmount,
            paymentMode: 'Cash',
            paymentModeDocNo: null,
            taxCode: 'GST',
            taxPercentage: 9,
            taxAmount: this.calculateTaxAmount(items),
            addressNo: inscription.ApplicantAddressNo || null,
            address: inscription.ApplicantAddressLine1 || null,
            address2: inscription.ApplicantAddressLine2 || null,
            addressCity: inscription.ApplicantAddressCity || null,
            districtCode: inscription.ApplicantAddressState || null,
            country: inscription.ApplicantAddressCountry || null,
            nicheApplicationId: null,
            churchId: churchId,
            userId: userId,
            status: 2,
            details: items.map(item => this.createDetail(item, inscription.Code, 'INCR'))
        };
    }

    /**
     * Create invoice from Wake Room Booking
     * @param {Object} booking - Wake room booking data
     * @param {Array} items - Invoice items
     * @param {number} userId - User ID
     * @param {number} churchId - Church ID
     * @returns {Object} Invoice data object
     */
    static fromWakeRoomBooking(booking, items, userId, churchId) {
        const totalAmount = this.calculateTotal(items);

        return {
            transactionDate: booking.UsingDate || new Date(),
            refDocNumber: booking.Code,
            refDocName: 'WAPP',
            customerName: booking.ApplicantName || 'Unknown Customer',
            totalAmount: totalAmount,
            payingAmount: totalAmount,
            paymentMode: 'Cash',
            paymentModeDocNo: null,
            taxCode: 'GST',
            taxPercentage: 9,
            taxAmount: this.calculateTaxAmount(items),
            addressNo: booking.ApplicantAddressNo || null,
            address: booking.ApplicantAddressLine1 || null,
            address2: booking.ApplicantAddressLine2 || null,
            addressCity: booking.ApplicantAddressCity || null,
            districtCode: booking.ApplicantAddressState || null,
            country: booking.ApplicantAddressCountry || null,
            nicheApplicationId: null,
            churchId: churchId,
            userId: userId,
            status: 2,
            details: items.map(item => this.createDetail(item, booking.Code, 'WAPP'))
        };
    }

    /**
     * Calculate total amount from items
     * @param {Array} items - Invoice items
     * @returns {number} Total amount
     */
    static calculateTotal(items) {
        if (!items || items.length === 0) return 0;

        return items.reduce((sum, item) => {
            return sum + (item.totalPayingAmount || item.TotalPayingAmount || 0);
        }, 0);
    }

    /**
     * Calculate total tax amount from items
     * @param {Array} items - Invoice items
     * @returns {number} Total tax amount
     */
    static calculateTaxAmount(items) {
        if (!items || items.length === 0) return 0;

        return items.reduce((sum, item) => {
            return sum + (item.lineTaxAmount || item.LineTaxAmount || 0);
        }, 0);
    }

    /**
     * Create invoice detail line
     * @param {Object} item - Item data
     * @param {string} refDocNumber - Reference document number
     * @param {string} refDocName - Reference document name
     * @returns {Object} Invoice detail object
     */
    static createDetail(item, refDocNumber, refDocName) {
        const quantity = item.quantity || item.Quantity || 1;
        const unitAmount = item.unitAmount || item.UnitAmount || 0;
        const lineTotalAmount = item.lineTotalAmount || item.LineTotalAmount || (unitAmount * quantity);
        const lineTaxPercent = item.lineTaxPercent || item.LineTaxPercent || 9;
        const lineTaxAmount = item.lineTaxAmount || item.LineTaxAmount || (lineTotalAmount * (lineTaxPercent / 100));
        const totalPayingAmount = item.totalPayingAmount || item.TotalPayingAmount || (lineTotalAmount + lineTaxAmount);

        return {
            itemId: item.itemId || item.ItemId,
            quantity: quantity,
            unitAmount: unitAmount,
            payingAmount: item.payingAmount || item.PayingAmount || unitAmount,
            totalPayingAmount: totalPayingAmount,
            refDocNumber: refDocNumber,
            refDocName: refDocName,
            refType: refDocName,
            outstandingAmount: item.outstandingAmount || item.OutstandingAmount || 0,
            lineTotalAmount: lineTotalAmount,
            lineTaxPercent: lineTaxPercent,
            lineTaxAmount: lineTaxAmount
        };
    }

    /**
     * Create invoice from custom data
     * @param {Object} data - Custom invoice data
     * @param {Array} items - Invoice items
     * @param {number} userId - User ID
     * @param {number} churchId - Church ID
     * @returns {Object} Invoice data object
     */
    static fromCustomData(data, items, userId, churchId) {
        const totalAmount = data.totalAmount || this.calculateTotal(items);
        const taxAmount = data.taxAmount || this.calculateTaxAmount(items);

        return {
            transactionDate: data.transactionDate || new Date(),
            refDocNumber: data.refDocNumber,
            refDocName: data.refDocName,
            customerName: data.customerName || 'Unknown Customer',
            totalAmount: totalAmount,
            payingAmount: data.payingAmount !== undefined ? data.payingAmount : totalAmount,
            paymentMode: data.paymentMode || 'Cash',
            paymentModeDocNo: data.paymentModeDocNo || null,
            taxCode: data.taxCode || 'GST',
            taxPercentage: data.taxPercentage || 9,
            taxAmount: taxAmount,
            addressNo: data.addressNo || null,
            address: data.address || null,
            address2: data.address2 || null,
            addressCity: data.addressCity || null,
            districtCode: data.districtCode || null,
            country: data.country || null,
            nicheApplicationId: data.nicheApplicationId || null,
            churchId: churchId,
            userId: userId,
            status: 2,
            details: items.map(item => this.createDetail(item, data.refDocNumber, data.refDocName))
        };
    }
}

module.exports = InvoiceFactory;
