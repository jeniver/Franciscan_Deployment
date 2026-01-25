const { executeQuery, executeProcedure } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Report Repository
 * Handles all database operations for reports using stored procedures
 */
class ReportRepository {
  /**
   * Get Beneficiary List
   * @returns {Promise<Array>} Beneficiary list data
   */
  async getBeneficiaryList() {
    try {
      // Increase timeout for BeneficeryList as it can be a large dataset
      const result = await executeProcedure('BeneficeryList', {}, { timeout: 120000 }); // 2 minutes
      return result.recordset || [];
    } catch (error) {
      logger.error('Error executing BeneficeryList stored procedure:', error);
      throw error;
    }
  }

  /**
   * Get Chapel Level List
   * @param {string} chapel - Chapel code
   * @param {string} level - Level number
   * @returns {Promise<Array>} Chapel level list data
   */
  async getChapelLevelList(chapel, level) {
    try {
      const result = await executeProcedure('ChapelLevelList', {
        chapel: chapel || null,
        level: level || null
      });
      return result.recordset || [];
    } catch (error) {
      logger.error('Error executing ChapelLevelList stored procedure:', error);
      throw error;
    }
  }

  /**
   * Get Chapel Month List
   * @param {string} chapel - Chapel code
   * @param {number} month - Month number
   * @returns {Promise<Array>} Chapel month list data
   */
  async getChapelMonthList(chapel, month) {
    try {
      const result = await executeProcedure('ChapelMonthList', {
        chapel: chapel || null,
        month: month || null
      });
      return result.recordset || [];
    } catch (error) {
      logger.error('Error executing ChapelMonthList stored procedure:', error);
      throw error;
    }
  }

  /**
   * Get GOA Monthly List
   * @param {Date} fromDate - Start date
   * @param {Date} toDate - End date
   * @returns {Promise<Array>} GOA monthly list data
   */
  async getGOAMonthlyList(fromDate, toDate) {
    try {
      const result = await executeProcedure('GOAMonthlyList', {
        FromDate: fromDate || null,
        ToDate: toDate || null
      });
      return result.recordset || [];
    } catch (error) {
      logger.error('Error executing GOAMonthlyList stored procedure:', error);
      throw error;
    }
  }

  /**
   * Get Inscription Monthly List
   * @param {Date} fromDate - Start date
   * @param {Date} toDate - End date
   * @returns {Promise<Array>} Inscription monthly list data
   */
  async getInscriptionMonthlyList(fromDate, toDate) {
    try {
      const result = await executeProcedure('InscriptionMonthlyList', {
        FromDate: fromDate || null,
        ToDate: toDate || null
      });
      return result.recordset || [];
    } catch (error) {
      logger.error('Error executing InscriptionMonthlyList stored procedure:', error);
      throw error;
    }
  }

  /**
   * Get Niche Booking Master
   * @param {Object} params - Query parameters
   * @returns {Promise<Array>} Niche booking master data
   */
  async getNicheBookingMaster(params = {}) {
    try {
      const result = await executeProcedure('NicheBookingMaster', params);
      return result.recordset || [];
    } catch (error) {
      logger.error('Error executing NicheBookingMaster stored procedure:', error);
      throw error;
    }
  }

  /**
   * Get Niches Sold To Both (Catholic and Non-Catholic)
   * @returns {Promise<Array>} Niches sold to both list
   */
  async getNichesSoldToBoth() {
    try {
      const result = await executeProcedure('NicheListSoldToBoth');
      return result.recordset || [];
    } catch (error) {
      logger.error('Error executing NicheListSoldToBoth stored procedure:', error);
      throw error;
    }
  }

  /**
   * Get Niches Sold To Catholic
   * @returns {Promise<Array>} Niches sold to Catholic list
   */
  async getNichesSoldToCatholic() {
    try {
      const result = await executeProcedure('NicheListSoldToCatholic');
      return result.recordset || [];
    } catch (error) {
      logger.error('Error executing NicheListSoldToCatholic stored procedure:', error);
      throw error;
    }
  }

  /**
   * Get Niches Sold To Non-Catholic
   * @returns {Promise<Array>} Niches sold to non-Catholic list
   */
  async getNichesSoldToNonCatholic() {
    try {
      const result = await executeProcedure('NicheListSoldToNonCatholic');
      return result.recordset || [];
    } catch (error) {
      logger.error('Error executing NicheListSoldToNonCatholic stored procedure:', error);
      throw error;
    }
  }

  /**
   * Get Receipt Report Data
   * @param {Date} fromDate - Start date
   * @param {Date} toDate - End date
   * @returns {Promise<Array>} Receipt report data
   */
  async getReceiptReport(fromDate, toDate) {
    try {
      const result = await executeProcedure('ReceiptReport', {
        FromDate: fromDate || null,
        ToDate: toDate || null
      });
      return result.recordset || [];
    } catch (error) {
      logger.error('Error executing ReceiptReport stored procedure:', error);
      throw error;
    }
  }

  /**
   * Get Renewal Niche List
   * @returns {Promise<Array>} Renewal niche list
   */
  async getRenewalNicheList() {
    try {
      const result = await executeProcedure('RenewalNicheList');
      return result.recordset || [];
    } catch (error) {
      logger.error('Error executing RenewalNicheList stored procedure:', error);
      throw error;
    }
  }

  /**
   * Get Same Address Niches List
   * @returns {Promise<Array>} Same address niches list
   */
  async getSameAddressNichesList() {
    try {
      const result = await executeProcedure('SameAddressNichesList');
      return result.recordset || [];
    } catch (error) {
      logger.error('Error executing SameAddressNichesList stored procedure:', error);
      throw error;
    }
  }

  /**
   * Get Vacancy Chapel List
   * @param {string} chapel - Chapel code (optional)
   * @returns {Promise<Array>} Vacancy chapel list
   */
  async getVacancyChapelList(chapel = null) {
    try {
      const result = await executeProcedure('VacancyChapelList', {
        chapel: chapel || null
      });
      return result.recordset || [];
    } catch (error) {
      logger.error('Error executing VacancyChapelList stored procedure:', error);
      throw error;
    }
  }

  /**
   * Get Vacancy Chapel List Count By Level
   * @param {Object} params - Query parameters
   * @returns {Promise<Array>} Vacancy count by level
   */
  async getVacancyChapelListCountByLevel(params = {}) {
    try {
      const result = await executeProcedure('VacancyChapelListCountByLevel', params);
      return result.recordset || [];
    } catch (error) {
      logger.error('Error executing VacancyChapelListCountByLevel stored procedure:', error);
      throw error;
    }
  }

  /**
   * Get Wake Room Booking List
   * @param {Object} params - Query parameters
   * @returns {Promise<Array>} Wake room booking list
   */
  async getWakeRoomBookingList(params = {}) {
    try {
      const result = await executeProcedure('WakeRoomBookingList', params);
      return result.recordset || [];
    } catch (error) {
      logger.error('Error executing WakeRoomBookingList stored procedure:', error);
      throw error;
    }
  }

  /**
   * Get Wake Room Monthly List
   * @param {Date} fromDate - Start date
   * @param {Date} toDate - End date
   * @returns {Promise<Array>} Wake room monthly list
   */
  async getWakeRoomMonthlyList(fromDate, toDate) {
    try {
      const result = await executeProcedure('WakeRoomMonthlyList', {
        FromDate: fromDate || null,
        ToDate: toDate || null
      });
      return result.recordset || [];
    } catch (error) {
      logger.error('Error executing WakeRoomMonthlyList stored procedure:', error);
      throw error;
    }
  }

  /**
   * Get Receipt Data for Report (from InvoiceBL.GetReceiptForReport equivalent)
   * @param {string} invoiceCode - Invoice code
   * @param {string} address - Address override
   * @param {string} districtCode - District code
   * @returns {Promise<Array>} Receipt data
   */
  async getReceiptForReport(invoiceCode, address, districtCode) {
    try {
      const query = `
        SELECT 
          r.*,
          d.Code as InvCode,
          d.RefDocName,
          d.RefDocNumber,
          d.NicheApplicationId as NichId,
          h.Code as ChurchCode,
          h.Description as ChurchDesc,
          e.NicheId,
          c.Code as ItCode,
          c.Name as ItName,
          c.ItemId as ItID,
          c.Price,
          CASE 
            WHEN r.Address IS NOT NULL AND r.Address != '' THEN r.Address
            ELSE @address
          END as Address
        FROM Receipt r
        INNER JOIN Invoice d ON r.InvoiceId = d.InvoiceId
        LEFT JOIN InvoiceDetail k ON k.InvoiceId = r.InvoiceId
        LEFT JOIN NicheApplication i ON i.Code = k.RefDocNumber
        LEFT JOIN Niche e ON e.NicheId = i.NicheId
        LEFT JOIN NicheRow f ON f.NicheRowlId = e.NicheRowlId
        LEFT JOIN NicheWall g ON g.NicheWallId = f.NicheWallId
        LEFT JOIN Chapel h ON h.ChurchId = g.ChurchId AND h.ChapelId = g.ChapelId
        LEFT JOIN MisalaniousReceiptDetail mrd ON mrd.ReceiptId = r.ReceiptId
        LEFT JOIN Item c ON c.ItemId = mrd.ItemId
        WHERE d.Code = @invoiceCode
      `;

      const result = await executeQuery(query, {
        invoiceCode: invoiceCode || '',
        address: address || '',
        districtCode: districtCode || ''
      });

      return result.recordset || [];
    } catch (error) {
      logger.error('Error getting receipt for report:', error);
      throw error;
    }
  }

  /**
   * Get Invoice List for GST Report
   * @param {Date} fromDate - Start date
   * @param {Date} toDate - End date
   * @returns {Promise<Array>} Invoice list for GST report
   */
  async getInvoiceListForGSTReport(fromDate, toDate) {
    try {
      const query = `
        SELECT 
          i.*,
          id.*,
          r.ReceiptId,
          r.Code as ReceiptCode,
          r.PayingAmount as ReceiptAmount,
          r.TransactionDate as ReceiptDate,
          -- Use Invoice's own CustomerName and address fields
          i.CustomerName,
          i.Address as AddressLine1,
          i.Address2 as AddressLine2,
          i.AddressCity,
          i.DistrictCode as AddressState,
          i.Country as AddressCountry,
          -- Also include TransactionDate as InvoiceDate for backward compatibility
          i.TransactionDate as InvoiceDate
        FROM Invoice i
        LEFT JOIN InvoiceDetail id ON i.InvoiceId = id.InvoiceId
        LEFT JOIN Receipt r ON r.InvoiceId = i.InvoiceId
        WHERE i.TransactionDate >= @fromDate 
          AND i.TransactionDate <= @toDate
        ORDER BY i.TransactionDate DESC, i.Code
      `;

      const result = await executeQuery(query, {
        fromDate: fromDate || new Date('1900-01-01'),
        toDate: toDate || new Date()
      });

      return result.recordset || [];
    } catch (error) {
      logger.error('Error getting invoice list for GST report:', error);
      throw error;
    }
  }

  /**
   * Get Inscription Data for Report
   * @param {string} insCode - Inscription code
   * @returns {Promise<Array>} Inscription data
   */
  async getInscriptionForReport(insCode) {
    try {
      const query = `
        SELECT 
          nir.*,
          nird.*,
          nb.*,
          n.*,
          nr.*,
          nw.*,
          c.*,
          p_app.Name as ApplicantName,
          p_app.AddressLine1 as ApplicantAddressLine1,
          p_app.AddressLine2 as ApplicantAddressLine2,
          p_app.AddressCity as ApplicantCity,
          p_app.AddressState as ApplicantState,
          p_app.AddressCountry as ApplicantCountry,
          p_app.MobileNo as ApplicantMobile,
          p_app.EmailID as ApplicantEmail,
          p_app.IDNo as ApplicantIDNo,
          p_nom.Name as NomineeName,
          p_nom.MobileNo as NomineeMobile,
          p_nom.IDNo as NomineeIDNo
        FROM NicheInscriptionRequest nir
        INNER JOIN NicheInscriptionRequestDecesed nird ON nird.NicheInscriptionRequestId = nir.NicheInscriptionRequestId
        INNER JOIN NicheBooking nb ON nb.NicheBookingId = nir.NicheBookingId
        INNER JOIN Niche n ON n.NicheId = nb.NicheId
        INNER JOIN NicheRow nr ON nr.NicheRowlId = n.NicheRowlId
        INNER JOIN NicheWall nw ON nw.NicheWallId = nr.NicheWallId
        INNER JOIN Chapel c ON c.ChapelId = nw.ChapelId AND c.ChurchId = nw.ChurchId
        LEFT JOIN Person p_app ON p_app.PersonId = nb.ContactPersonId
        LEFT JOIN Person p_nom ON p_nom.PersonId = nb.NomineeId
        WHERE nir.Code = @insCode
      `;

      const result = await executeQuery(query, {
        insCode: insCode || ''
      });

      return result.recordset || [];
    } catch (error) {
      logger.error('Error getting inscription for report:', error);
      throw error;
    }
  }
}

module.exports = new ReportRepository();

