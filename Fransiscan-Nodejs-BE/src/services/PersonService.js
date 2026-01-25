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

    // Filter out completely empty placeholder persons (no name, no ID, no email)
    conditions.push(`(
      (p.Name IS NOT NULL AND LTRIM(RTRIM(p.Name)) <> '')
      OR (p.IDNo IS NOT NULL AND LTRIM(RTRIM(p.IDNo)) <> '')
      OR (p.EmailID IS NOT NULL AND LTRIM(RTRIM(p.EmailID)) <> '')
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
      ORDER BY p.Name
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
}

module.exports = PersonService;
