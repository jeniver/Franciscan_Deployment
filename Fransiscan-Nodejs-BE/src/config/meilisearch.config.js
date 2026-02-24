const { MeiliSearch } = require('meilisearch');

// Configuration for Meilisearch
const meilisearchConfig = {
  host: process.env.MEILISEARCH_HOST || 'http://127.0.0.1:7700',
  apiKey: process.env.MEILISEARCH_API_KEY || 'sTLBy5cFfrxSZsjTyu_k5u_JzdCK0dSXFcgtF6-NCa0',
};

// Create client instance
const meilisearchClient = new MeiliSearch(meilisearchConfig);

// Define the global search index name
const GLOBAL_SEARCH_INDEX = 'global_search';

// Define the document schema structure
const DOCUMENT_SCHEMA = {
  // Core fields required for all document types
  id: 'string',                    // Unique identifier: {entityType}-{id}
  entityType: 'string',            // Type of entity (e.g., niche-application, engrave-wall-application)
  churchId: 'number',              // Church identifier for filtering
  code: 'string',                  // Code of the entity (e.g., NAPP-1234, GOL-5678)

  // Name-related fields
  primaryName: 'string',           // Primary name (ApplicantName, etc.)
  names: 'array',                  // Array of all relevant names
  deceasedNames: 'array',          // Names of deceased individuals (for inscriptions)

  // Date-related fields
  dates: 'array',                  // Array of relevant dates in ISO format
  createdAt: 'string',             // Creation date
  updatedAt: 'string',             // Last update date

  // Content fields
  purpose: 'string',               // Purpose of booking/request
  remarks: 'string',               // Additional remarks
  additionalPhrase: 'string',      // Additional inscription phrases

  // Contact info (non-sensitive)
  contactInfo: 'array',            // Non-sensitive contact identifiers (emails, phone numbers)

  // Additional searchable content
  searchableContent: 'string',     // Concatenated searchable text for broader matching
};

// Mapping function to convert database records to Meilisearch documents
const mapEntityToDocument = (entity, entityType) => {
  const baseDocument = {
    id: `${entityType}-${entity.id || entity.NicheApplicationId || entity.EngraveWallApplicationId || entity.NicheInscriptionRequestId || entity.WakeRoomBookingId}`,
    entityType,
    churchId: entity.churchId || entity.ChurchId || entity.Church_Id || null,
    code: entity.code || entity.Code || entity.ApplicationCode || null,
    primaryName: null,
    names: [],
    deceasedNames: [],
    dates: [],
    purpose: null,
    remarks: null,
    additionalPhrase: null,
    contactInfo: [],
    searchableContent: '',
    createdAt: entity.createdAt || entity.CreatedAt || entity.created_at || new Date().toISOString(),
    updatedAt: entity.updatedAt || entity.UpdatedAt || entity.updated_at || new Date().toISOString(),
  };

  switch (entityType) {
    case 'niche-application':
      baseDocument.primaryName = entity.applicantName || entity.ApplicantName || entity.Applicant_Name || null;
      baseDocument.names = [
        entity.applicantName || entity.ApplicantName || entity.Applicant_Name,
        entity.nomineeName || entity.NomineeName || entity.Nominee_Name,
        entity.nomineeName2 || entity.NomineeName2 || entity.Nominee_Name2
      ].filter(Boolean);

      baseDocument.dates = [
        entity.appliedDate || entity.AppliedDate || entity.Applied_Date,
        entity.agreementDate || entity.AgreementDate || entity.Agreement_Date
      ].filter(Boolean).map(date => new Date(date).toISOString());

      baseDocument.purpose = entity.purpose || entity.Purpose || null;
      baseDocument.remarks = entity.remarks || entity.Remarks || null;

      baseDocument.contactInfo = [
        entity.email || entity.EmailID || entity.Email_ID,
        entity.mobile || entity.MobileNo || entity.Mobile_No,
        entity.homeTel || entity.HomeTelNo || entity.Home_Tel_No
      ].filter(Boolean);

      break;

    case 'engrave-wall-application':
    case 'gates-of-life':
      baseDocument.primaryName = entity.applicantName || entity.ApplicantName || entity.Applicant_Name || null;
      baseDocument.names = [entity.applicantName || entity.ApplicantName || entity.Applicant_Name].filter(Boolean);

      baseDocument.dates = [
        entity.bookingDate || entity.BookingDate || entity.Booking_Date
      ].filter(Boolean).map(date => new Date(date).toISOString());

      baseDocument.contactInfo = [
        entity.email || entity.EmailID || entity.Email_ID,
        entity.mobile || entity.MobileNo || entity.Mobile_No,
        entity.homeTel || entity.HomeTelNo || entity.Home_Tel_No
      ].filter(Boolean);

      break;

    case 'niche-inscription':
    case 'inscription':
      baseDocument.primaryName = entity.applicantName || entity.ApplicantName || entity.Applicant_Name || null;
      baseDocument.names = [entity.applicantName || entity.ApplicantName || entity.Applicant_Name].filter(Boolean);

      baseDocument.deceasedNames = (entity.deceasedNames || entity.DeceasedNames || []).filter(Boolean);

      baseDocument.dates = [
        entity.transactionDate || entity.TranscationDate || entity.Transaction_Date
      ].filter(Boolean).map(date => new Date(date).toISOString());

      baseDocument.additionalPhrase = entity.inscriptionPhrase || entity.AdditionalInscriptionPhrase || null;
      baseDocument.purpose = entity.purpose || entity.Purpose || null;

      baseDocument.contactInfo = [
        entity.email || entity.EmailID || entity.Email_ID,
        entity.mobile || entity.MobileNo || entity.Mobile_No
      ].filter(Boolean);

      break;

    case 'wake-room-booking':
    case 'wake-room':
      baseDocument.primaryName = entity.applicantName || entity.ApplicantName || entity.Applicant_Name || null;
      baseDocument.names = [
        entity.applicantName || entity.ApplicantName || entity.Applicant_Name,
        entity.nameOfDeceased || entity.NameOfDeceased || entity.Name_Of_Deceased
      ].filter(Boolean);

      baseDocument.dates = [
        entity.usingDate || entity.UsingDate || entity.Using_Date,
        entity.transcationDate || entity.TranscationDate || entity.Transaction_Date
      ].filter(Boolean).map(date => new Date(date).toISOString());

      baseDocument.purpose = entity.purpose || entity.Purpose || null;
      baseDocument.remarks = entity.remarks || entity.Remarks || null;

      baseDocument.contactInfo = [
        entity.email || entity.EmailID || entity.Email_ID,
        entity.mobile || entity.MobileNo || entity.Mobile_No,
        entity.homeTel || entity.HomeTelNo || entity.Home_Tel_No
      ].filter(Boolean);

      break;
  }

  // Create searchable content by concatenating all text fields
  const allTextFields = [
    baseDocument.primaryName,
    ...baseDocument.names,
    ...baseDocument.deceasedNames,
    baseDocument.code,
    baseDocument.purpose,
    baseDocument.remarks,
    baseDocument.additionalPhrase,
    ...baseDocument.contactInfo
  ].filter(Boolean);

  baseDocument.searchableContent = allTextFields.join(' | ');

  return baseDocument;
};

module.exports = {
  meilisearchClient,
  GLOBAL_SEARCH_INDEX,
  DOCUMENT_SCHEMA,
  mapEntityToDocument,
};