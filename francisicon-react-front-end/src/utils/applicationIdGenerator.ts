/**
 * Utility functions for generating application IDs based on niche codes
 */

/**
 * Generates an application ID based on the niche identifier with incremental numbering
 * @param nicheIdentifier - The niche identifier to base the application ID on (e.g., '1409')
 * @param existingApplications - List of existing applications to check for conflicts
 * @returns Generated application ID in the format '{nicheIdentifier}-incrementalNumber' (e.g., '1409-0', '1409-1')
 */
export function generateApplicationId(nicheIdentifier: string, existingApplications: any[]): string {
  if (!nicheIdentifier || nicheIdentifier.trim() === '') {
    // If no niche identifier provided, return a default format
    return `APP-${Date.now()}`;
  }

  // Clean the niche identifier - remove any non-alphanumeric characters except hyphens
  const cleanIdentifier = nicheIdentifier.trim().replace(/[^a-zA-Z0-9-]/g, '');
  
  if (cleanIdentifier === '') {
    console.warn('Invalid niche identifier provided:', nicheIdentifier);
    return `APP-${Date.now()}`;
  }

  // Find all existing applications with the same niche identifier prefix
  const existingWithSameNiche = existingApplications.filter(app => {
    const appCode = app.applicationCode || app.applicationNumber || app.code;
    return appCode && appCode.startsWith(`${cleanIdentifier}-`);
  });

  // Find the highest incremental number used
  let maxIncrement = -1;
  existingWithSameNiche.forEach(app => {
    const appCode = app.applicationCode || app.applicationNumber || app.code;
    const parts = appCode.split('-');
    if (parts.length >= 2) {
      const potentialNum = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(potentialNum) && potentialNum > maxIncrement) {
        maxIncrement = potentialNum;
      }
    }
  });

  // Return the next available number
  const nextIncrement = maxIncrement + 1;
  const result = `${cleanIdentifier}-${nextIncrement}`;
  
  console.log(`Generated application ID: ${result} from niche identifier: ${nicheIdentifier} (cleaned: ${cleanIdentifier})`);
  
  return result;
}

/**
 * Checks if an application ID already exists in the list
 * @param appId - The application ID to check
 * @param existingApplications - List of existing applications
 * @returns True if the application ID already exists, false otherwise
 */
export function applicationIdExists(appId: string, existingApplications: any[]): boolean {
  return existingApplications.some(app => {
    const appCode = app.applicationCode || app.applicationNumber || app.code;
    return appCode === appId;
  });
}