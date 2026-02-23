const { executeQuery } = require('../config/database');
const logger = require('../utils/logger');
const TaskItemMappingRepository = require('../repositories/TaskItemMappingRepository');

/**
 * ApplicationService
 * Unified service to resolve application details across different modules.
 */
class ApplicationService {
  constructor() {
    this.taskItemMappingRepo = new TaskItemMappingRepository();
  }
  /**
   * Resolve application details by code
   * @param {string} code - The application or booking code
   * @param {number} churchId - The church ID
   * @returns {Promise<Object|null>} Resolved application details or null
   */
  /**
   * Resolve application details by code
   * Optimized with strict prefix sizing and parallel execution for ambiguous patterns.
   *
   * @param {string} code - The application or booking code
   * @param {number} churchId - The church ID
   * @param {string} type - Optional application type (NAPP, INCR, WAPP, GOLA)
   * @returns {Promise<Object|null>} Resolved application details or null
   */
  async getApplicationDetails(code, churchId, type = null) {
    if (!code) return null;
    const normalizedCode = code.trim().toUpperCase();

    try {
      // 0. Direct Type Resolution (Fastest - if type is provided)
      if (type) {
        const normalizedType = type.trim().toUpperCase();
        if (normalizedType === 'WAPP') {
          const result = await this.resolveWakeRoom(normalizedCode, churchId);
          return result ? this.mapApplicationResult(result, churchId) : null;
        }
        if (normalizedType === 'GOLA' || normalizedType === 'GOL') {
          const result = await this.resolveGateOfLife(normalizedCode, churchId);
          return result ? this.mapApplicationResult(result, churchId) : null;
        }
        if (normalizedType === 'INCR') {
          let result = await this.resolveInscription(normalizedCode, churchId);
          if (!result && !normalizedCode.startsWith('I-')) {
            result = await this.resolveInscription(`I-${normalizedCode}`, churchId);
          }
          return result ? this.mapApplicationResult(result, churchId) : null;
        }
        if (normalizedType === 'NAPP') {
          const result = await this.resolveNicheApplication(normalizedCode, churchId);
          return result ? this.mapApplicationResult(result, churchId) : null;
        }
      }

      // 1. Strict Prefix Routing (Fastest)
      if (normalizedCode.startsWith('WAPP-')) {
        const result = await this.resolveWakeRoom(normalizedCode, churchId);
        return result ? this.mapApplicationResult(result, churchId) : null;
      }
      if (normalizedCode.startsWith('GOL-') || normalizedCode.startsWith('GOLA-')) {
        const result = await this.resolveGateOfLife(normalizedCode, churchId);
        return result ? this.mapApplicationResult(result, churchId) : null;
      }
      if (normalizedCode.startsWith('INCR-') || normalizedCode.startsWith('I-')) {
        // Niche Inscription
        const result = await this.resolveInscription(normalizedCode, churchId);
        return result ? this.mapApplicationResult(result, churchId) : null;
      }
      if (normalizedCode.startsWith('NAPP-')) {
        const result = await this.resolveNicheApplication(normalizedCode, churchId);
        return result ? this.mapApplicationResult(result, churchId) : null;
      }

      // 2. Pattern-based Routing (Ambiguous codes) - WAPP, NAPP, INCR, GOLA
      if (/^\d+-\d+$/.test(normalizedCode)) {
        const inscriptionCode = `I-${normalizedCode}`;
        const [wakeResult, nicheResult, inscriptionResult, inscriptionWithPrefixResult, golaResult] = await Promise.all([
          this.resolveWakeRoom(normalizedCode, churchId),
          this.resolveNicheApplication(normalizedCode, churchId),
          this.resolveInscription(normalizedCode, churchId),
          this.resolveInscription(inscriptionCode, churchId),
          this.resolveGateOfLife(normalizedCode, churchId)
        ]);
        if (wakeResult) return this.mapApplicationResult(wakeResult, churchId);
        if (nicheResult) return this.mapApplicationResult(nicheResult, churchId);
        if (inscriptionWithPrefixResult) return this.mapApplicationResult(inscriptionWithPrefixResult, churchId);
        if (inscriptionResult) return this.mapApplicationResult(inscriptionResult, churchId);
        if (golaResult) return this.mapApplicationResult(golaResult, churchId);
      }

      // 3. Numeric Code (e.g. 12345)
      // Could be any application ID or legacy code
      if (/^\d+$/.test(normalizedCode)) {
        const [nicheResult, wakeResult, golaResult, inscriptionResult] = await Promise.all([
          this.resolveNicheApplication(normalizedCode, churchId),
          this.resolveWakeRoom(normalizedCode, churchId),
          this.resolveGateOfLife(normalizedCode, churchId),
          this.resolveInscription(normalizedCode, churchId)
        ]);

        if (nicheResult) return this.mapApplicationResult(nicheResult, churchId);
        if (wakeResult) return this.mapApplicationResult(wakeResult, churchId);
        if (golaResult) return this.mapApplicationResult(golaResult, churchId);
        if (inscriptionResult) return this.mapApplicationResult(inscriptionResult, churchId);
      }

      // 4. Final Fallback (if no specific pattern matched or all failed)
      // This is the slow path, but we've covered the 99% cases above.
      // We'll try just the most likely ones remaining (Generic Inscription if I- prefix was missing but intended?)
      // Actually, duplicate checks are expensive. Let's return null if it didn't match patterns.
      // The only case left is if a code doesn't look like any standard format but exists in DB.

      return null;
    } catch (error) {
      logger.error(`Error resolving application details for ${code}:`, error);
      return null;
    }
  }

  async mapApplicationResult(row, churchId) {
    const type = row.Type;
    let items = [];
    let applicationData = row;
    let nicheDetails = null;

    try {
      // Resolve Niche details for Niche Application or Inscription
      const nicheId = row.NicheId || (row.application?.NicheId);
      if (nicheId) {
        const nicheQuery = `
          SELECT 
            n.NicheId, n.Code as NicheCode, n.DefaultAmount as NichePrice,
            r.Code as RowCode, r.NicheLevel, r.DefaultAmount as RowPrice,
            w.Name as WallName, c.Name as ChapelName
          FROM Niche n WITH(NOLOCK)
          INNER JOIN NicheRow r WITH(NOLOCK) ON n.NicheRowlId = r.NicheRowlId
          INNER JOIN NicheWall w WITH(NOLOCK) ON r.NicheWallId = w.NicheWallId
          INNER JOIN Chapel c WITH(NOLOCK) ON w.ChapelId = c.ChapelId
          WHERE n.NicheId = @nicheId
        `;
        try {
          const nicheResult = await executeQuery(nicheQuery, { nicheId }, { timeout: 5000 });
          if (nicheResult.recordset[0]) {
            nicheDetails = nicheResult.recordset[0];
          }
        } catch (nicheError) {
          logger.warn(`Niche detail lookup timed out/failed for NicheId=${nicheId}:`, nicheError.message);
        }
      }

      if (type === 'INCR') {
        // Use InscriptionInvoiceService for specialized inscription item resolution
        const InscriptionInvoiceService = require('./InscriptionInvoiceService');
        const inscriptionResult = await Promise.race([
          InscriptionInvoiceService.getInscriptionItems(row.Code, churchId),
          new Promise((resolve) => setTimeout(() => resolve(null), 10000))
        ]);

        // Only use the result if it actually has items
        if (inscriptionResult && Array.isArray(inscriptionResult.items) && inscriptionResult.items.length > 0) {
          items = inscriptionResult.items.map(item => ({
            itemId: item.ItemId || item.itemId || 0,
            itemName: item.Name || item.itemName || 'Inscription Item',
            itemCode: item.Code || item.itemCode || 'INCR',
            unitAmount: item.Price || item.unitAmount || 0,
            quantity: 1,
            lineTotalAmount: item.Price || item.unitAmount || 0,
            lineTaxPercent: 9,
            lineTaxAmount: (item.Price || item.unitAmount || 0) * 0.09,
            totalPayingAmount: (item.Price || item.unitAmount || 0) * 1.09,
            refDocNumber: row.Code,
            refDocName: 'INCR',
            refType: 'INCR'
          }));
          // Merge applicant info if provided by service
          if (inscriptionResult.applicant) {
            applicationData = { ...row, ...inscriptionResult.applicant };
          }
        } else {
          // Fallback 1: task-mapped INCR items
          const mappedItems = await this.taskItemMappingRepo.getItemsForTask(
            4,
            [{ name: '_ForInscription', value: '1' }, { name: '_ForUrn', value: '0' }],
            churchId
          );
          const filteredMappedItems = (mappedItems || []).filter((item) => item);

          if (filteredMappedItems.length > 0) {
            items = filteredMappedItems.map((item) => {
              const price = Number(item.Price || 0);
              return {
                itemId: item.ItemId || 0,
                itemName: item.Name || 'Inscription Item',
                itemCode: item.Code || 'INCR',
                unitAmount: price,
                payingAmount: price,
                quantity: 1,
                lineTotalAmount: price,
                lineTaxPercent: 9,
                lineTaxAmount: price * 0.09,
                totalPayingAmount: price * 1.09,
                refDocNumber: row.Code,
                refDocName: 'INCR',
                refType: 'INCR'
              };
            });
          } else {
            // Fallback 2: Find preferred item for INCR
            const preferredItem = await this.getPreferredItemForType(churchId, 'INCR');
            const amount = row.Amount || preferredItem?.Price || 0;

            items = [{
              itemId: preferredItem?.ItemId || 0,
              itemName: preferredItem?.Name || 'Inscription Request',
              itemCode: preferredItem?.Code || 'INCR',
              unitAmount: amount,
              payingAmount: amount,
              quantity: 1,
              lineTotalAmount: amount,
              lineTaxPercent: 9,
              lineTaxAmount: amount * 0.09,
              totalPayingAmount: amount * 1.09,
              refDocNumber: row.Code,
              refDocName: 'INCR',
              refType: 'INCR'
            }];
          }
        }
      } else if (type === 'NAPP') {
        // Resolve a real Item record by strict level match (do this first so Item.Price is available as fallback)
        let nappItem = null;
        if (nicheDetails?.NicheLevel) {
          const levelPattern = `%Level ${nicheDetails.NicheLevel}%`;
          const nappItemQuery = `
            SELECT TOP 1 ItemId, Name, Code, Price
            FROM Item WITH(NOLOCK)
            WHERE ChurchId = @churchId
              AND DocType = 'NAPP'
              AND Name LIKE @levelPattern
            ORDER BY ItemId
          `;
          try {
            const nappResult = await executeQuery(nappItemQuery, { churchId, levelPattern }, { timeout: 5000 });
            nappItem = nappResult.recordset?.[0] || null;
          } catch (e) {
            logger.warn('NAPP item lookup failed, using preferred fallback:', e.message);
          }
        }
        if (!nappItem) {
          nappItem = await this.getPreferredItemForType(churchId, 'NAPP');
        }

        // Standardized price waterfall: Application > Niche > Row > Item catalog
        const amount = row.Amount || nicheDetails?.NichePrice || nicheDetails?.RowPrice || nappItem?.Price || 0;

        items = [{
          itemId: nappItem?.ItemId || 0,
          itemName: nappItem?.Name || (nicheDetails ? `Niche: ${nicheDetails.NicheCode} (${nicheDetails.ChapelName})` : 'Niche Application'),
          itemCode: nappItem?.Code || nicheDetails?.NicheCode || 'NAPP',
          unitAmount: amount,
          payingAmount: amount,
          quantity: 1,
          lineTotalAmount: amount,
          lineTaxPercent: 9,
          lineTaxAmount: amount * 0.09,
          totalPayingAmount: amount * 1.09,
          refDocNumber: row.Code,
          refDocName: 'NAPP',
          refType: 'NAPP',
          description: nicheDetails ? `${nicheDetails.WallName} - ${nicheDetails.ChapelName}` : ''
        }];
      } else if (type === 'WAPP') {
        const days = row.NoOfDays || 1;
        items = await this.getWakeRoomItems(churchId, row.Amount, row.Code, days);
      } else if (type === 'GOLA') {
        const hasSecondName = row.NameCount >= 2;
        const quantity = Math.max(Number(row.NameCount) || 1, 1);

        // Try to find the specific inscription charge item
        const { executeQuery } = require('../config/database');
        const targetItemName = hasSecondName ? '%Charge 2 Names%' : 'Gates Of Life Incription Charge';
        const itemQuery = `
          SELECT TOP 1 ItemId, Name, Code, Price 
          FROM Item WITH(NOLOCK) 
          WHERE ChurchId = @churchId 
          AND (Name LIKE @targetName OR (DocType = 'GOLA' AND Name NOT LIKE '%2 Names%'))
          ORDER BY CASE WHEN Name LIKE @exactName THEN 0 ELSE 1 END, ItemId
        `;

        let golaItem = null;
        try {
          const itemResult = await executeQuery(itemQuery, {
            churchId,
            targetName: targetItemName,
            exactName: hasSecondName ? 'Gates Of Life Inscription Charge 2 Names' : 'Gates Of Life Incription Charge'
          });
          golaItem = itemResult.recordset[0];
        } catch (err) {
          logger.warn('Failed to find specific GOLA item, using preferred fallback');
        }

        if (!golaItem) {
          golaItem = await this.getPreferredItemForType(churchId, 'GOLA');
        }

        const totalAmount = Number(row.Amount || 0);
        const fallbackUnitAmount = Number(golaItem?.Price || 300);
        const unitAmount = totalAmount > 0
          ? parseFloat((totalAmount / quantity).toFixed(2))
          : fallbackUnitAmount;
        const lineTotalAmount = parseFloat((unitAmount * quantity).toFixed(2));
        const lineTaxAmount = parseFloat((lineTotalAmount * 0.09).toFixed(2));
        items = [{
          itemId: golaItem?.ItemId || 0,
          itemName: golaItem?.Name || 'Gate of Life (GOLA) Donation',
          itemCode: golaItem?.Code || 'GOLA',
          unitAmount,
          payingAmount: unitAmount,
          quantity,
          lineTotalAmount,
          lineTaxPercent: 9,
          lineTaxAmount,
          totalPayingAmount: parseFloat((lineTotalAmount + lineTaxAmount).toFixed(2)),
          refDocNumber: row.Code,
          refDocName: 'GOLA',
          refType: 'GOLA'
        }];
      } else {
        // Generic fallback for other types
        items = [{
          itemId: 0,
          itemName: `${type} Application Service`,
          itemCode: type,
          unitAmount: row.Amount || 0,
          payingAmount: row.Amount || 0,
          quantity: 1,
          lineTotalAmount: row.Amount || 0,
          lineTaxPercent: 9,
          lineTaxAmount: (row.Amount || 0) * 0.09,
          totalPayingAmount: (row.Amount || 0) * 1.09,
          refDocNumber: row.Code,
          refDocName: type,
          refType: type
        }];
      }
    } catch (error) {
      logger.error(`Error mapping application result for ${type}:`, error);
    }

    const contact = {
      mobile: applicationData.ApplicantMobileNo || applicationData.mobile || '',
      email: applicationData.ApplicantEmailID || applicationData.email || ''
    };
    const address = {
      addressNo: applicationData.ApplicantAddressNo || applicationData.addressNo || '',
      addressLine1: applicationData.ApplicantAddressLine1 || applicationData.addressLine1 || '',
      addressLine2: applicationData.ApplicantAddressLine2 || applicationData.addressLine2 || '',
      addressCity: applicationData.ApplicantAddressCity || applicationData.addressCity || '',
      addressState: applicationData.ApplicantAddressState || applicationData.addressState || '',
      addressCountry: applicationData.ApplicantAddressCountry || applicationData.addressCountry || ''
    };

    return {
      type,
      code: applicationData.Code || applicationData.code || '',
      application: applicationData,
      customerName: applicationData.ApplicantName || applicationData.name || 'Unknown Applicant',
      contact,
      address,
      items,
      niche: nicheDetails
    };
  }

  async getWakeRoomItems(churchId, amount, code, quantity = 1) {
    try {
      // Try to find a specific Wake Room item in the database
      const query = `
        SELECT TOP 1 ItemId, Name, Code, Price
        FROM Item WITH(NOLOCK)
        WHERE ChurchId = @churchId 
        AND (DocType = 'WAPP' OR Code LIKE 'WR%' OR Code LIKE 'WAKE%')
        ORDER BY
          CASE
            WHEN UPPER(Code) = 'WAPP' THEN 0
            WHEN UPPER(DocType) = 'WAPP' THEN 1
            WHEN UPPER(Code) LIKE 'WR%' THEN 2
            WHEN UPPER(Code) LIKE 'WAKE%' THEN 3
            ELSE 4
          END,
          ItemId
      `;

      const result = await executeQuery(query, { churchId });
      let item = result.recordset && result.recordset.length > 0 ? result.recordset[0] : null;

      // Fallback if no item found
      if (!item) {
        item = {
          ItemId: 0,
          Name: 'Wake Room Rental',
          Code: 'WAPP',
          Price: 0
        };
      }

      // Calculate unit amount
      let unitAmount = item.Price || 0;
      if (amount > 0 && quantity > 0) {
        unitAmount = amount / quantity;
      } else if (amount > 0) {
        unitAmount = amount;
      }

      // Format description
      let itemName = item.Name;

      const lineTotal = unitAmount * quantity;
      const taxAmount = lineTotal * 0.09;

      return [{
        itemId: item.ItemId,
        itemName: itemName,
        itemCode: item.Code,
        unitAmount: unitAmount,
        payingAmount: unitAmount,
        quantity: quantity,
        lineTotalAmount: lineTotal,
        lineTaxPercent: 9,
        lineTaxAmount: taxAmount,
        totalPayingAmount: lineTotal + taxAmount,
        refDocNumber: code || 'WAPP',
        refDocName: 'WAPP',
        refType: 'WAPP'
      }];
    } catch (error) {
      logger.error('Error getting wake room items:', error);
      return [{
        itemId: 0,
        itemName: 'Wake Room Rental',
        itemCode: 'WAKE',
        unitAmount: amount || 0,
        payingAmount: amount || 0,
        quantity: quantity,
        lineTotalAmount: amount || 0,
        lineTaxPercent: 9,
        lineTaxAmount: (amount || 0) * 0.09,
        totalPayingAmount: (amount || 0) * 1.09,
        refDocNumber: code || 'WAPP',
        refDocName: 'WAPP',
        refType: 'WAPP'
      }];
    }
  }

  async getPreferredItemForType(churchId, type) {
    try {
      const normalizedType = (type || '').toUpperCase();
      const query = `
        SELECT TOP 1 ItemId, Name, Code, Price, DocType
        FROM Item WITH(NOLOCK)
        WHERE ChurchId = @churchId
          AND (
            UPPER(DocType) = @type
            OR UPPER(Code) = @type
            OR (@type = 'GOLA' AND UPPER(Code) = 'GOL')
          )
        ORDER BY
          CASE
            WHEN UPPER(Code) = @type THEN 0
            WHEN @type = 'GOLA' AND UPPER(Code) = 'GOL' THEN 1
            WHEN UPPER(DocType) = @type THEN 2
            ELSE 3
          END,
          ItemId
      `;
      const result = await executeQuery(query, { churchId, type: normalizedType }, { timeout: 5000 });
      return result.recordset && result.recordset.length > 0 ? result.recordset[0] : null;
    } catch (error) {
      logger.warn(`Failed to get preferred item for type ${type}:`, error.message);
      return null;
    }
  }

  async resolveWakeRoom(code, churchId) {
    const query = `
      SELECT TOP 1
        WakeRoomBookingId as Id,
        Code,
        ApplicantName,
        ApplicantAddressNo,
        ApplicantAddressLine1,
        ApplicantAddressLine2,
        ApplicantAddressCity,
        ApplicantAddressState,
        ApplicantAddressCountry,
        ApplicantMobileNo,
        ApplicantEmailID,
        DonationAmount as Amount,
        DefaultDonationAmount,
        NoOfDays,
        'WAPP' as Type
      FROM WakeRoomBooking WITH(NOLOCK)
      WHERE Code = @code AND ChurchId = @churchId
    `;
    const result = await executeQuery(query, { code, churchId });
    return result.recordset[0] || null;
  }

  async resolveGateOfLife(code, churchId) {
    const codeGola = code.startsWith('GOL-') ? code.replace('GOL-', 'GOLA-') : code;
    const query = `
      SELECT TOP 1
        ewa.EngraveWallApplicationId as Id,
        ewa.Code,
        ewa.ApplicantName,
        ewa.ApplicantAddressNo,
        ewa.ApplicantAddressLine1,
        ewa.ApplicantAddressLine2,
        ewa.ApplicantAddressCity,
        ewa.ApplicantAddressState,
        ewa.ApplicantAddressCountry,
        ewa.ApplicantMobileNo,
        ewa.ApplicantEmailID,
        ewa.DonationAmount as Amount,
        (SELECT COUNT(1) FROM EngraveWallApplicationDetail d WHERE d.EngraveWallApplicationId = ewa.EngraveWallApplicationId) as NameCount,
        'GOLA' as Type
      FROM EngraveWallApplication ewa WITH(NOLOCK)
      WHERE (ewa.Code = @code OR ewa.Code = @codeGola) AND ewa.ChurchId = @churchId
    `;
    const result = await executeQuery(query, { code, codeGola, churchId });
    return result.recordset[0] || null;
  }

  async resolveInscription(code, churchId) {
    // 1. Try Inscription Request table
    // Prefer Applicant info from Inscription Request, fallback to Niche Application via joins
    const query = `
      SELECT TOP 1
        nir.NicheInscriptionRequestId as Id,
        nir.Code,
        COALESCE(NULLIF(nir.ApplicantName, ''), na.ApplicantName) as ApplicantName,
        COALESCE(NULLIF(nir.ApplicantAddressNo, ''), na.ApplicantAddressNo) as ApplicantAddressNo,
        COALESCE(NULLIF(nir.ApplicantAddressLine1, ''), na.ApplicantAddressLine1) as ApplicantAddressLine1,
        COALESCE(NULLIF(nir.ApplicantAddressLine2, ''), na.ApplicantAddressLine2) as ApplicantAddressLine2,
        COALESCE(NULLIF(nir.ApplicantAddressCity, ''), na.ApplicantAddressCity) as ApplicantAddressCity,
        COALESCE(NULLIF(nir.ApplicantAddressState, ''), na.ApplicantAddressState) as ApplicantAddressState,
        COALESCE(NULLIF(nir.ApplicantAddressCountry, ''), na.ApplicantAddressCountry) as ApplicantAddressCountry,
        COALESCE(NULLIF(nir.ApplicantMobileNo, ''), na.ApplicantMobileNo) as ApplicantMobileNo,
        COALESCE(NULLIF(nir.ApplicantEmailID, ''), na.ApplicantEmailID) as ApplicantEmailID,
        'INCR' as Type,
        na.NicheId
      FROM NicheInscriptionRequest nir WITH(NOLOCK)
      LEFT JOIN NicheBooking nb WITH(NOLOCK) ON nir.NicheBookingId = nb.NicheBookingId
      LEFT JOIN NicheApplication na WITH(NOLOCK) ON nb.NicheApplicationId = na.NicheApplicationId
      WHERE nir.Code = @code AND nir.ChurchId = @churchId
    `;
    const result = await executeQuery(query, { code, churchId });
    if (result.recordset[0]) return result.recordset[0];

    // 2. Fallback: Virtual Inscription (Get details from Niche Application)
    // Extract base code from I-XXXXX or I-XXXX-X
    const baseCode = code.replace(/^I-/, '');
    const nicheApp = await this.resolveNicheApplication(baseCode, churchId);
    if (nicheApp) {
      return {
        ...nicheApp,
        Code: code,
        Type: 'INCR',
        isVirtual: true
      };
    }
    return null;
  }

  async resolveNicheApplication(code, churchId) {
    // Fast path: exact application code match (most common and indexed in many schemas)
    const directQuery = `
      SELECT TOP 1
        na.NicheApplicationId as Id,
        na.Code,
        na.ApplicantName,
        na.ApplicantAddressNo,
        na.ApplicantAddressLine1,
        na.ApplicantAddressLine2,
        na.ApplicantAddressCity,
        na.ApplicantAddressState,
        na.ApplicantAddressCountry,
        na.ApplicantMobileNo,
        na.ApplicantEmailID,
        na.Amount,
        'NAPP' as Type,
        n.Code as NicheCode,
        n.NicheId
      FROM NicheApplication na WITH(NOLOCK)
      LEFT JOIN Niche n WITH(NOLOCK) ON na.NicheId = n.NicheId
      WHERE na.Code = @code AND na.ChurchId = @churchId
    `;
    const directResult = await executeQuery(directQuery, { code, churchId }, { timeout: 5000 });
    if (directResult.recordset[0]) {
      return directResult.recordset[0];
    }

    // Fallback path: allow matching by niche code when caller passes niche code instead of app code.
    const fallbackQuery = `
      SELECT TOP 1
        na.NicheApplicationId as Id,
        na.Code,
        na.ApplicantName,
        na.ApplicantAddressNo,
        na.ApplicantAddressLine1,
        na.ApplicantAddressLine2,
        na.ApplicantAddressCity,
        na.ApplicantAddressState,
        na.ApplicantAddressCountry,
        na.ApplicantMobileNo,
        na.ApplicantEmailID,
        na.Amount,
        'NAPP' as Type,
        n.Code as NicheCode,
        n.NicheId
      FROM NicheApplication na WITH(NOLOCK)
      LEFT JOIN Niche n WITH(NOLOCK) ON na.NicheId = n.NicheId
      WHERE n.Code = @code AND na.ChurchId = @churchId
    `;
    const fallbackResult = await executeQuery(fallbackQuery, { code, churchId }, { timeout: 5000 });
    return fallbackResult.recordset[0] || null;
  }
}

module.exports = new ApplicationService();
