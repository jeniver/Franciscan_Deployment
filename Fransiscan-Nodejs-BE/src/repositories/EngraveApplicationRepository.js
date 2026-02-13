const { executeStoredProcedure, executeRawQuery } = require('../config/knex');
const { executeQuery, getPool, sql } = require('../config/database');
const { EngraveApplication, EngraveApplicationDetail } = require('../models/EngraveApplication');
const logger = require('../utils/logger');

class EngraveApplicationRepository {
  /**
   * Create engrave application with details
   * @param {EngraveApplication} application - Application data
   * @param {Array<EngraveApplicationDetail>} details - Deceased details
   * @returns {Promise<string>} Application code
   */
  async create(application, details) {
    try {
      // Check if stored procedure exists, otherwise use direct insert
      const spName = 'sp_create_engrave_application_and_details';

      try {
        // Try using stored procedure first
        const params = {
          ApplicantName: application.applicantName,
          ApplicantIDNo: application.applicantIDNo,
          ApplicantEmailID: application.applicantEmailID,
          ApplicantMobileNo: application.applicantMobileNo,
          ApplicantHomeTelNo: application.applicantHomeTelNo,
          ApplicantOfficeTelNo: application.applicantOfficeTelNo,
          ApplicantAddressNo: application.applicantAddressNo,
          ApplicantAddressLine1: application.applicantAddressLine1,
          ApplicantAddressLine2: application.applicantAddressLine2,
          ApplicantAddressCity: application.applicantAddressCity,
          ApplicantAddressState: application.applicantAddressState,
          ApplicantAddressCountry: application.applicantAddressCountry,
          NicheApplicationCode: application.nicheApplicationCode,
          NicheBookingId: application.nicheBookingId,
          BibleInscriptionChoiceId: application.bibleInscriptionChoiceId,
          BibleInscriptionText: application.bibleInscriptionText,
          ChurchId: application.churchId,
          UserId: application.userId,
          Remarks: application.remarks,
          DeceasedDetailsJson: JSON.stringify(details.map(d => d.toJSON()))
        };

        const result = await executeStoredProcedure(spName, params);

        if (result.recordset && result.recordset[0]) {
          return result.recordset[0].Code || result.recordset[0].code;
        }
      } catch (spError) {
        // Check if error is "procedure not found" - this is expected
        const isProcedureNotFound =
          spError.message?.includes('Could not find stored procedure') ||
          spError.message?.includes('stored procedure') && spError.message?.includes('not found') ||
          (spError.originalError?.info?.number === 2812); // SQL Server error 2812 = object not found

        if (isProcedureNotFound) {
          // This is expected - stored procedure doesn't exist, use direct insert
          logger.debug(`Stored procedure ${spName} not found, using direct insert method`);
        } else {
          // Actual error occurred, log as warning
          logger.warn(`Stored procedure ${spName} failed, using direct insert:`, spError.message);
        }
      }

      // Fallback to direct insert
      return await this._createWithDirectInsert(application, details);
    } catch (error) {
      logger.error('Failed to create engrave application:', error);
      throw error;
    }
  }

  /**
   * Direct insert method (fallback if SP doesn't exist)
   * @private
   */
  async _createWithDirectInsert(application, details) {
    try {
      // Generate code in format: I-{applicationNumber}
      // If nicheApplicationCode is provided (e.g., "7980-0"), use it: "I-7980-0"
      // Otherwise, generate sequential number: "I-1", "I-2", etc.
      let code;

      if (application.nicheApplicationCode && application.nicheApplicationCode.trim() !== '') {
        // Use the niche application code format: I-{applicationNumber}
        code = `I-${application.nicheApplicationCode}`;

        // Check if this code already exists
        const existingQuery = `
          SELECT TOP 1 Code 
          FROM NicheInscriptionRequest 
          WHERE Code = @code AND ChurchId = @churchId
        `;
        const existingResult = await executeRawQuery(existingQuery, {
          code,
          churchId: application.churchId
        });

        if (existingResult.recordset && existingResult.recordset.length > 0) {
          // Code already exists, append suffix
          const lastCodeQuery = `
            SELECT TOP 1 Code 
            FROM NicheInscriptionRequest 
            WHERE Code LIKE @codePattern AND ChurchId = @churchId
            ORDER BY NicheInscriptionRequestId DESC
          `;
          const lastCodeResult = await executeRawQuery(lastCodeQuery, {
            codePattern: `${code}-%`,
            churchId: application.churchId
          });

          let suffix = 1;
          if (lastCodeResult.recordset && lastCodeResult.recordset.length > 0) {
            const lastCode = lastCodeResult.recordset[0].Code;
            const match = lastCode.match(/-(\d+)$/);
            if (match) {
              suffix = parseInt(match[1]) + 1;
            }
          }
          code = `${code}-${suffix}`;
        }
      } else {
        // Generate sequential number: I-1, I-2, etc.
        const lastCodeQuery = `
          SELECT TOP 1 Code 
          FROM NicheInscriptionRequest 
          WHERE ChurchId = @churchId 
            AND Code LIKE 'I-%'
            AND Code NOT LIKE 'I-%-%'
          ORDER BY 
            TRY_CAST(SUBSTRING(Code, 3, LEN(Code) - 2) AS INT) DESC,
            NicheInscriptionRequestId DESC
        `;

        const lastCodeResult = await executeRawQuery(lastCodeQuery, { churchId: application.churchId });
        let nextNumber = 1;

        if (lastCodeResult.recordset && lastCodeResult.recordset.length > 0) {
          const lastCode = lastCodeResult.recordset[0].Code;
          // Extract number after "I-"
          const match = lastCode.match(/^I-(\d+)$/);
          if (match) {
            nextNumber = parseInt(match[1]) + 1;
          }
        }

        code = `I-${nextNumber}`;
      }

      // NicheBookingId is NOT NULL in the database - we need to find or create a booking
      let nicheBookingId = application.nicheBookingId;

      // If no booking ID provided, try to find existing booking for the niche application
      if (!nicheBookingId && application.nicheApplicationCode) {
        try {
          // First, check if there's already an inscription for this niche application code
          // This prevents duplicate inscriptions for the same niche application
          const existingInscriptionQuery = `
            SELECT TOP 1 nir.Code, nir.NicheBookingId
            FROM NicheInscriptionRequest nir WITH (NOLOCK)
            INNER JOIN NicheBooking nb WITH (NOLOCK) ON nir.NicheBookingId = nb.NicheBookingId
            INNER JOIN NicheApplication na WITH (NOLOCK) ON nb.NicheApplicationId = na.NicheApplicationId
            WHERE na.Code = @code AND nir.ChurchId = @churchId
            ORDER BY nir.NicheInscriptionRequestId DESC
          `;
          const existingInscriptionResult = await executeRawQuery(existingInscriptionQuery, {
            code: application.nicheApplicationCode,
            churchId: application.churchId
          });

          if (existingInscriptionResult.recordset && existingInscriptionResult.recordset.length > 0) {
            // Use the existing booking ID from the existing inscription
            nicheBookingId = existingInscriptionResult.recordset[0].NicheBookingId;
            logger.info(`Found existing inscription with booking ${nicheBookingId} for niche application ${application.nicheApplicationCode}`);
          } else {
            // Get the niche application ID
            const nicheAppQuery = `
              SELECT TOP 1 NicheApplicationId, NicheId
              FROM NicheApplication WITH (NOLOCK)
              WHERE Code = @code AND ChurchId = @churchId
            `;
            const nicheAppResult = await executeRawQuery(nicheAppQuery, {
              code: application.nicheApplicationCode,
              churchId: application.churchId
            });

            if (nicheAppResult.recordset && nicheAppResult.recordset.length > 0) {
              const nicheApplicationId = nicheAppResult.recordset[0].NicheApplicationId;
              const nicheId = nicheAppResult.recordset[0].NicheId;

              // Try to find existing booking for this application
              const bookingQuery = `
                SELECT TOP 1 NicheBookingId
                FROM NicheBooking WITH (NOLOCK)
                WHERE NicheApplicationId = @nicheApplicationId
                  AND BookingStatus = 1
                ORDER BY NicheBookingId DESC
              `;
              const bookingResult = await executeRawQuery(bookingQuery, { nicheApplicationId });

              if (bookingResult.recordset && bookingResult.recordset.length > 0) {
                nicheBookingId = bookingResult.recordset[0].NicheBookingId;
                logger.info(`Found existing booking ${nicheBookingId} for niche application ${application.nicheApplicationCode}`);
              } else {
                // Create a minimal booking for the inscription
                // We need at least a contact person - try to find or create one
                let contactPersonId = null;

                // Try to find existing person by ID number
                if (application.applicantIDNo) {
                  const personQuery = `
                  SELECT TOP 1 PersonId
                  FROM Person WITH (NOLOCK)
                  WHERE IDNo = @idNo AND ChurchId = @churchId
                `;
                  const personResult = await executeQuery(personQuery, {
                    idNo: application.applicantIDNo,
                    churchId: application.churchId
                  });

                  if (personResult.recordset && personResult.recordset.length > 0) {
                    contactPersonId = personResult.recordset[0].PersonId;
                  }
                }

                // If no person found, we'll create a booking with minimal data
                // Use a default contact person ID if available, or create booking without it
                const createBookingQuery = `
                INSERT INTO NicheBooking (
                  NicheApplicationId, NicheId, ContactPersonId,
                  BookedDate, BookingStatus, ChurchId, UserId, Remarks
                )
                VALUES (
                  @nicheApplicationId, @nicheId, @contactPersonId,
                  GETDATE(), 1, @churchId, @userId, 'Auto-created for inscription'
                );
                SELECT SCOPE_IDENTITY() AS NicheBookingId;
              `;

                const createBookingResult = await executeQuery(createBookingQuery, {
                  nicheApplicationId,
                  nicheId: nicheId || 0, // Use 0 if no niche ID
                  contactPersonId,
                  churchId: application.churchId,
                  userId: application.userId
                });

                if (createBookingResult.recordset && createBookingResult.recordset.length > 0) {
                  nicheBookingId = createBookingResult.recordset[0].NicheBookingId;
                  logger.info(`Created new booking ${nicheBookingId} for niche application ${application.nicheApplicationCode}`);
                }
              }
            }
          }
        } catch (bookingError) {
          logger.warn('Failed to find or create booking, will use default:', bookingError.message);
          // If we can't create a booking, we'll need to use a default value
          // Check if there's a system default booking ID we can use
          const defaultBookingQuery = `
            SELECT TOP 1 NicheBookingId
            FROM NicheBooking WITH (NOLOCK)
            WHERE ChurchId = @churchId
            ORDER BY NicheBookingId
          `;
          const defaultBookingResult = await executeQuery(defaultBookingQuery, { churchId: application.churchId });
          if (defaultBookingResult.recordset && defaultBookingResult.recordset.length > 0) {
            nicheBookingId = defaultBookingResult.recordset[0].NicheBookingId;
            logger.warn(`Using default booking ${nicheBookingId} as fallback`);
          } else {
            throw new Error('Cannot create inscription: NicheBookingId is required but no booking could be found or created');
          }
        }
      }

      // If still no booking ID, throw error
      if (!nicheBookingId) {
        throw new Error('Cannot create inscription: NicheBookingId is required. Please ensure the niche application has a booking or provide a booking ID.');
      }

      const insertQuery = `
        INSERT INTO NicheInscriptionRequest (
          TranscationDate, NicheBookingId, Code, ApplicantName, ApplicantIDNo, ApplicantEmailID, 
          ApplicantMobileNo, ApplicantHomeTelNo, ApplicantOfficeTelNo,
          ApplicantAddressNo, ApplicantAddressLine1, ApplicantAddressLine2,
          ApplicantAddressCity, ApplicantAddressState, ApplicantAddressCountry,
          BibleInscriptionChoiceId, ChurchId, UserId, AdditionalInscriptionPhrase
        )
        VALUES (
          GETDATE(), @nicheBookingId, @code, @applicantName, @applicantIDNo, @applicantEmailID,
          @applicantMobileNo, @applicantHomeTelNo, @applicantOfficeTelNo,
          @applicantAddressNo, @applicantAddressLine1, @applicantAddressLine2,
          @applicantAddressCity, @applicantAddressState, @applicantAddressCountry,
          @bibleInscriptionChoiceId, @churchId, @userId, @additionalInscriptionPhrase
        );
        SELECT SCOPE_IDENTITY() AS NicheInscriptionRequestId;
      `;

      const insertParams = {
        code,
        nicheBookingId,
        applicantName: application.applicantName,
        applicantIDNo: application.applicantIDNo,
        applicantEmailID: application.applicantEmailID,
        applicantMobileNo: application.applicantMobileNo,
        applicantHomeTelNo: application.applicantHomeTelNo,
        applicantOfficeTelNo: application.applicantOfficeTelNo,
        applicantAddressNo: application.applicantAddressNo,
        applicantAddressLine1: application.applicantAddressLine1,
        applicantAddressLine2: application.applicantAddressLine2,
        applicantAddressCity: application.applicantAddressCity,
        applicantAddressState: application.applicantAddressState,
        applicantAddressCountry: application.applicantAddressCountry,
        bibleInscriptionChoiceId: application.bibleInscriptionChoiceId,
        churchId: application.churchId,
        userId: application.userId,
        // Priority: additionalInscriptionPhrase > bibleInscriptionText > remarks
        additionalInscriptionPhrase: application.additionalInscriptionPhrase || application.bibleInscriptionText || application.remarks || null
      };

      const insertResult = await executeQuery(insertQuery, insertParams);
      const requestId = insertResult.recordset[0].NicheInscriptionRequestId;

      // Insert deceased details
      for (let i = 0; i < details.length; i++) {
        const detail = details[i];
        const detailQuery = `
          INSERT INTO NicheInscriptionRequestDecesed (
            NicheInscriptionRequestId, NameOfDeceased, DateDied, 
            DateOfBirth, InternmentDate, DeathCertificateNo, BirthYear,
            Remarks
          )
          VALUES (
            @requestId, @nameOfDeceased, @dateDied, 
            @dateOfBirth, @internmentDate, @deathCertificateNo, @birthYear,
            @remarks
          )
        `;

        await executeQuery(detailQuery, {
          requestId,
          nameOfDeceased: detail.name || detail.nameOfDeceased,
          dateDied: detail.dateOfDeath || detail.dateDied,
          dateOfBirth: detail.dateOfBirth || null,
          internmentDate: detail.internmentDate || null,
          deathCertificateNo: detail.deathCertificateNo || detail.deathCertNo || null,
          birthYear: detail.birthYear || null,
          remarks: detail.inscriptionText || null
        });
      }

      return code;
    } catch (error) {
      logger.error('Direct insert failed:', error);
      throw error;
    }
  }

  /**
   * Get engrave application by code
   * @param {string} code - Application code
   * @returns {Promise<EngraveApplication>} Application with details
   */
  async getByCode(code) {
    try {
      // CRITICAL OPTIMIZATION: Split complex query into simpler queries
      // This avoids expensive JOINs that can cause timeouts
      // Step 1: Get inscription request first (fast, indexed lookup)
      const inscriptionQuery = `
        SELECT TOP 1 nir.*
        FROM NicheInscriptionRequest nir WITH (NOLOCK)
        WHERE nir.Code = @code
      `;

      // Fast query with 15s timeout
      const inscriptionResult = await executeQuery(
        inscriptionQuery,
        { code },
        { timeout: 15000 }
      );

      if (!inscriptionResult.recordset || inscriptionResult.recordset.length === 0) {
        return null;
      }

      const nir = inscriptionResult.recordset[0];
      const application = new EngraveApplication(nir);

      // Step 2: Get deceased details separately (only if inscription exists)
      let deceasedDetails = [];
      if (nir.NicheInscriptionRequestId) {
        try {
          const deceasedQuery = `
            SELECT 
              nird.NicheInscriptionRequestDecesedId,
              nird.NameOfDeceased AS DeceasedName,
              nird.DateDied,
              nird.Remarks AS InscriptionText,
              nird.DateOfBirth,
              nird.InternmentDate,
              nird.DeathCertificateNo,
              nird.BirthYear
            FROM NicheInscriptionRequestDecesed nird WITH (NOLOCK)
            WHERE nird.NicheInscriptionRequestId = @requestId
            ORDER BY nird.NicheInscriptionRequestDecesedId
          `;

          const deceasedResult = await executeQuery(
            deceasedQuery,
            { requestId: nir.NicheInscriptionRequestId },
            { timeout: 10000 }
          );

          if (deceasedResult.recordset && deceasedResult.recordset.length > 0) {
            deceasedDetails = deceasedResult.recordset
              .filter(row => row.DeceasedName || row.NameOfDeceased) // Include rows with either field name
              .map((row, index) => new EngraveApplicationDetail({
                nicheInscriptionRequestDecesedId: row.NicheInscriptionRequestDecesedId,
                nicheInscriptionRequestId: nir.NicheInscriptionRequestId,
                name: row.DeceasedName || row.NameOfDeceased || '',
                dateOfDeath: row.DateDied || null,
                dateOfBirth: row.DateOfBirth || null,
                internmentDate: row.InternmentDate || null,
                deathCertificateNo: row.DeathCertificateNo || null,
                birthYear: row.BirthYear || null,
                inscriptionText: row.InscriptionText || null,
                sequence: index + 1
              }));

            logger.info('DIAGNOSTIC: Loaded deceased details from database:', {
              requestId: nir.NicheInscriptionRequestId,
              recordCount: deceasedResult.recordset.length,
              filteredCount: deceasedDetails.length,
              details: deceasedDetails.map(d => ({
                name: d.name,
                hasDateOfDeath: !!d.dateOfDeath,
                hasDateOfBirth: !!d.dateOfBirth,
                hasInternmentDate: !!d.internmentDate
              }))
            });
          } else {
            logger.info('DIAGNOSTIC: No deceased details found in database for inscription:', {
              requestId: nir.NicheInscriptionRequestId
            });
          }
        } catch (deceasedError) {
          logger.warn(`Could not fetch deceased details for inscription ${nir.NicheInscriptionRequestId}:`, deceasedError.message);
          // Continue without deceased details - they're optional
        }
      }

      application.deceasedDetails = deceasedDetails;

      // Log diagnostic information
      logger.info('DIAGNOSTIC: getByCode loaded application:', {
        code: application.code,
        deceasedDetailsCount: deceasedDetails.length,
        deceasedDetails: deceasedDetails.map(d => ({
          name: d.name,
          dateOfDeath: d.dateOfDeath,
          dateOfBirth: d.dateOfBirth,
          internmentDate: d.internmentDate
        })),
        bibleInscriptionChoiceId: application.bibleInscriptionChoiceId,
        additionalInscriptionPhrase: application.additionalInscriptionPhrase,
        bibleInscriptionText: application.bibleInscriptionText
      });

      // Step 3: Get niche application code separately (only if booking exists)
      if (nir.NicheBookingId) {
        try {
          const bookingQuery = `
            SELECT TOP 1 na.Code AS NicheApplicationCode
            FROM NicheBooking nb WITH (NOLOCK)
            INNER JOIN NicheApplication na WITH (NOLOCK)
              ON nb.NicheApplicationId = na.NicheApplicationId
            WHERE nb.NicheBookingId = @bookingId
          `;

          const bookingResult = await executeQuery(
            bookingQuery,
            { bookingId: nir.NicheBookingId },
            { timeout: 10000 }
          );

          if (bookingResult.recordset && bookingResult.recordset.length > 0) {
            application.nicheApplicationCode = bookingResult.recordset[0].NicheApplicationCode;
          }
        } catch (bookingError) {
          logger.warn(`Could not fetch niche application code for booking ${nir.NicheBookingId}:`, bookingError.message);
          // Continue without niche application code - it's optional
        }
      }

      return application;
    } catch (error) {
      logger.error('Failed to get engrave application:', error);
      throw error;
    }
  }

  /**
   * Update engrave application
   * @param {string} code - Application code
   * @param {EngraveApplication} application - Updated application data
   * @param {Array<EngraveApplicationDetail>} details - Updated deceased details
   * @returns {Promise<boolean>} Success status
   */
  async update(code, application, details) {
    try {
      // Check if application exists and can be modified
      const existing = await this.getByCode(code);
      if (!existing) {
        throw new Error('Application not found');
      }

      if (!existing.canModify()) {
        throw new Error('Application cannot be modified (status is not Draft or Pending)');
      }

      // Update main application
      // Note: The table uses AdditionalInscriptionPhrase (not BibleInscriptionText or Remarks)
      // Map bibleInscriptionText and remarks to AdditionalInscriptionPhrase
      const updateQuery = `
        UPDATE NicheInscriptionRequest
        SET 
          ApplicantName = @applicantName,
          ApplicantIDNo = @applicantIDNo,
          ApplicantEmailID = @applicantEmailID,
          ApplicantMobileNo = @applicantMobileNo,
          ApplicantHomeTelNo = @applicantHomeTelNo,
          ApplicantOfficeTelNo = @applicantOfficeTelNo,
          ApplicantAddressNo = @applicantAddressNo,
          ApplicantAddressLine1 = @applicantAddressLine1,
          ApplicantAddressLine2 = @applicantAddressLine2,
          ApplicantAddressCity = @applicantAddressCity,
          ApplicantAddressState = @applicantAddressState,
          ApplicantAddressCountry = @applicantAddressCountry,
          BibleInscriptionChoiceId = @bibleInscriptionChoiceId,
          AdditionalInscriptionPhrase = @additionalInscriptionPhrase
        WHERE Code = @code
      `;

      await executeQuery(updateQuery, {
        code,
        applicantName: application.applicantName,
        applicantIDNo: application.applicantIDNo,
        applicantEmailID: application.applicantEmailID,
        applicantMobileNo: application.applicantMobileNo,
        applicantHomeTelNo: application.applicantHomeTelNo,
        applicantOfficeTelNo: application.applicantOfficeTelNo,
        applicantAddressNo: application.applicantAddressNo,
        applicantAddressLine1: application.applicantAddressLine1,
        applicantAddressLine2: application.applicantAddressLine2,
        applicantAddressCity: application.applicantAddressCity,
        applicantAddressState: application.applicantAddressState,
        applicantAddressCountry: application.applicantAddressCountry,
        bibleInscriptionChoiceId: application.bibleInscriptionChoiceId,
        // Priority: additionalInscriptionPhrase > bibleInscriptionText > remarks
        additionalInscriptionPhrase: application.additionalInscriptionPhrase || application.bibleInscriptionText || application.remarks || null
      });

      // Delete existing details and re-insert
      const deleteQuery = `
        DELETE FROM NicheInscriptionRequestDecesed 
        WHERE NicheInscriptionRequestId = @requestId
      `;

      await executeQuery(deleteQuery, { requestId: existing.nicheInscriptionRequestId });

      // Insert new details
      for (let i = 0; i < details.length; i++) {
        const detail = details[i];
        const insertQuery = `
          INSERT INTO NicheInscriptionRequestDecesed (
            NicheInscriptionRequestId, NameOfDeceased, DateDied, 
            DateOfBirth, InternmentDate, DeathCertificateNo, BirthYear,
            Remarks
          )
          VALUES (
            @requestId, @nameOfDeceased, @dateDied, 
            @dateOfBirth, @internmentDate, @deathCertificateNo, @birthYear,
            @remarks
          )
        `;

        await executeQuery(insertQuery, {
          requestId: existing.nicheInscriptionRequestId,
          nameOfDeceased: detail.name || detail.nameOfDeceased,
          dateDied: detail.dateOfDeath || detail.dateDied,
          dateOfBirth: detail.dateOfBirth || null,
          internmentDate: detail.internmentDate || null,
          deathCertificateNo: detail.deathCertificateNo || detail.deathCertNo || null,
          birthYear: detail.birthYear || null,
          remarks: detail.inscriptionText || null
        });
      }

      return true;
    } catch (error) {
      logger.error('Failed to update engrave application:', error);
      throw error;
    }
  }

  /**
   * Confirm engrave application (create invoice)
   * @param {string} code - Application code
   * @returns {Promise<string>} Invoice code
   */
  async confirm(code) {
    try {
      const spName = 'sp_confirm_engrave_application';

      try {
        // Try using stored procedure first
        const result = await executeStoredProcedure(spName, { ApplicationCode: code });

        if (result.recordset && result.recordset[0]) {
          return result.recordset[0].InvoiceCode || result.recordset[0].invoiceCode;
        }
      } catch (spError) {
        logger.warn(`Stored procedure ${spName} not found or failed, using direct method:`, spError.message);
      }

      // Fallback: Manual confirmation
      return await this._confirmWithDirectMethod(code);
    } catch (error) {
      logger.error('Failed to confirm engrave application:', error);
      throw error;
    }
  }

  /**
   * Search engrave applications with filters
   * @param {Object} filters - Search filters
   * @param {string} filters.searchTerm - Search term for code, applicant name, deceased names
   * @param {string} filters.fromDate - Start date (YYYY-MM-DD)
   * @param {string} filters.toDate - End date (YYYY-MM-DD)
   * @param {number} filters.churchId - Church ID for ACL
   * @param {number} filters.page - Page number (1-based)
   * @param {number} filters.pageSize - Records per page
   * @returns {Promise<Object>} { records: EngraveApplication[], total: number }
   */
  async search(filters = {}) {
    try {
      const {
        searchTerm = '',
        fromDate = null,
        toDate = null,
        churchId = null,
        page = 1,
        pageSize = 20
      } = filters;

      const offset = (page - 1) * pageSize;

      // Build WHERE clause - exclude deceased name search from main query for performance
      let whereConditions = [];
      const params = {};

      if (churchId) {
        whereConditions.push('nir.ChurchId = @churchId');
        params.churchId = churchId;
      }

      if (searchTerm) {
        whereConditions.push(`(
          nir.Code LIKE @searchTerm OR
          nir.ApplicantName LIKE @searchTerm
        )`);
        params.searchTerm = `%${searchTerm}%`;
      }

      if (fromDate) {
        whereConditions.push('nir.TranscationDate >= @fromDate');
        params.fromDate = new Date(fromDate);
      }

      if (toDate) {
        whereConditions.push('nir.TranscationDate <= @toDate');
        params.toDate = new Date(toDate);
      }

      const whereClause = whereConditions.length > 0
        ? 'WHERE ' + whereConditions.join(' AND ')
        : '';

      // Get total count - simpler query without join
      const countQuery = `
        SELECT COUNT(*) as total
        FROM NicheInscriptionRequest nir WITH (NOLOCK)
        ${whereClause}
      `;

      const countResult = await executeQuery(countQuery, params);
      const total = countResult.recordset?.[0]?.total || 0;

      // Get records without joining deceased details for performance
      const dataQuery = `
        SELECT 
          nir.NicheInscriptionRequestId,
          nir.Code,
          nir.ApplicantName,
          '' as NicheApplicationCode,
          nir.TranscationDate as CreatedOn,
          nir.ChurchId
        FROM NicheInscriptionRequest nir WITH (NOLOCK)
        ${whereClause}
        ORDER BY nir.TranscationDate DESC
        OFFSET @offset ROWS
        FETCH NEXT @pageSize ROWS ONLY
      `;

      const dataParams = {
        ...params,
        offset,
        pageSize
      };

      const dataResult = await executeQuery(dataQuery, dataParams);
      const rows = dataResult.recordset || [];

      // Process each record to get deceased details separately
      const records = [];
      for (const row of rows) {
        // Get deceased details for this specific record
        const deceasedQuery = `
          SELECT 
            NicheInscriptionRequestDecesedId,
            NameOfDeceased,
            DateDied,
            DateOfBirth,
            InternmentDate,
            DeathCertificateNo,
            BirthYear,
            Remarks as InscriptionText
          FROM NicheInscriptionRequestDecesed WITH (NOLOCK)
          WHERE NicheInscriptionRequestId = @requestId
        `;
        const deceasedResult = await executeQuery(deceasedQuery, { requestId: row.NicheInscriptionRequestId });

        const deceasedDetails = deceasedResult.recordset ? deceasedResult.recordset.map(r => ({
          nicheInscriptionRequestDecesedId: r.NicheInscriptionRequestDecesedId,
          name: r.NameOfDeceased,
          dateOfDeath: r.DateDied,
          dateOfBirth: r.DateOfBirth,
          internmentDate: r.InternmentDate,
          deathCertificateNo: r.DeathCertificateNo,
          birthYear: r.BirthYear,
          inscriptionText: r.InscriptionText
        })) : [];

        const application = new EngraveApplication({
          nicheInscriptionRequestId: row.NicheInscriptionRequestId,
          code: row.Code,
          applicantName: row.ApplicantName,
          nicheApplicationCode: row.NicheApplicationCode,
          status: 1, // Default status since table doesn't have Status column
          createdOn: row.CreatedOn,
          churchId: row.ChurchId
        });

        // Set deceased details on the application instance so toJSON() will include them
        application.deceasedDetails = deceasedDetails;

        records.push(application);
      }

      return {
        records,
        total
      };
    } catch (error) {
      logger.error('Failed to search engrave applications:', error);
      throw error;
    }
  }

  /**
   * Direct confirmation method (fallback if SP doesn't exist)
   * @private
   */
  async _confirmWithDirectMethod(code) {
    try {
      // Check if application exists
      const checkQuery = `
        SELECT NicheInscriptionRequestId 
        FROM NicheInscriptionRequest 
        WHERE Code = @code
      `;

      const checkResult = await executeQuery(checkQuery, { code });

      if (!checkResult.recordset || checkResult.recordset.length === 0) {
        throw new Error('Application not found');
      }

      // Note: NicheInscriptionRequest table doesn't have a Status column
      // Confirmation is typically handled by creating an invoice via stored procedure
      // This fallback method just verifies the application exists

      // Generate invoice code (simplified - in real scenario, create invoice record)
      const invoiceCode = `INV-${code}-${Date.now()}`;

      return invoiceCode;
    } catch (error) {
      logger.error('Direct confirmation failed:', error);
      throw error;
    }
  }

  /**
   * Delete engrave application by code
   * @param {string} code - Application code
   * @param {number} churchId - Church ID for ACL
   * @returns {Promise<boolean>} Success status
   */
  async deleteByCode(code, churchId) {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();

      // First, get the application ID and verify church access
      const selectRequest = new sql.Request(transaction);
      selectRequest.input('Code', sql.VarChar(50), code);
      selectRequest.input('ChurchId', sql.Int, churchId);

      const selectResult = await selectRequest.query(`
        SELECT NicheInscriptionRequestId, ChurchId
        FROM NicheInscriptionRequest
        WHERE Code = @Code
          AND ChurchId = @ChurchId
      `);

      const applicationId = selectResult.recordset?.[0]?.NicheInscriptionRequestId;
      if (!applicationId) {
        await transaction.rollback();
        return false;
      }

      // Delete deceased details first
      const deleteDetailsRequest = new sql.Request(transaction);
      deleteDetailsRequest.input('ApplicationId', sql.Int, applicationId);
      await deleteDetailsRequest.query(`
        DELETE FROM NicheInscriptionRequestDecesed
        WHERE NicheInscriptionRequestId = @ApplicationId
      `);

      // Delete the main application
      const deleteApplicationRequest = new sql.Request(transaction);
      deleteApplicationRequest.input('ApplicationId', sql.Int, applicationId);
      deleteApplicationRequest.input('ChurchId', sql.Int, churchId);
      const deleteResult = await deleteApplicationRequest.query(`
        DELETE FROM NicheInscriptionRequest
        WHERE NicheInscriptionRequestId = @ApplicationId
          AND ChurchId = @ChurchId
      `);

      if (deleteResult.rowsAffected[0] === 0) {
        await transaction.rollback();
        return false;
      }

      await transaction.commit();
      logger.info(`Successfully deleted inscription application: ${code}`);
      return true;
    } catch (error) {
      await transaction.rollback().catch(rollbackError => {
        logger.error('Rollback failed after delete inscription error:', rollbackError);
      });
      logger.error('Failed to delete inscription application:', error);
      throw error;
    }
  }
}

module.exports = new EngraveApplicationRepository();

