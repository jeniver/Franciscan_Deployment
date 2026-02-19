const BaseService = require('./BaseService');
const Person = require('../models/Person');
const { executeQuery } = require('../config/database');

/**
 * Person service for business logic
 */
class PersonService extends BaseService {
  constructor(personRepository) {
    super(personRepository);
  }

  /**
   * Validate person data
   * @param {Object} data - Person data
   * @param {boolean} isUpdate - Whether this is an update operation
   * @returns {Array} Array of validation errors
   */
  validateData(data, isUpdate = false) {
    const errors = [];
    const person = new Person(data);

    // Use model validation
    const modelErrors = person.validate();
    errors.push(...modelErrors);

    return errors;
  }

  /**
   * Upsert person details by ID number (NRIC/FIN)
   * @param {Object} data - Person data (camelCase keys)
   * @returns {Promise<Person>} Upserted person
   */
  async upsertByIdNo(data) {
    const errors = this.validateData(data, Boolean(data.personId));
    if (errors.length > 0) {
      const error = new Error(`Validation failed: ${errors.join(', ')}`);
      error.code = 'PERSON_VALIDATION_FAILED';
      throw error;
    }

    return this.repository.upsertByIdNo(data);
  }

  /**
   * Get customer-related persons (Contact Persons, Beneficiaries, Nominees)
   * with pagination and optional search
   * @param {Object} options
   * @param {number} options.page
   * @param {number} options.limit
   * @param {string} [options.q] - Search term (name, IDNo, email)
   * @returns {Promise<Object>} Paginated results
   */
  async getCustomerRelated(options = {}) {
    const { page = 1, limit = 10, q, churchId } = options;

    // Build WHERE conditions
    const conditions = [];
    const params = {};

    if (q && q.trim() !== '') {
      conditions.push('(p.Name LIKE @search OR p.IDNo LIKE @search OR p.EmailID LIKE @search)');
      params.search = `%${q.trim()}%`;
    }

    // Scope by church when available to avoid full-table scans
    if (churchId) {
      conditions.push('p.ChurchId = @churchId');
      params.churchId = churchId;
    }

    // Only include persons that are used as contact person, nominee, or beneficiary
    // Note: Beneficiaries are linked via NicheBookingBeneficiary by non-empty IDNo (no PersonId FK)
    conditions.push(`(
      EXISTS (SELECT 1 FROM NicheBooking nb WHERE nb.ContactPersonId = p.PersonId)
      OR EXISTS (SELECT 1 FROM NicheBooking nb2 WHERE nb2.NomineeId = p.PersonId OR nb2.NomineeId2 = p.PersonId)
      OR EXISTS (
        SELECT 1
        FROM NicheBookingBeneficiary nbb
        WHERE nbb.IDNo IS NOT NULL
          AND LTRIM(RTRIM(nbb.IDNo)) <> ''
          AND nbb.IDNo = p.IDNo
      )
    )`);

    // Filter out placeholder/test persons:
    // Must have a real name, or a real (non-placeholder) IDNo, or a real (non-placeholder) email
    conditions.push(`(
      (p.Name IS NOT NULL AND LTRIM(RTRIM(p.Name)) <> '')
      OR (p.IDNo IS NOT NULL AND LTRIM(RTRIM(p.IDNo)) <> '' AND p.IDNo <> '0000000000')
      OR (p.EmailID IS NOT NULL AND LTRIM(RTRIM(p.EmailID)) <> '' AND p.EmailID <> 'test@gmail.com')
    )`);

    // Also exclude records that have ALL placeholder values (no name + placeholder ID + placeholder email)
    conditions.push(`NOT (
      (p.Name IS NULL OR LTRIM(RTRIM(p.Name)) = '')
      AND (p.IDNo IS NULL OR LTRIM(RTRIM(p.IDNo)) = '' OR p.IDNo = '0000000000')
      AND (p.EmailID IS NULL OR LTRIM(RTRIM(p.EmailID)) = '' OR p.EmailID = 'test@gmail.com')
    )`);

    const whereClause = conditions.join(' AND ');
    const safeLimit = Math.min(parseInt(limit) || 10, 100);
    const offset = (page - 1) * safeLimit;

    const query = `
      SELECT
        p.*,
        CASE WHEN EXISTS (SELECT 1 FROM NicheBooking nb WHERE nb.ContactPersonId = p.PersonId) THEN 1 ELSE 0 END AS IsContactPerson,
        CASE WHEN EXISTS (SELECT 1 FROM NicheBooking nb2 WHERE nb2.NomineeId = p.PersonId OR nb2.NomineeId2 = p.PersonId) THEN 1 ELSE 0 END AS IsNominee,
        CASE WHEN EXISTS (
          SELECT 1
          FROM NicheBookingBeneficiary nbb
          WHERE nbb.IDNo IS NOT NULL
            AND LTRIM(RTRIM(nbb.IDNo)) <> ''
            AND nbb.IDNo = p.IDNo
        ) THEN 1 ELSE 0 END AS IsBeneficiary
      FROM Person p
      WHERE ${whereClause}
      ORDER BY CASE WHEN p.Name IS NOT NULL AND LTRIM(RTRIM(p.Name)) <> '' THEN 0 ELSE 1 END, p.Name
      OFFSET ${offset} ROWS FETCH NEXT ${safeLimit} ROWS ONLY
    `;

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM Person p
      WHERE ${whereClause}
    `;

    const [dataResult, countResult] = await Promise.all([
      executeQuery(query, params),
      executeQuery(countQuery, params)
    ]);

    const persons = dataResult.recordset.map(row => {
      const person = new Person(row);
      // Attach role flags
      person.isContactPerson = !!row.IsContactPerson;
      person.isNominee = !!row.IsNominee;
      person.isBeneficiary = !!row.IsBeneficiary;
      return person;
    });

    const total = countResult.recordset[0]?.total || 0;

    return {
      data: persons,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get a single customer-related person by ID (with role flags)
   * @param {number} id - PersonId
   * @returns {Promise<Person|null>}
   */
  async getCustomerById(id) {
    const query = `
      SELECT
        p.*,
        CASE WHEN EXISTS (SELECT 1 FROM NicheBooking nb WHERE nb.ContactPersonId = p.PersonId) THEN 1 ELSE 0 END AS IsContactPerson,
        CASE WHEN EXISTS (SELECT 1 FROM NicheBooking nb2 WHERE nb2.NomineeId = p.PersonId OR nb2.NomineeId2 = p.PersonId) THEN 1 ELSE 0 END AS IsNominee,
        CASE WHEN EXISTS (
          SELECT 1
          FROM NicheBookingBeneficiary nbb
          WHERE nbb.IDNo IS NOT NULL
            AND LTRIM(RTRIM(nbb.IDNo)) <> ''
            AND nbb.IDNo = p.IDNo
        ) THEN 1 ELSE 0 END AS IsBeneficiary
      FROM Person p
      WHERE p.PersonId = @id
    `;

    const result = await executeQuery(query, { id });
    const row = result.recordset[0];

    if (!row) {
      return null;
    }

    const person = new Person(row);
    person.isContactPerson = !!row.IsContactPerson;
    person.isNominee = !!row.IsNominee;
    person.isBeneficiary = !!row.IsBeneficiary;
    return person;
  }

  /**
   * Get a comprehensive person profile with all related records
   * @param {number} id - PersonId
   * @returns {Promise<Object|null>} Full profile or null
   */
  async getPersonProfile(id) {
    // 1. Get person with role flags
    const person = await this.getCustomerById(id);
    if (!person) return null;

    const personName = (person.name || '').trim();
    const personIdNo = (person.idNo || '').trim();

    // Build name/IDNo match conditions for tables without FK
    const nameConditions = [];
    const nameParams = { personId: id };

    if (personName) {
      nameParams.personName = personName;
    }
    if (personIdNo) {
      nameParams.personIdNo = personIdNo;
    }

    // 2. Niche Bookings — linked via ContactPersonId or NomineeId FK
    const nicheBookingsQuery = `
      SELECT TOP 50
        nb.NicheBookingId, nb.BookedDate, nb.BookingStatus,
        nb.NicheId, nb.NicheApplicationId, nb.ContactPersonId, nb.NomineeId, nb.NomineeId2,
        na.Code,
        n.Code AS NicheCode, nw.Name AS WallName, nr.Name AS RowName,
        ch.Name AS ChapelName,
        CASE 
          WHEN nb.ContactPersonId = @personId THEN 'Contact Person'
          WHEN nb.NomineeId = @personId THEN 'Nominee 1'
          WHEN nb.NomineeId2 = @personId THEN 'Nominee 2'
          ELSE 'Related'
        END AS PersonRole
      FROM NicheBooking nb
      LEFT JOIN NicheApplication na ON nb.NicheApplicationId = na.NicheApplicationId
      LEFT JOIN Niche n ON nb.NicheId = n.NicheId
      LEFT JOIN NicheRow nr ON n.NicheRowlId = nr.NicheRowlId
      LEFT JOIN NicheWall nw ON nr.NicheWallId = nw.NicheWallId
      LEFT JOIN Chapel ch ON nw.ChapelId = ch.ChapelId
      WHERE nb.ContactPersonId = @personId
         OR nb.NomineeId = @personId
         OR nb.NomineeId2 = @personId
      ORDER BY nb.BookedDate DESC
    `;

    // 3. Niche Applications — matched by applicant name/IDNo
    let nicheAppsQuery = `SELECT TOP 50
        na.NicheApplicationId, na.Code, na.AppliedDate, na.Status,
        na.ApplicantName, na.ApplicantIDNo, na.NicheId, na.Amount,
        n.Code AS NicheCode, ch.Name AS ChapelName
      FROM NicheApplication na
      LEFT JOIN Niche n ON na.NicheId = n.NicheId
      LEFT JOIN NicheRow nr ON n.NicheRowlId = nr.NicheRowlId
      LEFT JOIN NicheWall nw ON nr.NicheWallId = nw.NicheWallId
      LEFT JOIN Chapel ch ON nw.ChapelId = ch.ChapelId
      WHERE 1=0`;

    if (personName) {
      nicheAppsQuery += ` OR na.ApplicantName = @personName`;
    }
    if (personIdNo) {
      nicheAppsQuery += ` OR na.ApplicantIDNo = @personIdNo`;
    }
    nicheAppsQuery += ` ORDER BY na.AppliedDate DESC`;

    // 4. Wake Room Bookings — matched by applicant name/IDNo
    let wakeRoomQuery = `SELECT TOP 50
        wrb.WakeRoomBookingId, wrb.Code, wrb.UsingDate, wrb.Status,
        wrb.ApplicantName, wrb.ApplicantIDNo, wrb.NameOfDeceased,
        wrb.HallNo, wrb.DonationAmount,
        wr.Name AS WakeRoomName
      FROM WakeRoomBooking wrb
      LEFT JOIN WakeRoom wr ON wrb.WakeRoomId = wr.WakeRoomId
      WHERE 1=0`;

    if (personName) {
      wakeRoomQuery += ` OR wrb.ApplicantName = @personName`;
    }
    if (personIdNo) {
      wakeRoomQuery += ` OR wrb.ApplicantIDNo = @personIdNo`;
    }
    wakeRoomQuery += ` ORDER BY wrb.UsingDate DESC`;

    // 5. Invoices — matched by CustomerName (PersonId FK missing in DB)
    let invoicesQuery = `SELECT TOP 50
        i.InvoiceId, i.Code, i.TransactionDate, i.CustomerName,
        i.TotalAmount, i.PayingAmount, i.PaymentMode, i.Status,
        i.RefDocNumber, i.RefDocName
      FROM Invoice i
      WHERE 1=0`;

    if (personName) {
      invoicesQuery += ` OR i.CustomerName = @personName`;
    }
    invoicesQuery += ` ORDER BY i.TransactionDate DESC`;

    // 6. Receipts — linked via CustomerName or joined Invoice
    let receiptsQuery = `SELECT TOP 50
        r.ReceiptId, r.Code, r.TransactionDate, r.CustomerName,
        r.TotalAmount, r.PayingAmount, r.PaymentMode, r.Status,
        i.RefDocNumber
      FROM Receipt r
      LEFT JOIN Invoice i ON r.InvoiceId = i.InvoiceId
      WHERE r.CustomerName = @personName
      ORDER BY r.TransactionDate DESC`;

    try {
      // Execute all queries in parallel
      const queries = [
        executeQuery(nicheBookingsQuery, nameParams),
        executeQuery(nicheAppsQuery, nameParams),
        executeQuery(wakeRoomQuery, nameParams),
        executeQuery(invoicesQuery, nameParams),
      ];

      // Only query receipts if we have a person name
      if (personName) {
        queries.push(executeQuery(receiptsQuery, nameParams));
      }

      const results = await Promise.all(queries);

      return {
        person,
        nicheBookings: results[0].recordset || [],
        nicheApplications: results[1].recordset || [],
        wakeRoomBookings: results[2].recordset || [],
        invoices: results[3].recordset || [],
        receipts: (results[4] && results[4].recordset) || [],
      };
    } catch (error) {
      const logger = require('../utils/logger');
      logger.error('Error getting person profile:', error);
      // Return person data even if related queries fail
      return {
        person,
        nicheBookings: [],
        nicheApplications: [],
        wakeRoomBookings: [],
        invoices: [],
        receipts: [],
      };
    }
  }
}

module.exports = PersonService;
