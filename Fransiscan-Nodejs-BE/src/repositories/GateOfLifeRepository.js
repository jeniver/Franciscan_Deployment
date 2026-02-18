const { executeQuery, getPool, sql } = require('../config/database');
const logger = require('../utils/logger');
const GateOfLifeApplication = require('../models/GateOfLifeApplication');
const GateOfLifeApplicationDetail = require('../models/GateOfLifeApplicationDetail');

class GateOfLifeRepository {
  async searchApplications({
    churchId,
    page,
    pageSize,
    filters = {}
  }) {
    try {
      const conditions = ['ewa.ChurchId = @churchId'];
      const params = { churchId };

      if (filters.applicationCode) {
        conditions.push('ewa.Code LIKE @applicationCode');
        params.applicationCode = `${filters.applicationCode}%`;
      }

      if (filters.applicantName) {
        conditions.push('ewa.ApplicantName LIKE @applicantName');
        params.applicantName = `%${filters.applicantName}%`;
      }

      if (filters.bookedFrom) {
        conditions.push('ewa.BookingDate >= @bookedFrom');
        params.bookedFrom = filters.bookedFrom;
      }

      if (filters.bookedTo) {
        conditions.push('ewa.BookingDate < @bookedTo');
        params.bookedTo = filters.bookedTo;
      }

      if (filters.searchTerm) {
        conditions.push(`(
          ewa.Code LIKE @searchTerm
          OR ewa.ApplicantName LIKE @searchTerm
          OR EXISTS (
            SELECT 1
            FROM EngraveWallApplicationDetail d WITH (NOLOCK)
            WHERE d.EngraveWallApplicationId = ewa.EngraveWallApplicationId
              AND d.NameToEngrave LIKE @searchTerm
          )
        )`);
        params.searchTerm = `%${filters.searchTerm}%`;
      }

      if (filters.nameToEngrave) {
        conditions.push(`EXISTS (
          SELECT 1
          FROM EngraveWallApplicationDetail d WITH (NOLOCK)
          WHERE d.EngraveWallApplicationId = ewa.EngraveWallApplicationId
            AND d.NameToEngrave LIKE @nameToEngrave
        )`);
        params.nameToEngrave = `%${filters.nameToEngrave}%`;
      }

      const whereClause = conditions.length > 0
        ? `WHERE ${conditions.join(' AND ')}`
        : '';

      const countQuery = `
        SELECT COUNT(1) AS Total
        FROM EngraveWallApplication ewa WITH (NOLOCK)
        ${whereClause}
      `;

      const totalResult = await executeQuery(countQuery, params);
      const total = totalResult.recordset?.[0]?.Total || 0;

      if (total === 0) {
        return {
          total: 0,
          records: []
        };
      }

      const offset = (page - 1) * pageSize;
      const dataQuery = `
        WITH Filtered AS (
          SELECT
            ewa.*,
            ROW_NUMBER() OVER (ORDER BY ewa.BookingDate DESC, ewa.EngraveWallApplicationId DESC) AS RowNum
          FROM EngraveWallApplication ewa WITH (NOLOCK)
          ${whereClause}
        )
        SELECT *
        FROM Filtered
        WHERE RowNum BETWEEN @startRow AND @endRow
        ORDER BY RowNum
      `;

      const dataParams = {
        ...params,
        startRow: offset + 1,
        endRow: offset + pageSize
      };

      const dataResult = await executeQuery(dataQuery, dataParams);
      const rows = dataResult.recordset || [];

      if (!rows.length) {
        return {
          total,
          records: []
        };
      }

      const applicationIds = rows
        .map(row => row.EngraveWallApplicationId)
        .filter(id => typeof id === 'number' && id > 0);

      const detailsByApplication = await this._fetchDetailsMap(applicationIds);
      const records = rows.map(row => new GateOfLifeApplication({
        ...row,
        EngraveWallApplicationDetailList: detailsByApplication.get(row.EngraveWallApplicationId) || []
      }));

      return {
        total,
        records
      };
    } catch (error) {
      logger.error('Failed to search Gates of Life applications:', error);
      throw error;
    }
  }

  async getByCode(code, churchId) {
    try {
      const query = `
        SELECT TOP 1 *
        FROM EngraveWallApplication WITH (NOLOCK)
        WHERE Code = @code
          AND ChurchId = @churchId
      `;

      const result = await executeQuery(query, { code, churchId });
      const record = result.recordset?.[0];

      if (!record) {
        return null;
      }

      const details = await this._fetchDetails(record.EngraveWallApplicationId);

      return new GateOfLifeApplication({
        ...record,
        EngraveWallApplicationDetailList: details
      });
    } catch (error) {
      logger.error('Failed to fetch Gates of Life application by code:', error);
      throw error;
    }
  }

  async getById(applicationId, churchId) {
    try {
      const query = `
        SELECT TOP 1 *
        FROM EngraveWallApplication WITH (NOLOCK)
        WHERE EngraveWallApplicationId = @applicationId
          AND ChurchId = @churchId
      `;

      const result = await executeQuery(query, { applicationId, churchId });
      const record = result.recordset?.[0];

      if (!record) {
        return null;
      }

      const details = await this._fetchDetails(record.EngraveWallApplicationId);

      return new GateOfLifeApplication({
        ...record,
        EngraveWallApplicationDetailList: details
      });
    } catch (error) {
      logger.error('Failed to fetch Gates of Life application by ID:', error);
      throw error;
    }
  }

  async create(application) {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();

      const code = application.code || await this._generateNextCode(transaction, application.churchId);

      const insertRequest = new sql.Request(transaction);
      insertRequest.input('Code', sql.VarChar(50), code);
      insertRequest.input('BookingDate', sql.DateTime, application.bookingDate || new Date());
      insertRequest.input('ApplicantName', sql.NVarChar(200), application.applicantName);
      insertRequest.input('ApplicantIDNo', sql.NVarChar(100), application.applicantIDNo || null);
      insertRequest.input('ApplicantEmailID', sql.NVarChar(200), application.applicantEmailID || null);
      insertRequest.input('ApplicantMobileNo', sql.NVarChar(50), application.applicantMobileNo || null);
      insertRequest.input('ApplicantHomeTelNo', sql.NVarChar(50), application.applicantHomeTelNo || null);
      insertRequest.input('ApplicantOfficeTelNo', sql.NVarChar(50), application.applicantOfficeTelNo || null);

      const applicantAddressNo = typeof application.applicantAddressNo === 'string'
        ? application.applicantAddressNo.trim()
        : application.applicantAddressNo;
      insertRequest.input('ApplicantAddressNo', sql.NVarChar(50), applicantAddressNo || 'N/A');
      insertRequest.input('ApplicantAddressLine1', sql.NVarChar(200), application.applicantAddressLine1 || null);
      insertRequest.input('ApplicantAddressLine2', sql.NVarChar(200), application.applicantAddressLine2 || null);
      insertRequest.input('ApplicantAddressCity', sql.NVarChar(100), application.applicantAddressCity || null);
      insertRequest.input('ApplicantAddressState', sql.NVarChar(100), application.applicantAddressState || null);
      insertRequest.input('ApplicantAddressCountry', sql.NVarChar(100), application.applicantAddressCountry || null);

      insertRequest.input('DonationAmount', sql.Decimal(18, 2), application.donationAmount || null);
      insertRequest.input('DefaultDonationAmount', sql.Decimal(18, 2), application.defaultDonationAmount || null);
      insertRequest.input('ChurchId', sql.Int, application.churchId);
      insertRequest.input('UserId', sql.Int, application.userId || null);
      insertRequest.input('RequestSameBrick', sql.Bit, application.requestSameBrick || false);
      insertRequest.input('RefDocType', sql.VarChar(10), application.refDocType || 'GOLA');

      const insertQuery = `
        INSERT INTO EngraveWallApplication (
          Code,
          BookingDate,
          ApplicantName,
          ApplicantIDNo,
          ApplicantEmailID,
          ApplicantMobileNo,
          ApplicantHomeTelNo,
          ApplicantOfficeTelNo,
          ApplicantAddressNo,
          ApplicantAddressLine1,
          ApplicantAddressLine2,
          ApplicantAddressCity,
          ApplicantAddressState,
          ApplicantAddressCountry,
          DonationAmount,
          DefaultDonationAmount,
          ChurchId,
          UserId,
          RequestSameBrick,
          RefDocType
        )
        VALUES (
          @Code,
          @BookingDate,
          @ApplicantName,
          @ApplicantIDNo,
          @ApplicantEmailID,
          @ApplicantMobileNo,
          @ApplicantHomeTelNo,
          @ApplicantOfficeTelNo,
          @ApplicantAddressNo,
          @ApplicantAddressLine1,
          @ApplicantAddressLine2,
          @ApplicantAddressCity,
          @ApplicantAddressState,
          @ApplicantAddressCountry,
          @DonationAmount,
          @DefaultDonationAmount,
          @ChurchId,
          @UserId,
          @RequestSameBrick,
          @RefDocType
        );
        SELECT SCOPE_IDENTITY() AS EngraveWallApplicationId;
      `;

      const insertResult = await insertRequest.query(insertQuery);
      const applicationId = insertResult.recordset?.[0]?.EngraveWallApplicationId;

      if (!applicationId) {
        throw new Error('Failed to create Gates of Life application');
      }

      await this._replaceDetails(transaction, applicationId, application.details);

      await transaction.commit();

      return this.getById(applicationId, application.churchId);
    } catch (error) {
      await transaction.rollback().catch(rollbackError => {
        logger.error('Rollback failed after create GOA application error:', rollbackError);
      });
      logger.error('Failed to create Gates of Life application:', error);
      throw error;
    }
  }

  async update(application) {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();

      const updateRequest = new sql.Request(transaction);
      updateRequest.input('ApplicationId', sql.Int, application.applicationId);
      updateRequest.input('ChurchId', sql.Int, application.churchId);
      updateRequest.input('ApplicantName', sql.NVarChar(200), application.applicantName);
      updateRequest.input('ApplicantIDNo', sql.NVarChar(100), application.applicantIDNo || null);
      updateRequest.input('ApplicantEmailID', sql.NVarChar(200), application.applicantEmailID || null);
      updateRequest.input('ApplicantMobileNo', sql.NVarChar(50), application.applicantMobileNo || null);
      updateRequest.input('ApplicantHomeTelNo', sql.NVarChar(50), application.applicantHomeTelNo || null);
      updateRequest.input('ApplicantOfficeTelNo', sql.NVarChar(50), application.applicantOfficeTelNo || null);

      const applicantAddressNo = typeof application.applicantAddressNo === 'string'
        ? application.applicantAddressNo.trim()
        : application.applicantAddressNo;
      updateRequest.input('ApplicantAddressNo', sql.NVarChar(50), applicantAddressNo || 'N/A');
      updateRequest.input('ApplicantAddressLine1', sql.NVarChar(200), application.applicantAddressLine1 || null);
      updateRequest.input('ApplicantAddressLine2', sql.NVarChar(200), application.applicantAddressLine2 || null);
      updateRequest.input('ApplicantAddressCity', sql.NVarChar(100), application.applicantAddressCity || null);
      updateRequest.input('ApplicantAddressState', sql.NVarChar(100), application.applicantAddressState || null);
      updateRequest.input('ApplicantAddressCountry', sql.NVarChar(100), application.applicantAddressCountry || null);

      updateRequest.input('DonationAmount', sql.Decimal(18, 2), application.donationAmount || null);
      updateRequest.input('DefaultDonationAmount', sql.Decimal(18, 2), application.defaultDonationAmount || null);
      updateRequest.input('RequestSameBrick', sql.Bit, application.requestSameBrick || false);
      updateRequest.input('BookingDate', sql.DateTime, application.bookingDate || new Date());

      const updateQuery = `
        UPDATE EngraveWallApplication
        SET
          ApplicantName = @ApplicantName,
          ApplicantIDNo = @ApplicantIDNo,
          ApplicantEmailID = @ApplicantEmailID,
          ApplicantMobileNo = @ApplicantMobileNo,
          ApplicantHomeTelNo = @ApplicantHomeTelNo,
          ApplicantOfficeTelNo = @ApplicantOfficeTelNo,
          ApplicantAddressNo = @ApplicantAddressNo,
          ApplicantAddressLine1 = @ApplicantAddressLine1,
          ApplicantAddressLine2 = @ApplicantAddressLine2,
          ApplicantAddressCity = @ApplicantAddressCity,
          ApplicantAddressState = @ApplicantAddressState,
          ApplicantAddressCountry = @ApplicantAddressCountry,
          DonationAmount = @DonationAmount,
          DefaultDonationAmount = @DefaultDonationAmount,
          RequestSameBrick = @RequestSameBrick,
          BookingDate = @BookingDate
        WHERE EngraveWallApplicationId = @ApplicationId
          AND ChurchId = @ChurchId
      `;

      const updateResult = await updateRequest.query(updateQuery);

      if (!updateResult.rowsAffected || updateResult.rowsAffected[0] === 0) {
        throw new Error('NOT_FOUND');
      }

      await this._replaceDetails(transaction, application.applicationId, application.details);

      await transaction.commit();

      return this.getById(application.applicationId, application.churchId);
    } catch (error) {
      await transaction.rollback().catch(rollbackError => {
        logger.error('Rollback failed after update GOA application error:', rollbackError);
      });
      if (error.message === 'NOT_FOUND') {
        return null;
      }
      logger.error('Failed to update Gates of Life application:', error);
      throw error;
    }
  }

  async delete(code, churchId) {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();

      const selectRequest = new sql.Request(transaction);
      selectRequest.input('Code', sql.VarChar(50), code);
      selectRequest.input('ChurchId', sql.Int, churchId);

      const selectResult = await selectRequest.query(`
        SELECT EngraveWallApplicationId
        FROM EngraveWallApplication
        WHERE Code = @Code
          AND ChurchId = @ChurchId
      `);

      const applicationId = selectResult.recordset?.[0]?.EngraveWallApplicationId;
      if (!applicationId) {
        await transaction.rollback();
        return false;
      }

      const deleteDetailsRequest = new sql.Request(transaction);
      deleteDetailsRequest.input('ApplicationId', sql.Int, applicationId);
      await deleteDetailsRequest.query(`
        DELETE FROM EngraveWallApplicationDetail
        WHERE EngraveWallApplicationId = @ApplicationId
      `);

      const deleteApplicationRequest = new sql.Request(transaction);
      deleteApplicationRequest.input('ApplicationId', sql.Int, applicationId);
      deleteApplicationRequest.input('ChurchId', sql.Int, churchId);
      await deleteApplicationRequest.query(`
        DELETE FROM EngraveWallApplication
        WHERE EngraveWallApplicationId = @ApplicationId
          AND ChurchId = @ChurchId
      `);

      await transaction.commit();
      return true;
    } catch (error) {
      await transaction.rollback().catch(rollbackError => {
        logger.error('Rollback failed after delete GOA application error:', rollbackError);
      });
      logger.error('Failed to delete Gates of Life application:', error);
      throw error;
    }
  }

  async getInvoiceDetails(code, churchId) {
    try {
      const applicationQuery = `
        SELECT TOP 1
          ewa.EngraveWallApplicationId,
          ewa.Code,
          ewa.BookingDate,
          ewa.ApplicantName,
          ewa.ApplicantIDNo,
          ewa.ApplicantEmailID,
          ewa.ApplicantMobileNo,
          ewa.ApplicantHomeTelNo,
          ewa.ApplicantOfficeTelNo,
          ewa.ApplicantAddressNo,
          ewa.ApplicantAddressLine1,
          ewa.ApplicantAddressLine2,
          ewa.ApplicantAddressCity,
          ewa.ApplicantAddressState,
          ewa.ApplicantAddressCountry,
          ewa.DonationAmount,
          ewa.DefaultDonationAmount,
          ewa.RequestSameBrick,
          ewa.ChurchId,
          ewa.UserId
        FROM EngraveWallApplication ewa WITH (NOLOCK)
        WHERE ewa.Code = @code
          AND ewa.ChurchId = @churchId
      `;

      const applicationResult = await executeQuery(applicationQuery, { code, churchId });
      const application = applicationResult.recordset?.[0];

      if (!application) {
        return null;
      }

      const detailsQuery = `
        SELECT
          NameToEngrave
        FROM EngraveWallApplicationDetail WITH (NOLOCK)
        WHERE EngraveWallApplicationId = @applicationId
        ORDER BY EngraveWallApplicationDetailId ASC
      `;

      const detailsResult = await executeQuery(detailsQuery, {
        applicationId: application.EngraveWallApplicationId
      });

      const invoiceQuery = `
        SELECT TOP 1
          inv.InvoiceId,
          inv.Code AS InvoiceNo,
          inv.TransactionDate AS InvoiceDate,
          inv.PaymentModeDocNo,
          ISNULL(inv.PaymentMode, NULL) AS PaymentMode,
          inv.TotalAmount AS InvoiceTotalAmount,
          inv.PayingAmount AS InvoicePayingAmount,
          inv.Status AS InvoiceStatus,
          invd.TotalPayingAmount AS LineTotalAmount,
          invd.LineTaxAmount,
          invd.LineTotalAmount,
          invd.RefDocNumber
        FROM InvoiceDetail invd WITH (NOLOCK)
        INNER JOIN Invoice inv WITH (NOLOCK) ON invd.InvoiceId = inv.InvoiceId
        WHERE invd.RefDocNumber = @code
        ORDER BY inv.TransactionDate DESC
      `;

      const invoiceResult = await executeQuery(invoiceQuery, { code });
      const invoice = invoiceResult.recordset?.[0] || null;

      let receipt = null;
      if (invoice?.InvoiceId) {
        const receiptQuery = `
          SELECT TOP 1
            ReceiptId,
            Code AS ReceiptNo,
            TransactionDate AS ReceiptDate,
            TotalAmount,
            PayingAmount,
            PaymentMode,
            PaymentModeDocNo
          FROM Receipt WITH (NOLOCK)
          WHERE InvoiceId = @invoiceId
          ORDER BY ReceiptId DESC
        `;

        const receiptResult = await executeQuery(receiptQuery, { invoiceId: invoice.InvoiceId });
        receipt = receiptResult.recordset?.[0] || null;
      }

      const miscReceiptQuery = `
        SELECT
          SUM(ISNULL(TotalPayingAmount, 0)) AS TotalPayingAmount,
          SUM(ISNULL(PayingAmount, 0)) AS PayingAmount
        FROM MisalaniousReceiptDetail WITH (NOLOCK)
        WHERE RefDocNumber = @code
      `;

      const miscReceiptResult = await executeQuery(miscReceiptQuery, { code });
      const miscReceipt = miscReceiptResult.recordset?.[0] || null;

      return {
        application,
        details: detailsResult.recordset || [],
        invoice,
        receipt,
        miscReceipt
      };
    } catch (error) {
      logger.error('Failed to fetch Gate of Life invoice details:', error);
      throw error;
    }
  }

  async _generateNextCode(transaction, churchId) {
    const request = new sql.Request(transaction);
    request.input('ChurchId', sql.Int, churchId);

    const result = await request.query(`
      SELECT TOP 1 Code
      FROM EngraveWallApplication WITH (UPDLOCK, HOLDLOCK)
      WHERE ChurchId = @ChurchId
      ORDER BY EngraveWallApplicationId DESC
    `);

    const latestCode = result.recordset?.[0]?.Code || null;
    const numericPart = latestCode
      ? (parseInt(latestCode.replace(/[^0-9]/g, ''), 10) || 0)
      : 0;

    const nextNumber = numericPart + 1;
    return `GOL-${nextNumber.toString().padStart(5, '0')}`;
  }

  async _replaceDetails(transaction, applicationId, details = []) {
    const deleteRequest = new sql.Request(transaction);
    deleteRequest.input('ApplicationId', sql.Int, applicationId);
    await deleteRequest.query(`
      DELETE FROM EngraveWallApplicationDetail
      WHERE EngraveWallApplicationId = @ApplicationId
    `);

    const validDetails = (details || [])
      .map(detail => new GateOfLifeApplicationDetail(detail))
      .filter(detail => detail.isValid());

    for (const detail of validDetails) {
      const detailRequest = new sql.Request(transaction);
      detailRequest.input('ApplicationId', sql.Int, applicationId);
      detailRequest.input('NameToEngrave', sql.NVarChar(200), detail.nameToEngrave);

      logger.debug(`Inserting EngraveWallApplicationDetail for appId ${applicationId}:`, {
        nameToEngrave: detail.nameToEngrave,
        remarks: detail.remarks,
        dateOfBirth: detail.dateOfBirth,
        dateOfDeath: detail.dateOfDeath,
        additionalInfo: detail.additionalInfo
      });

      await detailRequest.query(`
        INSERT INTO EngraveWallApplicationDetail (
          EngraveWallApplicationId,
          NameToEngrave
        )
        VALUES (
          @ApplicationId,
          @NameToEngrave
        )
      `);
    }
  }

  async _fetchDetails(applicationId) {
    if (!applicationId) {
      return [];
    }

    const query = `
      SELECT
        EngraveWallApplicationDetailId AS detailId,
        EngraveWallApplicationId AS applicationId,
        NameToEngrave AS nameToEngrave
      FROM EngraveWallApplicationDetail WITH (NOLOCK)
      WHERE EngraveWallApplicationId = @applicationId
      ORDER BY EngraveWallApplicationDetailId ASC
    `;

    const result = await executeQuery(query, { applicationId });
    return (result.recordset || []).map(row => new GateOfLifeApplicationDetail(row));
  }

  async _fetchDetailsMap(applicationIds = []) {
    const map = new Map();
    if (!applicationIds.length) {
      return map;
    }

    const params = {};
    const placeholders = applicationIds.map((id, index) => {
      const param = `id${index}`;
      params[param] = id;
      return `@${param}`;
    }).join(', ');

    const query = `
      SELECT
        EngraveWallApplicationDetailId AS detailId,
        EngraveWallApplicationId AS applicationId,
        NameToEngrave AS nameToEngrave
      FROM EngraveWallApplicationDetail WITH (NOLOCK)
      WHERE EngraveWallApplicationId IN (${placeholders})
      ORDER BY EngraveWallApplicationDetailId ASC
    `;

    const result = await executeQuery(query, params);
    (result.recordset || []).forEach(row => {
      const key = row.EngraveWallApplicationId;
      const detail = new GateOfLifeApplicationDetail(row);
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key).push(detail);
    });

    return map;
  }
}

module.exports = new GateOfLifeRepository();


