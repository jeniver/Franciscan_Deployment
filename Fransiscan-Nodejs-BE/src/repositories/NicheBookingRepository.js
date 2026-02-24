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
          na.NicheApplicationId,
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
          na.NomineeName,
          na.NomineeIDNo,
          na.NomineeEmailID,
          na.NomineeMobileNo,
          na.NomineeHomeTelNo,
          na.NomineeOfficeTelNo,
          na.NomineeRelationship,
          na.NomineeIsCatholic,
          na.NomineeAddressNo,
          na.NomineeAddressLine1,
          na.NomineeAddressLine2,
          na.NomineeAddressCity,
          na.NomineeAddressState,
          na.NomineeAddressCountry,
          na.NomineeName2,
          na.NomineeIDNo2,
          na.NomineeEmailID2,
          na.NomineeMobileNo2,
          na.NomineeHomeTelNo2,
          na.NomineeOfficeTelNo2,
          na.NomineeIsCatholic2,
          na.NomineeRelationship2,
          na.NomineeAddressNo2,
          na.NomineeAddressLine12,
          na.NomineeAddressLine22,
          na.NomineeAddressCity2,
          na.NomineeAddressState2,
          na.NomineeAddressCountry2,
          na.ChurchId,
          nb.NicheBookingId,
          nb.NicheId,
          nb.BookedDate,
          nb.BookingStatus,
          nb.Remarks,
          n.Code AS NicheCode,
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
          nominee.AddressNo AS NomineeAddressNo,
          nominee.AddressLine1 AS NomineeAddressLine1,
          nominee.AddressLine2 AS NomineeAddressLine2,
          nominee.AddressCity AS NomineeAddressCity,
          nominee.AddressState AS NomineeAddressState,
          nominee.AddressCountry AS NomineeAddressCountry,
          nominee2.Name AS Nominee2Name,
          nominee2.IDNo AS Nominee2IDNo,
          nominee2.MobileNo AS Nominee2MobileNo,
          nominee2.EmailID AS Nominee2EmailID,
          nominee2.AddressNo AS Nominee2AddressNo,
          nominee2.AddressLine1 AS Nominee2AddressLine1,
          nominee2.AddressLine2 AS Nominee2AddressLine2,
          nominee2.AddressCity AS Nominee2AddressCity,
          nominee2.AddressState AS Nominee2AddressState,
          nominee2.AddressCountry AS Nominee2AddressCountry
        FROM NicheApplication na WITH (NOLOCK)
        LEFT JOIN NicheBooking nb WITH (NOLOCK) ON na.NicheApplicationId = nb.NicheApplicationId AND nb.BookingStatus > 0
        LEFT JOIN Niche n WITH (NOLOCK) ON nb.NicheId = n.NicheId
        LEFT JOIN NicheRow nr WITH (NOLOCK) ON n.NicheRowlId = nr.NicheRowlId
        LEFT JOIN NicheWall nw WITH (NOLOCK) ON nr.NicheWallId = nw.NicheWallId
        LEFT JOIN Chapel c WITH (NOLOCK) ON nw.ChapelId = c.ChapelId
        LEFT JOIN Person contact WITH (NOLOCK) ON nb.ContactPersonId = contact.PersonId
        LEFT JOIN Person nominee WITH (NOLOCK) ON nb.NomineeId = nominee.PersonId
        LEFT JOIN Person nominee2 WITH (NOLOCK) ON nb.NomineeId2 = nominee2.PersonId
        WHERE na.Code = @code AND na.Status > 0
      `;

      const result = await executeQuery(query, { code: applicationCode });

      if (!result.recordset || result.recordset.length === 0) {
        return null;
      }

      const row = result.recordset[0];

      // Map to NicheBooking object
      const booking = new NicheBooking({
        ...row,
        contact: row.ContactName ? {
          name: row.ContactName,
          idNo: row.ContactIDNo,
          mobileNo: row.ContactMobileNo,
          emailID: row.ContactEmailID
        } : null,
        nominee: row.NomineeName ? {
          name: row.NomineeName,
          idNo: row.NomineeIDNo,
          mobileNo: row.NomineeMobileNo,
          emailID: row.NomineeEmailID,
          addressNo: row.NomineeAddressNo,
          addressLine1: row.NomineeAddressLine1,
          addressLine2: row.NomineeAddressLine2,
          addressCity: row.NomineeAddressCity,
          addressState: row.NomineeAddressState,
          addressCountry: row.NomineeAddressCountry
        } : null,
        nominee2: row.Nominee2Name ? {
          name: row.Nominee2Name,
          idNo: row.Nominee2IDNo,
          mobileNo: row.Nominee2MobileNo,
          emailID: row.Nominee2EmailID,
          addressNo: row.Nominee2AddressNo,
          addressLine1: row.Nominee2AddressLine1,
          addressLine2: row.Nominee2AddressLine2,
          addressCity: row.Nominee2AddressCity,
          addressState: row.Nominee2AddressState,
          addressCountry: row.Nominee2AddressCountry
        } : null,
        nicheApplication: {
          code: row.ApplicationCode,
          applicantId: row.NicheApplicationId,
          applicantName: row.ApplicantName,
          applicantIDNo: row.ApplicantIDNo,
          applicantEmailID: row.ApplicantEmailID,
          applicantMobileNo: row.ApplicantMobileNo,
          applicantHomeTelNo: row.ApplicantHomeTelNo,
          applicantAddressNo: row.ApplicantAddressNo,
          applicantAddressLine1: row.ApplicantAddressLine1,
          applicantAddressLine2: row.ApplicantAddressLine2,
          applicantAddressCity: row.ApplicantAddressCity,
          applicantAddressState: row.ApplicantAddressState,
          applicantAddressCountry: row.ApplicantAddressCountry,
          nomineeName: row.NomineeName,
          nomineeIDNo: row.NomineeIDNo,
          nomineeEmailID: row.NomineeEmailID,
          nomineeMobileNo: row.NomineeMobileNo,
          nomineeHomeTelNo: row.NomineeHomeTelNo,
          nomineeOfficeTelNo: row.NomineeOfficeTelNo,
          nomineeRelationship: row.NomineeRelationship,
          nomineeIsCatholic: row.NomineeIsCatholic,
          nomineeAddressNo: row.NomineeAddressNo,
          nomineeAddressLine1: row.NomineeAddressLine1,
          nomineeAddressLine2: row.NomineeAddressLine2,
          nomineeAddressCity: row.NomineeAddressCity,
          nomineeAddressState: row.NomineeAddressState,
          nomineeAddressCountry: row.NomineeAddressCountry,
          nomineeName2: row.NomineeName2,
          nomineeIDNo2: row.NomineeIDNo2,
          nomineeEmailID2: row.NomineeEmailID2,
          nomineeMobileNo2: row.NomineeMobileNo2,
          nomineeHomeTelNo2: row.NomineeHomeTelNo2,
          nomineeOfficeTelNo2: row.NomineeOfficeTelNo2,
          nomineeRelationship2: row.NomineeRelationship2,
          nomineeIsCatholic2: row.NomineeIsCatholic2,
          nomineeAddressNo2: row.NomineeAddressNo2,
          nomineeAddressLine12: row.NomineeAddressLine12,
          nomineeAddressLine22: row.NomineeAddressLine22,
          nomineeAddressCity2: row.NomineeAddressCity2,
          nomineeAddressState2: row.NomineeAddressState2,
          nomineeAddressCountry2: row.NomineeAddressCountry2,
          niche: row.NicheCode ? {
            code: row.NicheCode,
            nicheId: row.NicheId
          } : null
        },
        chapel: row.ChapelId ? {
          chapelId: row.ChapelId,
          code: row.ChapelCode,
          name: row.ChapelName
        } : null
      });

      // Get beneficiaries if booking exists
      if (row.NicheBookingId) {
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
      } else {
        booking.nicheBookingBeneficiaries = [];
      }

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
        INNER JOIN NicheRow nr WITH (NOLOCK) ON n.NicheRowlId = nr.NicheRowlId
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
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();

      // 1. Update the beneficiary status
      const updateBeneficiaryQuery = `
        UPDATE NicheBookingBeneficiary
        SET BeneficiaryStatus = @status
        WHERE NicheBookingBeneficiaryId = @beneficiaryId
      `;

      const beneficiaryRequest = new sql.Request(transaction);
      beneficiaryRequest.input('beneficiaryId', sql.Int, beneficiaryId);
      beneficiaryRequest.input('status', sql.Int, status);
      await beneficiaryRequest.query(updateBeneficiaryQuery);

      // 2. Synchronize physical Niche status
      if (status === 1) {
        // If status is 1 (Active/Occupied), update Niche status to 4 (Occupied)
        const updateNicheQuery = `
          UPDATE n
          SET n.Status = 4
          FROM Niche n
          JOIN NicheBooking nb ON n.NicheId = nb.NicheId
          JOIN NicheBookingBeneficiary nbb ON nb.NicheBookingId = nbb.NicheBookingId
          WHERE nbb.NicheBookingBeneficiaryId = @beneficiaryId
        `;
        const nicheRequest = new sql.Request(transaction);
        nicheRequest.input('beneficiaryId', sql.Int, beneficiaryId);
        await nicheRequest.query(updateNicheQuery);
      } else if (status === 0 || status === -1) {
        // If status is Not Occupied/Inactive, check if any OTHER beneficiaries are still active for this niche
        // If none are active, set niche status back to 3 (Booked)
        const checkActiveQuery = `
          SELECT COUNT(*) AS ActiveCount
          FROM NicheBookingBeneficiary nbb2
          JOIN NicheBooking nb ON nbb2.NicheBookingId = nb.NicheBookingId
          WHERE nb.NicheBookingId = (
            SELECT NicheBookingId FROM NicheBookingBeneficiary WHERE NicheBookingBeneficiaryId = @beneficiaryId
          )
          AND nbb2.BeneficiaryStatus = 1
          AND nbb2.NicheBookingBeneficiaryId <> @beneficiaryId
        `;
        const checkRequest = new sql.Request(transaction);
        checkRequest.input('beneficiaryId', sql.Int, beneficiaryId);
        const checkResult = await checkRequest.query(checkActiveQuery);
        const activeCount = checkResult.recordset[0].ActiveCount;

        if (activeCount === 0) {
          const revertNicheQuery = `
            UPDATE n
            SET n.Status = 3
            FROM Niche n
            JOIN NicheBooking nb ON n.NicheId = nb.NicheId
            JOIN NicheBookingBeneficiary nbb ON nb.NicheBookingId = nbb.NicheBookingId
            WHERE nbb.NicheBookingBeneficiaryId = @beneficiaryId
          `;
          const revertRequest = new sql.Request(transaction);
          revertRequest.input('beneficiaryId', sql.Int, beneficiaryId);
          await revertRequest.query(revertNicheQuery);
        }
      }

      await transaction.commit();
      return true;
    } catch (error) {
      if (transaction._aborted === false) {
        await transaction.rollback().catch(err => logger.error('Rollback failed:', err));
      }
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
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();

      const insertQuery = `
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

      const insertRequest = new sql.Request(transaction);
      const status = beneficiary.beneficiaryStatus ?? 1;

      insertRequest.input('nicheBookingId', sql.Int, beneficiary.nicheBookingId);
      insertRequest.input('personId', sql.Int, beneficiary.personId || null);
      insertRequest.input('name', sql.NVarChar, beneficiary.name);
      insertRequest.input('idNo', sql.NVarChar, beneficiary.idNo || null);
      insertRequest.input('isCatholic', sql.Bit, beneficiary.isCatholic);
      insertRequest.input('isMale', sql.Bit, beneficiary.isMale);
      insertRequest.input('relationshipToApplicant', sql.NVarChar, beneficiary.relationshipToApplicant || null);
      insertRequest.input('relationshipToNominee1', sql.NVarChar, beneficiary.relationshipToNominee1 || null);
      insertRequest.input('relationshipToNominee2', sql.NVarChar, beneficiary.relationshipToNominee2 || null);
      insertRequest.input('dateOfBirth', sql.DateTime, beneficiary.dateOfBirth || null);
      insertRequest.input('birthYear', sql.Int, beneficiary.birthYear || null);
      insertRequest.input('beneficiaryStatus', sql.Int, status);
      insertRequest.input('churchId', sql.Int, beneficiary.churchId);

      const result = await insertRequest.query(insertQuery);
      const beneficiaryId = result.recordset[0].BeneficiaryId;

      // If the added beneficiary is status 1 (Occupied), update the niche status to 4
      if (status === 1) {
        const updateNicheQuery = `
          UPDATE n
          SET n.Status = 4
          FROM Niche n
          JOIN NicheBooking nb ON n.NicheId = nb.NicheId
          WHERE nb.NicheBookingId = @nicheBookingId
        `;
        const nicheRequest = new sql.Request(transaction);
        nicheRequest.input('nicheBookingId', sql.Int, beneficiary.nicheBookingId);
        await nicheRequest.query(updateNicheQuery);
      }

      await transaction.commit();
      return beneficiaryId;
    } catch (error) {
      if (transaction._aborted === false) {
        await transaction.rollback().catch(err => logger.error('Rollback failed:', err));
      }
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

