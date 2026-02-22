const BaseRepository = require('./BaseRepository');
const { executeQuery } = require('../config/database');
const logger = require('../utils/logger');
const WakeRoom = require('../models/WakeRoom');
const WakeRoomBooking = require('../models/WakeRoomBooking');
const AddressUtils = require('../utils/AddressUtils');

/**
 * Convert date value to Date object
 * Handles multiple date formats:
 * - Date objects
 * - ISO 8601 strings (full or partial)
 * - Date-only strings (YYYY-MM-DD)
 * - Time-only strings (HH:MM) - combines with baseDate
 * @param {Date|string|null|undefined} value - Date value to convert
 * @param {Date|string|null|undefined} baseDate - Base date for time-only values (optional)
 * @returns {Date|null} Date object or null
 */
const toDate = (value, baseDate = null) => {
  if (!value) return null;
  if (value instanceof Date) return value;

  if (typeof value === 'string') {
    const trimmed = value.trim();

    // Handle time-only format (HH:MM or HH:MM:SS)
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(trimmed)) {
      if (baseDate) {
        const base = toDate(baseDate);
        if (!base) return null;

        const [hours, minutes, seconds = '0'] = trimmed.split(':');
        const result = new Date(base);
        result.setHours(parseInt(hours, 10), parseInt(minutes, 10), parseInt(seconds, 10), 0);
        return result;
      }
      // If no base date, use today
      const [hours, minutes, seconds = '0'] = trimmed.split(':');
      const result = new Date();
      result.setHours(parseInt(hours, 10), parseInt(minutes, 10), parseInt(seconds, 10), 0);
      return result;
    }

    // Handle date-only format (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const date = new Date(trimmed + 'T00:00:00.000Z');
      return Number.isNaN(date.getTime()) ? null : date;
    }

    // Handle ISO-like format without timezone (YYYY-MM-DDTHH:MM or YYYY-MM-DDTHH:MM:SS)
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) {
      // Add seconds and milliseconds if missing, then try parsing
      let normalized = trimmed;
      if (!normalized.includes(':', 11)) {
        // No seconds, add :00
        normalized = normalized + ':00';
      }
      if (normalized.split(':').length === 3 && !normalized.includes('.')) {
        // Has seconds but no milliseconds, add .000
        normalized = normalized + '.000';
      }
      // Try with Z timezone first, then without
      let date = new Date(normalized + 'Z');
      if (Number.isNaN(date.getTime())) {
        date = new Date(normalized);
      }
      return Number.isNaN(date.getTime()) ? null : date;
    }

    // Try standard Date parsing (handles full ISO 8601)
    const date = new Date(trimmed);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
};

/**
 * WakeRoomRepository - Data access layer for Wake Room operations
 * Based on ASP.NET MSSQLHelper WakeRoom methods
 */
class WakeRoomRepository extends BaseRepository {
  constructor() {
    super('WakeRoom');
  }

  getPrimaryKey() {
    return 'WakeRoomId';
  }

  /**
   * Get all wake rooms across all churches
   * New helper based on: GetWakeRooms(int _ChurchId) without ChurchId filter
   * @returns {Promise<Array<WakeRoom>>} List of wake rooms
   */
  async getAllWakeRooms() {
    try {
      logger.info('Getting all wake rooms across all churches');

      const query = `
        SELECT 
          WakeRoomId,
          Code,
          Name,
          Remarks,
          OpeningTime,
          ClossingTime,
          ChurchId,
          RentingAmount
        FROM WakeRoom WITH (NOLOCK)
        ORDER BY ChurchId, Name
      `;

      const result = await executeQuery(query, {});

      const wakeRooms = result.recordset.map(row => new WakeRoom(row));
      logger.info(`Found ${wakeRooms.length} wake room(s) across all churches`);

      return wakeRooms;
    } catch (error) {
      logger.error('Error getting all wake rooms across all churches:', error.message);
      throw error;
    }
  }

  /**
   * Get all wake rooms for a church
   * Based on: GetWakeRooms(int _ChurchId)
   * @param {number} churchId - Church ID
   * @returns {Promise<Array<WakeRoom>>} List of wake rooms
   */
  async getWakeRoomsByChurch(churchId) {
    try {
      logger.info(`Getting wake rooms for church: ${churchId}`);

      const query = `
        SELECT 
          WakeRoomId,
          Code,
          Name,
          Remarks,
          OpeningTime,
          ClossingTime,
          ChurchId,
          RentingAmount
        FROM WakeRoom WITH (NOLOCK)
        WHERE ChurchId = @churchId
        ORDER BY Name
      `;

      const result = await executeQuery(query, { churchId });

      const wakeRooms = result.recordset.map(row => new WakeRoom(row));
      logger.info(`Found ${wakeRooms.length} wake room(s) for church ${churchId}`);

      return wakeRooms;
    } catch (error) {
      logger.error(`Error getting wake rooms for church ${churchId}:`, error.message);
      throw error;
    }
  }

  /**
   * Get wake room by ID
   * @param {number} wakeRoomId - Wake Room ID
   * @returns {Promise<WakeRoom|null>} Wake room or null
   */
  async getWakeRoomById(wakeRoomId) {
    try {
      logger.info(`Getting wake room by ID: ${wakeRoomId}`);

      const query = `
        SELECT TOP 1
          WakeRoomId,
          Code,
          Name,
          Remarks,
          OpeningTime,
          ClossingTime,
          ChurchId,
          RentingAmount
        FROM WakeRoom WITH (NOLOCK)
        WHERE WakeRoomId = @wakeRoomId
      `;

      const result = await executeQuery(query, { wakeRoomId });

      if (result.recordset.length === 0) {
        logger.warn(`Wake room not found: ${wakeRoomId}`);
        return null;
      }

      const wakeRoom = new WakeRoom(result.recordset[0]);
      logger.info(`Found wake room: ${wakeRoom.code}`);

      return wakeRoom;
    } catch (error) {
      logger.error(`Error getting wake room by ID ${wakeRoomId}:`, error.message);
      throw error;
    }
  }

  /**
   * Get wake room booking by code
   * Based on: GetWakeRoomBooking(string _WakeRoomBookingCode)
   * @param {string} bookingCode - Booking code
   * @param {number} churchId - Church ID
   * @returns {Promise<WakeRoomBooking|null>} Wake room booking or null
   */
  async getWakeRoomBookingByCode(bookingCode, churchId) {
    try {
      logger.info(`Getting wake room booking by code: ${bookingCode}`);

      const query = `
        SELECT TOP 1
          wrb.*,
          wr.Code AS WakeRoomCode,
          wr.Name AS WakeRoomName,
          wr.OpeningTime AS WakeRoomOpeningTime,
          wr.ClossingTime AS WakeRoomClossingTime,
          wr.RentingAmount AS WakeRoomRentingAmount
        FROM WakeRoomBooking wrb WITH (NOLOCK)
        LEFT JOIN WakeRoom wr WITH (NOLOCK) ON wrb.WakeRoomId = wr.WakeRoomId
        WHERE wrb.Code = @bookingCode
        AND wrb.ChurchId = @churchId
        AND wrb.Status >= 0
      `;

      const result = await executeQuery(query, { bookingCode, churchId });

      if (result.recordset.length === 0) {
        logger.warn(`Wake room booking not found: ${bookingCode}`);
        return null;
      }

      const row = result.recordset[0];
      const booking = new WakeRoomBooking(row);

      // Add wake room details if available
      if (row.WakeRoomCode) {
        booking.wakeRoom = new WakeRoom({
          wakeRoomId: row.WakeRoomId,
          code: row.WakeRoomCode,
          name: row.WakeRoomName,
          openingTime: row.WakeRoomOpeningTime,
          clossingTime: row.WakeRoomClossingTime,
          rentingAmount: row.WakeRoomRentingAmount
        });
      }

      // Use centralized utility for full address
      booking.applicantFullAddress = AddressUtils.formatAddress({
        AddressNo: row.ApplicantAddressNo,
        Address: row.ApplicantAddressLine1,
        Address2: row.ApplicantAddressLine2,
        AddressCity: row.ApplicantAddressCity,
        DistrictCode: row.ApplicantAddressState,
        Country: row.ApplicantAddressCountry
      });

      logger.info(`Found wake room booking: ${booking.code}`);
      return booking;
    } catch (error) {
      logger.error(`Error getting wake room booking by code ${bookingCode}:`, error.message);
      throw error;
    }
  }

  /**
   * Check for duplicate booking
   * Based on: GetDuplicateWakeRoomBooking(string _Name, DateTime UsedTime, string _ApplicantName)
   * @param {string} nameOfDeceased - Name of deceased
   * @param {Date} usingTimeFrom - Using time from
   * @param {string} applicantName - Applicant name
   * @param {number} churchId - Church ID
   * @returns {Promise<WakeRoomBooking|null>} Duplicate booking or null
   */
  async getDuplicateBooking(nameOfDeceased, usingTimeFrom, applicantName, churchId) {
    try {
      logger.info(`Checking for duplicate booking: ${nameOfDeceased}, ${applicantName}`);

      // Convert date to Date object if it's a string
      const usingTimeFromDate = toDate(usingTimeFrom);
      if (!usingTimeFromDate) {
        logger.warn('Invalid usingTimeFrom date provided for duplicate check');
        return null;
      }

      const query = `
        SELECT TOP 1
          *
        FROM WakeRoomBooking WITH (NOLOCK)
        WHERE NameOfDeceased = @nameOfDeceased
        AND UsingTimeFrom = @usingTimeFrom
        AND ApplicantName = @applicantName
        AND ChurchId = @churchId
        AND Status >= 0
      `;

      const result = await executeQuery(query, {
        nameOfDeceased,
        usingTimeFrom: usingTimeFromDate,
        applicantName,
        churchId
      });

      if (result.recordset.length === 0) {
        logger.info('No duplicate booking found');
        return null;
      }

      const booking = new WakeRoomBooking(result.recordset[0]);
      logger.warn(`Duplicate booking found: ${booking.code}`);

      return booking;
    } catch (error) {
      logger.error('Error checking for duplicate booking:', error.message);
      throw error;
    }
  }

  /**
   * Get bookings for a wake room on a specific date
   * @param {number} wakeRoomId - Wake Room ID
   * @param {Date} usingDate - Using date
   * @returns {Promise<Array<WakeRoomBooking>>} List of bookings
   */
  async getWakeRoomBookings(wakeRoomId, usingDate) {
    try {
      logger.info(`Getting bookings for wake room ${wakeRoomId} on ${usingDate}`);

      const query = `
        SELECT *
        FROM WakeRoomBooking WITH (NOLOCK)
        WHERE WakeRoomId = @wakeRoomId
        AND CONVERT(DATE, UsingDate) = CONVERT(DATE, @usingDate)
        AND Status >= 0
        ORDER BY UsingTimeFrom
      `;

      const result = await executeQuery(query, { wakeRoomId, usingDate });

      const bookings = result.recordset.map(row => new WakeRoomBooking(row));
      logger.info(`Found ${bookings.length} booking(s)`);

      return bookings;
    } catch (error) {
      logger.error('Error getting wake room bookings:', error.message);
      throw error;
    }
  }

  /**
   * Get bookings for a wake room within a date range
   * Handles multi-day bookings that span across the date range
   * @param {number} wakeRoomId - Wake Room ID
   * @param {Date} fromDate - Start date
   * @param {Date} toDate - End date
   * @returns {Promise<Array<WakeRoomBooking>>} List of bookings
   */
  async getWakeRoomBookingsByDateRange(wakeRoomId, fromDate, toDate) {
    try {
      logger.info(`Getting bookings for wake room ${wakeRoomId} from ${fromDate} to ${toDate}`);

      // Get all bookings that overlap with the date range
      // A booking overlaps if:
      // - Its UsingDate is within the range, OR
      // - Its UsingTimeFrom to UsingTimeTo spans across the range
      const query = `
        SELECT *
        FROM WakeRoomBooking WITH (NOLOCK)
        WHERE WakeRoomId = @wakeRoomId
        AND Status >= 0
        AND (
          -- Booking starts within the range
          (CONVERT(DATE, UsingDate) >= CONVERT(DATE, @fromDate) 
           AND CONVERT(DATE, UsingDate) <= CONVERT(DATE, @toDate))
          OR
          -- Booking ends within the range
          (CONVERT(DATE, UsingTimeTo) >= CONVERT(DATE, @fromDate) 
           AND CONVERT(DATE, UsingTimeTo) <= CONVERT(DATE, @toDate))
          OR
          -- Booking spans the entire range
          (CONVERT(DATE, UsingDate) <= CONVERT(DATE, @fromDate) 
           AND CONVERT(DATE, UsingTimeTo) >= CONVERT(DATE, @toDate))
        )
        ORDER BY UsingDate, UsingTimeFrom
      `;

      const result = await executeQuery(query, { wakeRoomId, fromDate, toDate });

      const bookings = result.recordset.map(row => new WakeRoomBooking(row));
      logger.info(`Found ${bookings.length} booking(s) in date range`);

      return bookings;
    } catch (error) {
      logger.error('Error getting wake room bookings by date range:', error.message);
      throw error;
    }
  }

  /**
   * Get bookings for multiple specific dates (for calendar view)
   * @param {number} wakeRoomId - Wake Room ID
   * @param {Array<Date>} dates - Array of dates to check
   * @returns {Promise<Map<string, Array<WakeRoomBooking>>>} Map of date strings to bookings
   */
  async getWakeRoomBookingsForDates(wakeRoomId, dates) {
    try {
      if (!dates || dates.length === 0) {
        return new Map();
      }

      logger.info(`Getting bookings for wake room ${wakeRoomId} for ${dates.length} date(s)`);

      // Build date list for IN clause
      const dateStrings = dates.map(d => {
        const date = new Date(d);
        return date.toISOString().split('T')[0]; // YYYY-MM-DD format
      });

      // Use a date range query that covers all dates
      const minDate = new Date(Math.min(...dates.map(d => new Date(d).getTime())));
      const maxDate = new Date(Math.max(...dates.map(d => new Date(d).getTime())));

      const query = `
        SELECT *
        FROM WakeRoomBooking WITH (NOLOCK)
        WHERE WakeRoomId = @wakeRoomId
        AND Status >= 0
        AND (
          CONVERT(DATE, UsingDate) >= CONVERT(DATE, @minDate)
          AND CONVERT(DATE, UsingDate) <= CONVERT(DATE, @maxDate)
        )
        ORDER BY UsingDate, UsingTimeFrom
      `;

      const result = await executeQuery(query, { wakeRoomId, minDate, maxDate });

      const bookings = result.recordset.map(row => new WakeRoomBooking(row));

      // Group bookings by date
      const bookingsByDate = new Map();
      dateStrings.forEach(dateStr => {
        bookingsByDate.set(dateStr, []);
      });

      bookings.forEach(booking => {
        const bookingDate = new Date(booking.usingDate);
        const bookingDateStr = bookingDate.toISOString().split('T')[0];

        // Check if this booking's date is in our requested dates
        if (dateStrings.includes(bookingDateStr)) {
          const existing = bookingsByDate.get(bookingDateStr) || [];
          existing.push(booking);
          bookingsByDate.set(bookingDateStr, existing);
        }
      });

      logger.info(`Found bookings for ${bookingsByDate.size} date(s)`);
      return bookingsByDate;
    } catch (error) {
      logger.error('Error getting wake room bookings for dates:', error.message);
      throw error;
    }
  }

  /**
   * Search wake room bookings
   * Based on: SearchWakeBookings(Entity.WakeBookingSearchParams)
   * @param {Object} searchParams - Search parameters
   * @returns {Promise<Array<WakeRoomBooking>>} List of bookings
   */
  async searchWakeBookings(searchParams) {
    try {
      logger.info('Searching wake room bookings');

      const page = searchParams.page || 1;
      const pageSize = searchParams.pageSize || 10;
      const offset = (page - 1) * pageSize;

      let baseWhere = 'wrb.ChurchId = @churchId AND wrb.Status >= 0';
      const params = { churchId: searchParams.churchId };

      if (searchParams.code) {
        baseWhere += ' AND wrb.Code LIKE @code';
        params.code = `%${searchParams.code}%`;
      }

      if (searchParams.applicantName) {
        baseWhere += ' AND wrb.ApplicantName LIKE @applicantName';
        params.applicantName = `%${searchParams.applicantName}%`;
      }

      if (searchParams.nameOfDeceased) {
        baseWhere += ' AND wrb.NameOfDeceased LIKE @nameOfDeceased';
        params.nameOfDeceased = `%${searchParams.nameOfDeceased}%`;
      }

      if (searchParams.usingDate) {
        baseWhere += ' AND CONVERT(DATE, wrb.UsingDate) = CONVERT(DATE, @usingDate)';
        params.usingDate = toDate(searchParams.usingDate) || searchParams.usingDate;
      }

      if (searchParams.wakeRoomId) {
        baseWhere += ' AND wrb.WakeRoomId = @wakeRoomId';
        params.wakeRoomId = searchParams.wakeRoomId;
      }

      // 1. Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM WakeRoomBooking wrb WITH (NOLOCK)
        LEFT JOIN WakeRoom wr WITH (NOLOCK) ON wrb.WakeRoomId = wr.WakeRoomId
        WHERE ${baseWhere}
      `;

      const countResult = await executeQuery(countQuery, params);
      const total = countResult.recordset[0].total;

      // 2. Get paginated data
      const query = `
        SELECT 
          wrb.*,
          wr.Code AS WakeRoomCode,
          wr.Name AS WakeRoomName
        FROM WakeRoomBooking wrb WITH (NOLOCK)
        LEFT JOIN WakeRoom wr WITH (NOLOCK) ON wrb.WakeRoomId = wr.WakeRoomId
        WHERE ${baseWhere}
        ORDER BY wrb.WakeRoomBookingId DESC
        OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
      `;

      params.offset = offset;
      params.pageSize = pageSize;

      const result = await executeQuery(query, params);

      const bookings = result.recordset.map(row => {
        const booking = new WakeRoomBooking(row);
        if (row.WakeRoomCode) {
          booking.wakeRoom = new WakeRoom({
            code: row.WakeRoomCode,
            name: row.WakeRoomName
          });
        }
        return booking;
      });

      logger.info(`Found ${bookings.length} booking(s) (Page ${page} of ${Math.ceil(total / pageSize)})`);

      return {
        bookings,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      };
    } catch (error) {
      logger.error('Error searching wake bookings:', error.message);
      throw error;
    }
  }

  /**
   * Add new wake room booking
   * Based on: AddWakeRoomBooking(Entity.WakeRoomBooking)
   * @param {WakeRoomBooking} booking - Booking to add
   * @returns {Promise<number>} New booking ID
   */
  async addWakeRoomBooking(booking) {
    try {
      logger.info(`Adding wake room booking: ${booking.code}`);

      const query = `
        INSERT INTO WakeRoomBooking (
          WakeRoomId, ApplicantName, ApplicantAddressNo, ApplicantAddressLine1,
          ApplicantAddressLine2, ApplicantAddressCity, ApplicantAddressState,
          ApplicantAddressCountry, Purpose, NameOfDeceased, UsingDate,
          MassTime, UsingTimeFrom, UsingTimeTo, Remarks, DonationAmount,
          DefaultDonationAmount, NoOfDays, ChurchId, Status, Code,
          UserId, ApplicantEmailID, ApplicantIDNo, ApplicantMobileNo,
          ApplicantHomeTelNo, ApplicantOfficeTelNo, Serviceby, CasketCompany,
          HallNo, TimeOfCremation, RefDocType
        )
        OUTPUT INSERTED.WakeRoomBookingId
        VALUES (
          @wakeRoomId, @applicantName, @applicantAddressNo, @applicantAddressLine1,
          @applicantAddressLine2, @applicantAddressCity, @applicantAddressState,
          @applicantAddressCountry, @purpose, @nameOfDeceased, @usingDate,
          @massTime, @usingTimeFrom, @usingTimeTo, @remarks, @donationAmount,
          @defaultDonationAmount, @noOfDays, @churchId, @status, @code,
          @userId, @applicantEmailID, @applicantIDNo, @applicantMobileNo,
          @applicantHomeTelNo, @applicantOfficeTelNo, @serviceby, @casketCompany,
          @hallNo, @timeOfCremation, @refDocType
        )
      `;

      // Convert date strings to Date objects for SQL Server
      // Use usingDate as base for time-only fields like massTime
      const usingDateObj = toDate(booking.usingDate);
      const usingTimeFromObj = toDate(booking.usingTimeFrom);
      const usingTimeToObj = toDate(booking.usingTimeTo);
      // massTime can be time-only (HH:MM), so combine with usingDate if needed
      const massTimeObj = toDate(booking.massTime, booking.usingDate || booking.usingTimeFrom);

      const params = {
        wakeRoomId: booking.wakeRoomId,
        applicantName: booking.applicantName,
        applicantAddressNo: booking.applicantAddressNo,
        applicantAddressLine1: booking.applicantAddressLine1,
        applicantAddressLine2: booking.applicantAddressLine2,
        applicantAddressCity: booking.applicantAddressCity,
        applicantAddressState: booking.applicantAddressState,
        applicantAddressCountry: booking.applicantAddressCountry,
        purpose: booking.purpose,
        nameOfDeceased: booking.nameOfDeceased,
        usingDate: usingDateObj,
        massTime: massTimeObj,
        usingTimeFrom: usingTimeFromObj,
        usingTimeTo: usingTimeToObj,
        remarks: booking.remarks,
        donationAmount: booking.donationAmount,
        defaultDonationAmount: booking.defaultDonationAmount,
        noOfDays: booking.noOfDays,
        churchId: booking.churchId,
        status: booking.status || 0,
        code: booking.code,
        userId: booking.userId,
        applicantEmailID: booking.applicantEmailID,
        applicantIDNo: booking.applicantIDNo,
        applicantMobileNo: booking.applicantMobileNo,
        applicantHomeTelNo: booking.applicantHomeTelNo,
        applicantOfficeTelNo: booking.applicantOfficeTelNo,
        serviceby: booking.serviceby,
        casketCompany: booking.casketCompany,
        hallNo: booking.hallNo,
        timeOfCremation: booking.timeOfCremation,
        refDocType: booking.refDocType
      };

      const result = await executeQuery(query, params);

      const bookingId = result.recordset[0].WakeRoomBookingId;
      logger.info(`Successfully added wake room booking: ${booking.code}, ID: ${bookingId}`);

      return bookingId;
    } catch (error) {
      logger.error('Error adding wake room booking:', error.message);
      throw error;
    }
  }

  /**
   * Update wake room booking
   * Based on: UpdateWakeRoomBooking(Entity.WakeRoomBooking)
   * @param {WakeRoomBooking} booking - Booking to update
   * @returns {Promise<number>} Updated booking ID
   */
  async updateWakeRoomBooking(booking) {
    try {
      logger.info(`Updating wake room booking: ${booking.code}`);

      const query = `
        UPDATE WakeRoomBooking
        SET
          WakeRoomId = @wakeRoomId,
          ApplicantName = @applicantName,
          ApplicantAddressNo = @applicantAddressNo,
          ApplicantAddressLine1 = @applicantAddressLine1,
          ApplicantAddressLine2 = @applicantAddressLine2,
          ApplicantAddressCity = @applicantAddressCity,
          ApplicantAddressState = @applicantAddressState,
          ApplicantAddressCountry = @applicantAddressCountry,
          Purpose = @purpose,
          NameOfDeceased = @nameOfDeceased,
          UsingDate = @usingDate,
          MassTime = @massTime,
          UsingTimeFrom = @usingTimeFrom,
          UsingTimeTo = @usingTimeTo,
          Remarks = @remarks,
          DonationAmount = @donationAmount,
          DefaultDonationAmount = @defaultDonationAmount,
          NoOfDays = @noOfDays,
          Status = @status,
          ApplicantEmailID = @applicantEmailID,
          ApplicantIDNo = @applicantIDNo,
          ApplicantMobileNo = @applicantMobileNo,
          ApplicantHomeTelNo = @applicantHomeTelNo,
          ApplicantOfficeTelNo = @applicantOfficeTelNo,
          Serviceby = @serviceby,
          CasketCompany = @casketCompany,
          HallNo = @hallNo,
          TimeOfCremation = @timeOfCremation,
          RefDocType = @refDocType
        WHERE WakeRoomBookingId = @wakeRoomBookingId
      `;

      // Convert date strings to Date objects for SQL Server
      // Use usingDate as base for time-only fields
      const usingDateObj = toDate(booking.usingDate);
      const massTimeObj = toDate(booking.massTime, booking.usingDate || booking.usingTimeFrom);
      const usingTimeFromObj = toDate(booking.usingTimeFrom);
      const usingTimeToObj = toDate(booking.usingTimeTo);

      const params = {
        wakeRoomBookingId: booking.wakeRoomBookingId,
        wakeRoomId: booking.wakeRoomId,
        applicantName: booking.applicantName,
        applicantAddressNo: booking.applicantAddressNo,
        applicantAddressLine1: booking.applicantAddressLine1,
        applicantAddressLine2: booking.applicantAddressLine2,
        applicantAddressCity: booking.applicantAddressCity,
        applicantAddressState: booking.applicantAddressState,
        applicantAddressCountry: booking.applicantAddressCountry,
        purpose: booking.purpose,
        nameOfDeceased: booking.nameOfDeceased,
        usingDate: usingDateObj,
        massTime: massTimeObj,
        usingTimeFrom: usingTimeFromObj,
        usingTimeTo: usingTimeToObj,
        remarks: booking.remarks,
        donationAmount: booking.donationAmount,
        defaultDonationAmount: booking.defaultDonationAmount,
        noOfDays: booking.noOfDays,
        status: booking.status,
        applicantEmailID: booking.applicantEmailID,
        applicantIDNo: booking.applicantIDNo,
        applicantMobileNo: booking.applicantMobileNo,
        applicantHomeTelNo: booking.applicantHomeTelNo,
        applicantOfficeTelNo: booking.applicantOfficeTelNo,
        serviceby: booking.serviceby,
        casketCompany: booking.casketCompany,
        hallNo: booking.hallNo,
        timeOfCremation: booking.timeOfCremation,
        refDocType: booking.refDocType
      };

      await executeQuery(query, params);

      logger.info(`Successfully updated wake room booking: ${booking.code}`);
      return booking.wakeRoomBookingId;
    } catch (error) {
      logger.error('Error updating wake room booking:', error.message);
      throw error;
    }
  }

  /**
   * Get last booking code matching a prefix
   * @param {string} prefix - Prefix to search for
   * @param {number} churchId - Church ID
   * @returns {Promise<string|null>} Last code or null
   */
  async getLastBookingCodeByPrefix(prefix, churchId) {
    try {
      const query = `
        SELECT TOP 1 Code
        FROM WakeRoomBooking WITH (NOLOCK)
        WHERE ChurchId = @churchId
        AND Code LIKE @prefixPattern
        ORDER BY LEN(Code) DESC, Code DESC
      `;

      const result = await executeQuery(query, {
        churchId,
        prefixPattern: prefix + '%'
      });

      return result.recordset.length > 0 ? result.recordset[0].Code : null;
    } catch (error) {
      logger.error('Error getting last booking code by prefix:', error.message);
      throw error;
    }
  }

  /**
   * Get last booking number for generating new codes
   * @param {number} churchId - Church ID
   * @returns {Promise<string>} Last booking number
   */
  async getLastBookingNumber(churchId) {
    try {
      const query = `
        SELECT TOP 1 Code
        FROM WakeRoomBooking WITH (NOLOCK)
        WHERE ChurchId = @churchId
        ORDER BY WakeRoomBookingId DESC
      `;

      const result = await executeQuery(query, { churchId });

      if (result.recordset.length === 0) {
        return 'WRB-0000';
      }

      return result.recordset[0].Code;
    } catch (error) {
      logger.error('Error getting last booking number:', error.message);
      return 'WRB-0000';
    }
  }
}

module.exports = WakeRoomRepository;

