const { executeQuery, getPool, sql } = require('../config/database');
const { NicheBooking, NicheBookingBeneficiary } = require('../models/NicheBooking');
const logger = require('../utils/logger');

let bookingTableHasCodeColumn = null;

async function ensureBookingCodeColumnFlag() {
  if (bookingTableHasCodeColumn !== null) {
    return bookingTableHasCodeColumn;
  }

  try {
    const result = await executeQuery(`
      SELECT 1 AS HasColumn
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'NicheBooking'
        AND COLUMN_NAME = 'Code'
    `);

    bookingTableHasCodeColumn = Boolean(result.recordset && result.recordset.length > 0);
    return bookingTableHasCodeColumn;
  } catch (error) {
    logger.warn('Unable to determine if NicheBooking.Code column exists. Assuming absent.', error);
    bookingTableHasCodeColumn = false;
    return bookingTableHasCodeColumn;
  }
}

class NicheBookingRepository {
  /**
   * Get niche booking by application code
   * @param {string} applicationCode - Niche application code
   * @returns {Promise<NicheBooking>} Booking with all related data
   */
  async getByApplicationCode(applicationCode) {
    try {
      const query = `
        SELECT 
          nb.*,
          na.Code AS ApplicationCode,
          na.ApplicantName,
          na.ApplicantIDNo,
          na.ApplicantEmailID,
          na.ApplicantMobileNo,
          na.ApplicantHomeTelNo,
          na.ApplicantAddressNo,
          na.ApplicantAddressLine1,
          na.ApplicantAddressLine2,
          na.ApplicantAddressCity,
          na.ApplicantAddressState,
          na.ApplicantAddressCountry,
          n.Code AS NicheCode,
          n.NicheId,
          c.ChapelId,
          c.Code AS ChapelCode,
          c.Name AS ChapelName,
          contact.Name AS ContactName,
          contact.IDNo AS ContactIDNo,
          contact.MobileNo AS ContactMobileNo,
          contact.EmailID AS ContactEmailID,
          nominee.Name AS NomineeName,
          nominee.IDNo AS NomineeIDNo,
          nominee.MobileNo AS NomineeMobileNo,
          nominee.EmailID AS NomineeEmailID,
          nominee2.Name AS Nominee2Name,
          nominee2.IDNo AS Nominee2IDNo
        FROM NicheBooking nb WITH (NOLOCK)
        INNER JOIN NicheApplication na WITH (NOLOCK) ON nb.NicheApplicationId = na.NicheApplicationId
        INNER JOIN Niche n WITH (NOLOCK) ON nb.NicheId = n.NicheId
        INNER JOIN NicheRow nr WITH (NOLOCK) ON n.NicheRowId = nr.NicheRowId
        INNER JOIN NicheWall nw WITH (NOLOCK) ON nr.NicheWallId = nw.NicheWallId
        INNER JOIN Chapel c WITH (NOLOCK) ON nw.ChapelId = c.ChapelId
        LEFT JOIN Person contact WITH (NOLOCK) ON nb.ContactPersonId = contact.PersonId
        LEFT JOIN Person nominee WITH (NOLOCK) ON nb.NomineeId = nominee.PersonId
        LEFT JOIN Person nominee2 WITH (NOLOCK) ON nb.NomineeId2 = nominee2.PersonId
        WHERE na.Code = @code AND nb.BookingStatus > 0
      `;

      const result = await executeQuery(query, { code: applicationCode });

      if (!result.recordset || result.recordset.length === 0) {
        return null;
      }

      const row = result.recordset[0];

      // Map to NicheBooking object
      const booking = new NicheBooking({
        ...row,
        contact: {
          name: row.ContactName,
          idNo: row.ContactIDNo,
          mobileNo: row.ContactMobileNo,
          emailID: row.ContactEmailID
        },
        nominee: {
          name: row.NomineeName,
          idNo: row.NomineeIDNo,
          mobileNo: row.NomineeMobileNo,
          emailID: row.NomineeEmailID
        },
        nominee2: row.Nominee2Name
          ? {
            name: row.Nominee2Name,
            idNo: row.Nominee2IDNo
          }
          : null,
        nicheApplication: {
          code: row.ApplicationCode,
          applicantName: row.ApplicantName,
          applicantIDNo: row.ApplicantIDNo,
          niche: {
            code: row.NicheCode,
            nicheId: row.NicheId
          }
        },
        chapel: {
          chapelId: row.ChapelId,
          code: row.ChapelCode,
          name: row.ChapelName
        }
      });

      // Get beneficiaries
      const beneficiariesQuery = `
        SELECT * FROM NicheBookingBeneficiary WITH (NOLOCK)
        WHERE NicheBookingId = @bookingId AND BeneficiaryStatus >= 0
        ORDER BY NicheBookingBeneficiaryId
      `;

      const beneficiariesResult = await executeQuery(beneficiariesQuery, {
        bookingId: row.NicheBookingId
      });

      booking.nicheBookingBeneficiaries = beneficiariesResult.recordset.map(b =>
        new NicheBookingBeneficiary(b)
      );

      return booking;
    } catch (error) {
      logger.error('Failed to get niche booking:', error);
      throw error;
    }
  }

  /**
   * Search niche bookings by criteria
   * @param {Object} searchParams - Search parameters
   * @returns {Promise<Array<NicheBooking>>} List of bookings
   */
  async search(searchParams) {
    try {
      let query = `
        SELECT 
          nb.NicheBookingId,
          nb.Code,
          nb.BookedDate,
          na.Code AS ApplicationCode,
          na.ApplicantName,
          na.ApplicantIDNo,
          na.ApplicantAddressNo,
          na.ApplicantAddressLine1,
          na.ApplicantAddressLine2,
          n.Code AS NicheCode,
          c.Code AS ChapelCode,
          c.Name AS ChapelName,
          contact.Name AS ContactName,
          contact.IDNo AS ContactIDNo,
          contact.MobileNo AS ContactMobileNo,
          nominee.Name AS NomineeName,
          nominee.IDNo AS NomineeIDNo,
          beneficiary.Name AS BeneficiaryName
        FROM NicheBooking nb WITH (NOLOCK)
        INNER JOIN NicheApplication na WITH (NOLOCK) ON nb.NicheApplicationId = na.NicheApplicationId
        INNER JOIN Niche n WITH (NOLOCK) ON nb.NicheId = n.NicheId
        INNER JOIN NicheRow nr WITH (NOLOCK) ON n.NicheRowId = nr.NicheRowId
        INNER JOIN NicheWall nw WITH (NOLOCK) ON nr.NicheWallId = nw.NicheWallId
        INNER JOIN Chapel c WITH (NOLOCK) ON nw.ChapelId = c.ChapelId
        LEFT JOIN Person contact WITH (NOLOCK) ON nb.ContactPersonId = contact.PersonId
        LEFT JOIN Person nominee WITH (NOLOCK) ON nb.NomineeId = nominee.PersonId
        LEFT JOIN NicheBookingBeneficiary nbb WITH (NOLOCK) ON nb.NicheBookingId = nbb.NicheBookingId
        LEFT JOIN (
          SELECT DISTINCT NicheBookingId, Name 
          FROM NicheBookingBeneficiary WITH (NOLOCK)
          WHERE BeneficiaryStatus >= 0
        ) beneficiary ON nb.NicheBookingId = beneficiary.NicheBookingId
        WHERE nb.ChurchId = @churchId 
        AND nb.BookingStatus > 0
      `;

      const params = { churchId: searchParams.churchId };

      // Add search criteria
      if (searchParams.contactName) {
        query += ' AND contact.Name LIKE @contactName';
        params.contactName = `%${searchParams.contactName}%`;
      }

      if (searchParams.contactIDNo) {
        query += ' AND contact.IDNo LIKE @contactIDNo';
        params.contactIDNo = `%${searchParams.contactIDNo}%`;
      }

      if (searchParams.nicheCode) {
        query += ' AND n.Code LIKE @nicheCode';
        params.nicheCode = `%${searchParams.nicheCode}%`;
      }

      if (searchParams.bookedDate) {
        query += ' AND CAST(nb.BookedDate AS DATE) = CAST(@bookedDate AS DATE)';
        params.bookedDate = searchParams.bookedDate;
      }

      if (searchParams.nomineeName) {
        query += ' AND nominee.Name LIKE @nomineeName';
        params.nomineeName = `%${searchParams.nomineeName}%`;
      }

      if (searchParams.nomineeIDNo) {
        query += ' AND nominee.IDNo LIKE @nomineeIDNo';
        params.nomineeIDNo = `%${searchParams.nomineeIDNo}%`;
      }

      if (searchParams.beneficiaryName) {
        query += ' AND beneficiary.Name LIKE @beneficiaryName';
        params.beneficiaryName = `%${searchParams.beneficiaryName}%`;
      }

      if (searchParams.chapelCode) {
        query += ' AND c.Code LIKE @chapelCode';
        params.chapelCode = `%${searchParams.chapelCode}%`;
      }

      if (searchParams.applicantAddress) {
        query += ' AND (na.ApplicantAddressLine1 LIKE @address OR na.ApplicantAddressLine2 LIKE @address)';
        params.address = `%${searchParams.applicantAddress}%`;
      }

      query += ' ORDER BY nb.BookedDate DESC, nb.NicheBookingId DESC';

      const result = await executeQuery(query, params);

      if (!result.recordset || result.recordset.length === 0) {
        return [];
      }

      // Group by booking ID to avoid duplicates from beneficiaries join
      const bookingsMap = new Map();

      result.recordset.forEach(row => {
        if (!bookingsMap.has(row.NicheBookingId)) {
          bookingsMap.set(row.NicheBookingId, {
            nicheBookingId: row.NicheBookingId,
            code: row.Code,
            bookedDate: row.BookedDate,
            applicationCode: row.ApplicationCode,
            applicantName: row.ApplicantName,
            applicantIDNo: row.ApplicantIDNo,
            applicantAddress: [
              row.ApplicantAddressNo,
              row.ApplicantAddressLine1,
              row.ApplicantAddressLine2
            ].filter(Boolean).join(', '),
            nicheCode: row.NicheCode,
            chapelCode: row.ChapelCode,
            chapelName: row.ChapelName,
            contactName: row.ContactName,
            contactIDNo: row.ContactIDNo,
            contactMobileNo: row.ContactMobileNo,
            nomineeName: row.NomineeName,
            nomineeIDNo: row.NomineeIDNo,
            beneficiaryName: row.BeneficiaryName
          });
        }
      });

      return Array.from(bookingsMap.values());
    } catch (error) {
      logger.error('Failed to search niche bookings:', error);
      throw error;
    }
  }

  /**
   * Update beneficiary details
   * @param {NicheBookingBeneficiary} beneficiary - Beneficiary to update
   * @returns {Promise<boolean>} Success status
   */
  async updateBeneficiary(beneficiary) {
    try {
      const query = `
        UPDATE NicheBookingBeneficiary
        SET 
          Name = @name,
          IDNo = @idNo,
          IsCatholic = @isCatholic,
          IsMale = @isMale,
          RelationshipToApplicant = @relationshipToApplicant,
          RelationshipToNominee1 = @relationshipToNominee1,
          RelationshipToNominee2 = @relationshipToNominee2,
          DateOfBirth = @dateOfBirth,
          BirthYear = @birthYear
        WHERE NicheBookingBeneficiaryId = @beneficiaryId
      `;

      await executeQuery(query, {
        beneficiaryId: beneficiary.nicheBookingBeneficiaryId,
        name: beneficiary.name,
        idNo: beneficiary.idNo,
        isCatholic: beneficiary.isCatholic,
        isMale: beneficiary.isMale,
        relationshipToApplicant: beneficiary.relationshipToApplicant,
        relationshipToNominee1: beneficiary.relationshipToNominee1 || null,
        relationshipToNominee2: beneficiary.relationshipToNominee2 || null,
        dateOfBirth: beneficiary.dateOfBirth,
        birthYear: beneficiary.birthYear || null
      });

      return true;
    } catch (error) {
      logger.error('Failed to update beneficiary:', error);
      throw error;
    }
  }

  /**
   * Update niche booking metadata (remarks, dates, etc.)
   * @param {Object} booking - Booking data
   * @returns {Promise<boolean>} Success status
   */
  async updateBooking(booking) {
    try {
      const query = `
        UPDATE NicheBooking
        SET 
          BookedDate = @bookedDate,
          Remarks = @remarks,
          NomineeId2 = @nomineeId2,
          ContactPersonId = @contactPersonId,
          NomineeId = @nomineeId
        WHERE NicheBookingId = @bookingId
      `;

      await executeQuery(query, {
        bookingId: booking.nicheBookingId,
        bookedDate: booking.bookedDate,
        remarks: booking.remarks || null,
        nomineeId2: booking.nomineeId2 || null,
        contactPersonId: booking.contactPersonId,
        nomineeId: booking.nomineeId
      });

      return true;
    } catch (error) {
      logger.error('Failed to update niche booking:', error);
      throw error;
    }
  }

  /**
   * Update beneficiary status (active/inactive)
   * @param {number} beneficiaryId - Beneficiary ID
   * @param {number} status - Status (1=Active, 0=Inactive)
   * @returns {Promise<boolean>} Success status
   */
  async updateBeneficiaryStatus(beneficiaryId, status) {
    try {
      const query = `
        UPDATE NicheBookingBeneficiary
        SET BeneficiaryStatus = @status
        WHERE NicheBookingBeneficiaryId = @beneficiaryId
      `;

      await executeQuery(query, {
        beneficiaryId,
        status
      });

      return true;
    } catch (error) {
      logger.error('Failed to update beneficiary status:', error);
      throw error;
    }
  }

  /**
   * Add second beneficiary
   * @param {NicheBookingBeneficiary} beneficiary - Beneficiary data
   * @returns {Promise<number>} New beneficiary ID
   */
  async addBeneficiary(beneficiary) {
    try {
      const query = `
        INSERT INTO NicheBookingBeneficiary (
          NicheBookingId,
          PersonId,
          Name,
          IDNo,
          IsCatholic,
          IsMale,
          RelationshipToApplicant,
          RelationshipToNominee1,
          RelationshipToNominee2,
          DateOfBirth,
          BirthYear,
          BeneficiaryStatus,
          ChurchId
        )
        OUTPUT INSERTED.NicheBookingBeneficiaryId AS BeneficiaryId
        VALUES (
          @nicheBookingId,
          @personId,
          @name,
          @idNo,
          @isCatholic,
          @isMale,
          @relationshipToApplicant,
          @relationshipToNominee1,
          @relationshipToNominee2,
          @dateOfBirth,
          @birthYear,
          @beneficiaryStatus,
          @churchId
        );
      `;

      const result = await executeQuery(query, {
        nicheBookingId: beneficiary.nicheBookingId,
        personId: beneficiary.personId || null,
        name: beneficiary.name,
        idNo: beneficiary.idNo || null,
        isCatholic: beneficiary.isCatholic,
        isMale: beneficiary.isMale,
        relationshipToApplicant: beneficiary.relationshipToApplicant || null,
        relationshipToNominee1: beneficiary.relationshipToNominee1 || null,
        relationshipToNominee2: beneficiary.relationshipToNominee2 || null,
        dateOfBirth: beneficiary.dateOfBirth || null,
        birthYear: beneficiary.birthYear || null,
        beneficiaryStatus: beneficiary.beneficiaryStatus ?? 1,
        churchId: beneficiary.churchId
      });

      return result.recordset[0].BeneficiaryId;
    } catch (error) {
      logger.error('Failed to add beneficiary:', error);
      throw error;
    }
  }

  /**
   * Delete niche booking (soft delete)
   * @param {string} applicationCode - Application code
   * @returns {Promise<boolean>} Success status
   */
  async deleteByApplicationCode(applicationCode) {
    try {
      // Get booking first
      const getQuery = `
        SELECT nb.NicheBookingId, nb.NicheId 
        FROM NicheBooking nb WITH (NOLOCK)
        INNER JOIN NicheApplication na WITH (NOLOCK) ON nb.NicheApplicationId = na.NicheApplicationId
        WHERE na.Code = @code
      `;

      const getResult = await executeQuery(getQuery, { code: applicationCode });

      if (!getResult.recordset || getResult.recordset.length === 0) {
        return false;
      }

      const { NicheBookingId, NicheId } = getResult.recordset[0];

      // Update booking status to deleted
      const updateQuery = `
        UPDATE NicheBooking 
        SET BookingStatus = 0 
        WHERE NicheBookingId = @bookingId
      `;

      await executeQuery(updateQuery, { bookingId: NicheBookingId });

      // Update niche status back to vacant
      const updateNicheQuery = `
        UPDATE Niche 
        SET Status = 1 
        WHERE NicheId = @nicheId
      `;

      await executeQuery(updateNicheQuery, { nicheId: NicheId });

      return true;
    } catch (error) {
      logger.error('Failed to delete niche booking:', error);
      throw error;
    }
  }

  /**
   * Get booking by niche ID
   * @param {number} nicheId - Niche ID
   * @returns {Promise<NicheBooking>} Booking or null
   */
  async getByNicheId(nicheId) {
    try {
      const query = `
        SELECT 
          nb.*,
          na.Code AS ApplicationCode,
          na.ApplicantName
        FROM NicheBooking nb WITH (NOLOCK)
        INNER JOIN NicheApplication na WITH (NOLOCK) ON nb.NicheApplicationId = na.NicheApplicationId
        WHERE nb.NicheId = @nicheId AND nb.BookingStatus > 0
      `;

      const result = await executeQuery(query, { nicheId });

      if (!result.recordset || result.recordset.length === 0) {
        return null;
      }

      return new NicheBooking(result.recordset[0]);
    } catch (error) {
      logger.error('Failed to get booking by niche ID:', error);
      throw error;
    }
  }

  async hasActiveBookingForApplication(nicheApplicationId) {
    try {
      const hasCodeColumn = await ensureBookingCodeColumnFlag();
      const selectFields = hasCodeColumn
        ? 'nb.NicheBookingId, nb.Code'
        : 'nb.NicheBookingId, na.Code AS ApplicationCode';

      const query = `
        SELECT TOP 1 ${selectFields}
        FROM NicheBooking nb WITH (NOLOCK)
        INNER JOIN NicheApplication na WITH (NOLOCK) ON nb.NicheApplicationId = na.NicheApplicationId
        WHERE nb.NicheApplicationId = @nicheApplicationId
          AND nb.BookingStatus > 0
      `;

      const result = await executeQuery(query, { nicheApplicationId });
      return result.recordset && result.recordset.length > 0
        ? result.recordset[0]
        : null;
    } catch (error) {
      logger.error('Failed to check booking by application:', error);
      throw error;
    }
  }

  async hasActiveBookingForPerson(name, idNo, churchId) {
    if (!name || !idNo) {
      return null;
    }

    try {
      const hasCodeColumn = await ensureBookingCodeColumnFlag();
      const selectFields = hasCodeColumn
        ? 'nb.NicheBookingId, nb.Code'
        : 'nb.NicheBookingId, na.Code AS ApplicationCode';

      const query = `
        SELECT TOP 1 ${selectFields}
        FROM NicheBooking nb WITH (NOLOCK)
        INNER JOIN NicheApplication na WITH (NOLOCK) ON nb.NicheApplicationId = na.NicheApplicationId
        LEFT JOIN Person contact WITH (NOLOCK) ON nb.ContactPersonId = contact.PersonId
        LEFT JOIN Person nominee WITH (NOLOCK) ON nb.NomineeId = nominee.PersonId
        WHERE nb.BookingStatus > 0
          AND nb.ChurchId = @churchId
          AND (
            (contact.Name = @name AND contact.IDNo = @idNo)
            OR (nominee.Name = @name AND nominee.IDNo = @idNo)
          )
      `;

      const result = await executeQuery(query, { name, idNo, churchId });
      return result.recordset && result.recordset.length > 0
        ? result.recordset[0]
        : null;
    } catch (error) {
      logger.error('Failed to check duplicate booking by person:', error);
      throw error;
    }
  }

  async getPersonById(personId) {
    try {
      const query = `
        SELECT PersonId, Name, IDNo, EmailID, ChurchId
        FROM Person WITH (NOLOCK)
        WHERE PersonId = @personId
      `;

      const result = await executeQuery(query, { personId });
      return result.recordset && result.recordset.length > 0
        ? result.recordset[0]
        : null;
    } catch (error) {
      logger.error('Failed to retrieve person details:', error);
      throw error;
    }
  }

  async createBooking(booking) {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();

      const hasCodeColumn = await ensureBookingCodeColumnFlag();
      let code = null;

      if (hasCodeColumn) {
        code = await this._generateNextBookingCode(transaction, booking.churchId);
      }

      const insertRequest = new sql.Request(transaction);
      insertRequest.input('NicheApplicationId', sql.Int, booking.nicheApplicationId);
      insertRequest.input('NicheId', sql.Int, booking.nicheId);
      insertRequest.input('ContactPersonId', sql.Int, booking.contactPersonId);
      insertRequest.input('NomineeId', sql.Int, booking.nomineeId);
      insertRequest.input('NomineeId2', sql.Int, booking.nomineeId2 || null);
      insertRequest.input('BookedDate', sql.DateTime, booking.bookedDate || new Date());
      insertRequest.input('Remarks', sql.NVarChar(sql.MAX), booking.remarks || null);
      insertRequest.input('BookingStatus', sql.Int, booking.bookingStatus || 1);
      insertRequest.input('ChurchId', sql.Int, booking.churchId);
      insertRequest.input('UserId', sql.Int, booking.userId || null);

      if (hasCodeColumn) {
        insertRequest.input('Code', sql.VarChar(50), code);
      }

      const insertQuery = `
        INSERT INTO NicheBooking (
          NicheApplicationId, NicheId, ContactPersonId, NomineeId, NomineeId2,
          BookedDate${hasCodeColumn ? ', Code' : ''}, Remarks, BookingStatus, ChurchId, UserId
        )
        VALUES (
          @NicheApplicationId, @NicheId, @ContactPersonId, @NomineeId, @NomineeId2,
          @BookedDate${hasCodeColumn ? ', @Code' : ''}, @Remarks, @BookingStatus, @ChurchId, @UserId
        );
        SELECT SCOPE_IDENTITY() AS NicheBookingId;
      `;

      const insertResult = await insertRequest.query(insertQuery);

      const nicheBookingId = insertResult.recordset[0].NicheBookingId;

      const updateNicheRequest = new sql.Request(transaction);
      updateNicheRequest.input('NicheId', sql.Int, booking.nicheId);
      await updateNicheRequest.query(`
        UPDATE Niche
        SET Status = 3
        WHERE NicheId = @NicheId
      `);

      const updateApplicationRequest = new sql.Request(transaction);
      updateApplicationRequest.input('NicheApplicationId', sql.Int, booking.nicheApplicationId);
      await updateApplicationRequest.query(`
        UPDATE NicheApplication
        SET Status = 3
        WHERE NicheApplicationId = @NicheApplicationId
      `);

      await transaction.commit();

      return {
        id: nicheBookingId,
        code
      };
    } catch (error) {
      await transaction.rollback().catch(rollbackError => {
        logger.error('Rollback failed after createBooking error:', rollbackError);
      });
      logger.error('Failed to create niche booking:', error);
      throw error;
    }
  }

  async _generateNextBookingCode(transaction, churchId) {
    const request = new sql.Request(transaction);
    request.input('ChurchId', sql.Int, churchId);

    const result = await request.query(`
      SELECT TOP 1 Code
      FROM NicheBooking WITH (UPDLOCK, HOLDLOCK)
      WHERE ChurchId = @ChurchId
      ORDER BY NicheBookingId DESC
    `);

    const latestCode = result.recordset && result.recordset.length > 0
      ? result.recordset[0].Code
      : null;

    const nextNumber = latestCode
      ? (parseInt(latestCode.replace(/[^0-9]/g, ''), 10) || 0) + 1
      : 1;

    return `NBK-${nextNumber.toString().padStart(5, '0')}`;
  }
}

module.exports = new NicheBookingRepository();

