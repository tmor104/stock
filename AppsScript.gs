// Stock Counter - Google Apps Script Backend
// This script provides API endpoints for the React stock counter app

// CONFIGURATION - Update this with your Master Sheet ID
const MASTER_SHEET_ID = '1e3rsYW4RoEpxpH8ZMckLP7VdtnpbbfQpd8N_NB9fRgM'; // Master Sheet ID

// Main entry point for HTTP requests
function doPost(e) {
  try {
    const request = JSON.parse(e.postData.contents);
    const action = request.action;

    // Route to appropriate handler
    switch(action) {
      case 'authenticate':
        return handleAuthentication(request);
      case 'getProductDatabase':
        return handleGetProductDatabase(request);
      case 'getLocations':
        return handleGetLocations(request);
      case 'getKegs':
        return handleGetKegs(request);
      case 'createStocktake':
        return handleCreateStocktake(request);
      case 'listStocktakes':
        return handleListStocktakes(request);
      case 'syncScans':
        return handleSyncScans(request);
      case 'loadUserScans':
        return handleLoadUserScans(request);
      case 'syncKegs':
        return handleSyncKegs(request);
      case 'syncManualEntries':
        return handleSyncManualEntries(request);
      default:
        return createResponse(false, 'Unknown action: ' + action);
    }
  } catch (error) {
    return createResponse(false, 'Server error: ' + error.message);
  }
}

// Handle GET requests (for testing)
function doGet(e) {
  return ContentService.createTextOutput('Stock Counter API is running. Use POST requests.');
}

// Handle OPTIONS requests for CORS preflight
function doOptions(e) {
  return ContentService
    .createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeaders({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '3600'
    });
}

// ============================================
// AUTHENTICATION
// ============================================

function handleAuthentication(request) {
  const { username, password } = request;

  // Get users from Master Sheet
  const ss = SpreadsheetApp.openById(MASTER_SHEET_ID);
  const usersSheet = ss.getSheetByName('Users');
  const users = usersSheet.getRange('A2:A' + usersSheet.getLastRow()).getValues();

  // Check if username exists
  const userExists = users.some(row => row[0] === username);
  if (!userExists) {
    return createResponse(false, 'User not found');
  }

  // Check password from Script Properties
  const scriptProperties = PropertiesService.getScriptProperties();
  const storedPassword = scriptProperties.getProperty('password_' + username);

  if (storedPassword === password) {
    return createResponse(true, 'Authentication successful', { username });
  } else {
    return createResponse(false, 'Invalid password');
  }
}

// ============================================
// PRODUCT DATABASE
// ============================================

function handleGetProductDatabase(request) {
  const ss = SpreadsheetApp.openById(MASTER_SHEET_ID);
  const productSheet = ss.getSheetByName('Product Database');

  const lastRow = productSheet.getLastRow();
  if (lastRow < 2) {
    return createResponse(true, 'No products found', { products: [] });
  }

  // Get all product data (skip header row)
  const data = productSheet.getRange('A2:D' + lastRow).getValues();

  const products = data.map(row => ({
    barcode: row[0].toString(),
    product: row[1],
    currentStock: row[2] || 0,
    value: row[3] || 0
  }));

  return createResponse(true, 'Products loaded', { products });
}

// ============================================
// LOCATIONS
// ============================================

function handleGetLocations(request) {
  const ss = SpreadsheetApp.openById(MASTER_SHEET_ID);
  const locationsSheet = ss.getSheetByName('Locations');

  const lastRow = locationsSheet.getLastRow();
  if (lastRow < 2) {
    return createResponse(true, 'No locations found', { locations: [] });
  }

  const data = locationsSheet.getRange('A2:A' + lastRow).getValues();
  const locations = data.map(row => row[0]).filter(loc => loc !== '');

  return createResponse(true, 'Locations loaded', { locations });
}

// ============================================
// KEGS
// ============================================

function handleGetKegs(request) {
  const ss = SpreadsheetApp.openById(MASTER_SHEET_ID);
  const kegsSheet = ss.getSheetByName('Kegs');

  if (!kegsSheet) {
    return createResponse(false, 'Kegs sheet not found in Master Sheet');
  }

  const lastRow = kegsSheet.getLastRow();
  if (lastRow < 2) {
    return createResponse(true, 'No kegs found', { kegs: [] });
  }

  const data = kegsSheet.getRange('A2:A' + lastRow).getValues();
  const kegs = data.map(row => row[0]).filter(keg => keg !== '');

  return createResponse(true, 'Kegs loaded', { kegs });
}

// ============================================
// STOCKTAKE MANAGEMENT
// ============================================

function handleCreateStocktake(request) {
  const { name, user } = request;
  const timestamp = new Date();
  const dateStr = Utilities.formatDate(timestamp, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');

  // Create new spreadsheet for this stocktake
  const stocktakeName = `Stocktake - ${name} - ${dateStr}`;
  const newSheet = SpreadsheetApp.create(stocktakeName);
  const stocktakeId = newSheet.getId();

  // Set up Tally sheet
  const tallySheet = newSheet.getActiveSheet();
  tallySheet.setName('Tally');
  tallySheet.getRange('A1:F1').setValues([[
    'Barcode', 'Product', 'Total Quantity', 'Locations', 'Last Updated', 'Stock Level'
  ]]);
  tallySheet.getRange('A1:F1').setFontWeight('bold').setBackground('#4A5568').setFontColor('#FFFFFF');

  // Create Raw Scans sheet
  const rawScansSheet = newSheet.insertSheet('Raw Scans');
  rawScansSheet.getRange('A1:J1').setValues([[
    'Barcode', 'Product', 'Quantity', 'Location', 'User', 'Timestamp', 'Stock Level', '$ Value', 'Synced', 'Sync ID'
  ]]);
  rawScansSheet.getRange('A1:J1').setFontWeight('bold').setBackground('#2D3748').setFontColor('#FFFFFF');

  // Create Manual Entries sheet
  const manualEntriesSheet = newSheet.insertSheet('Manual Entries');
  manualEntriesSheet.getRange('A1:F1').setValues([[
    'Product Name', 'Quantity', 'Location', 'User', 'Timestamp', 'Sync ID'
  ]]);
  manualEntriesSheet.getRange('A1:F1').setFontWeight('bold').setBackground('#7C3AED').setFontColor('#FFFFFF');

  // Create Kegs sheet
  const kegsSheet = newSheet.insertSheet('Kegs');
  kegsSheet.getRange('A1:E1').setValues([[
    'Keg Name', 'Count', 'Location', 'User', 'Timestamp'
  ]]);
  kegsSheet.getRange('A1:E1').setFontWeight('bold').setBackground('#EA580C').setFontColor('#FFFFFF');

  // Store metadata as sheet property
  const sheetProps = PropertiesService.getDocumentProperties();
  sheetProps.setProperty('stocktake_name', name);
  sheetProps.setProperty('created_by', user);
  sheetProps.setProperty('created_date', dateStr);
  sheetProps.setProperty('status', 'Active');

  return createResponse(true, 'Stocktake created', {
    stocktakeId,
    name: stocktakeName,
    url: newSheet.getUrl()
  });
}

function handleListStocktakes(request) {
  // Search for stocktake sheets in Drive
  const files = DriveApp.searchFiles(
    'title contains "Stocktake -" and mimeType = "application/vnd.google-apps.spreadsheet"'
  );

  const stocktakes = [];
  while (files.hasNext()) {
    const file = files.next();
    const ss = SpreadsheetApp.openById(file.getId());

    // Try to get metadata from document properties
    const props = PropertiesService.getDocumentProperties();
    const name = props.getProperty('stocktake_name') || file.getName();
    const createdBy = props.getProperty('created_by') || 'Unknown';
    const createdDate = props.getProperty('created_date') || 'Unknown';
    const status = props.getProperty('status') || 'Active';

    stocktakes.push({
      id: file.getId(),
      name: file.getName(),
      displayName: name,
      createdBy,
      createdDate,
      status,
      url: file.getUrl(),
      lastModified: file.getLastUpdated()
    });
  }

  // Sort by last modified (newest first)
  stocktakes.sort((a, b) => b.lastModified - a.lastModified);

  return createResponse(true, 'Stocktakes loaded', { stocktakes });
}

// ============================================
// SCAN SYNCING
// ============================================

function handleSyncScans(request) {
  const { stocktakeId, scans } = request;

  if (!scans || scans.length === 0) {
    return createResponse(true, 'No scans to sync', { syncedCount: 0 });
  }

  const ss = SpreadsheetApp.openById(stocktakeId);
  const rawScansSheet = ss.getSheetByName('Raw Scans');
  const tallySheet = ss.getSheetByName('Tally');

  // Get all existing scan IDs to check for updates
  const lastRow = rawScansSheet.getLastRow();
  const existingScanIds = {};

  if (lastRow > 1) {
    const existingData = rawScansSheet.getRange('J2:J' + lastRow).getValues(); // Column J is syncId
    existingData.forEach((row, index) => {
      if (row[0]) {
        existingScanIds[row[0]] = index + 2; // +2 because index is 0-based and we start at row 2
      }
    });
  }

  const scansToAdd = [];
  const syncedIds = [];

  // Process each scan - either update existing or prepare to add new
  scans.forEach(scan => {
    const scanRow = [
      scan.barcode,
      scan.product,
      scan.quantity,
      scan.location,
      scan.user,
      scan.timestamp,
      scan.stockLevel || '',
      scan.value || '',
      'Yes',
      scan.syncId
    ];

    if (existingScanIds[scan.syncId]) {
      // Update existing scan
      const rowIndex = existingScanIds[scan.syncId];
      rawScansSheet.getRange(rowIndex, 1, 1, 10).setValues([scanRow]);
    } else {
      // Add to list of new scans to append
      scansToAdd.push(scanRow);
    }

    syncedIds.push(scan.syncId);
  });

  // Append new scans if any
  if (scansToAdd.length > 0) {
    const newLastRow = rawScansSheet.getLastRow();
    rawScansSheet.getRange(newLastRow + 1, 1, scansToAdd.length, 10).setValues(scansToAdd);
  }

  // Update Tally sheet
  updateTally(tallySheet, rawScansSheet);

  return createResponse(true, 'Scans synced successfully', {
    syncedCount: scans.length,
    syncedIds: syncedIds,
    newScans: scansToAdd.length,
    updatedScans: scans.length - scansToAdd.length
  });
}

function updateTally(tallySheet, rawScansSheet) {
  // Get all raw scans (excluding header)
  const lastRow = rawScansSheet.getLastRow();
  if (lastRow < 2) return;

  const rawData = rawScansSheet.getRange('A2:H' + lastRow).getValues();

  // Aggregate by barcode
  const tally = {};
  rawData.forEach(row => {
    const barcode = row[0].toString();
    const product = row[1];
    const quantity = parseFloat(row[2]) || 0;
    const location = row[3];
    const stockLevel = row[6];

    if (!tally[barcode]) {
      tally[barcode] = {
        product,
        totalQty: 0,
        locations: new Set(),
        stockLevel,
        lastUpdated: new Date()
      };
    }

    tally[barcode].totalQty += quantity;
    tally[barcode].locations.add(location);
    tally[barcode].lastUpdated = new Date();
  });

  // Clear existing tally (keep header)
  if (tallySheet.getLastRow() > 1) {
    tallySheet.getRange('A2:F' + tallySheet.getLastRow()).clearContent();
  }

  // Write updated tally
  const tallyRows = Object.keys(tally).map(barcode => [
    barcode,
    tally[barcode].product,
    tally[barcode].totalQty,
    Array.from(tally[barcode].locations).join(', '),
    Utilities.formatDate(tally[barcode].lastUpdated, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'),
    tally[barcode].stockLevel
  ]);

  if (tallyRows.length > 0) {
    tallySheet.getRange(2, 1, tallyRows.length, 6).setValues(tallyRows);
  }
}

// ============================================
// LOAD USER SCAN HISTORY
// ============================================

function handleLoadUserScans(request) {
  const { stocktakeId, username } = request;

  const ss = SpreadsheetApp.openById(stocktakeId);
  const rawScansSheet = ss.getSheetByName('Raw Scans');

  const lastRow = rawScansSheet.getLastRow();
  if (lastRow < 2) {
    return createResponse(true, 'No scans found', { scans: [] });
  }

  // Get all scans
  const data = rawScansSheet.getRange('A2:J' + lastRow).getValues();

  // Filter by username and map to scan objects
  const userScans = data
    .filter(row => row[4] === username) // Column E is User
    .map(row => ({
      barcode: row[0].toString(),
      product: row[1],
      quantity: row[2],
      location: row[3],
      user: row[4],
      timestamp: row[5],
      stockLevel: row[6],
      value: row[7],
      synced: row[8] === 'Yes',
      syncId: row[9]
    }));

  return createResponse(true, 'User scans loaded', {
    scans: userScans,
    count: userScans.length
  });
}

// ============================================
// KEGS SYNCING
// ============================================

function handleSyncKegs(request) {
  const { stocktakeId, kegs, location, user } = request;

  if (!kegs || kegs.length === 0) {
    return createResponse(true, 'No kegs to sync', { syncedCount: 0 });
  }

  const ss = SpreadsheetApp.openById(stocktakeId);
  const kegsSheet = ss.getSheetByName('Kegs');

  if (!kegsSheet) {
    return createResponse(false, 'Kegs sheet not found in stocktake');
  }

  const timestamp = new Date();
  const dateStr = Utilities.formatDate(timestamp, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');

  // Get kegs with counts > 0
  const kegsToSync = kegs.filter(keg => keg.count > 0);

  if (kegsToSync.length === 0) {
    return createResponse(true, 'No kegs with counts to sync', { syncedCount: 0 });
  }

  // Prepare rows to add
  const kegRows = kegsToSync.map(keg => [
    keg.name,
    keg.count,
    location,
    user,
    dateStr
  ]);

  // Append to kegs sheet
  const lastRow = kegsSheet.getLastRow();
  kegsSheet.getRange(lastRow + 1, 1, kegRows.length, 5).setValues(kegRows);

  return createResponse(true, 'Kegs synced successfully', {
    syncedCount: kegsToSync.length
  });
}

// ============================================
// MANUAL ENTRIES SYNCING
// ============================================

function handleSyncManualEntries(request) {
  const { stocktakeId, manualEntries } = request;

  if (!manualEntries || manualEntries.length === 0) {
    return createResponse(true, 'No manual entries to sync', { syncedCount: 0 });
  }

  const ss = SpreadsheetApp.openById(stocktakeId);
  const manualSheet = ss.getSheetByName('Manual Entries');

  if (!manualSheet) {
    return createResponse(false, 'Manual Entries sheet not found in stocktake');
  }

  // Get all existing sync IDs to check for updates
  const lastRow = manualSheet.getLastRow();
  const existingSyncIds = {};

  if (lastRow > 1) {
    const existingData = manualSheet.getRange('F2:F' + lastRow).getValues(); // Column F is syncId
    existingData.forEach((row, index) => {
      if (row[0]) {
        existingSyncIds[row[0]] = index + 2; // +2 because index is 0-based and we start at row 2
      }
    });
  }

  const entriesToAdd = [];
  const syncedIds = [];

  // Process each manual entry - either update existing or prepare to add new
  manualEntries.forEach(entry => {
    const entryRow = [
      entry.product,
      entry.quantity,
      entry.location,
      entry.user,
      entry.timestamp,
      entry.syncId
    ];

    if (existingSyncIds[entry.syncId]) {
      // Update existing entry
      const rowIndex = existingSyncIds[entry.syncId];
      manualSheet.getRange(rowIndex, 1, 1, 6).setValues([entryRow]);
    } else {
      // Add to list of new entries to append
      entriesToAdd.push(entryRow);
    }

    syncedIds.push(entry.syncId);
  });

  // Append new entries if any
  if (entriesToAdd.length > 0) {
    const newLastRow = manualSheet.getLastRow();
    manualSheet.getRange(newLastRow + 1, 1, entriesToAdd.length, 6).setValues(entriesToAdd);
  }

  return createResponse(true, 'Manual entries synced successfully', {
    syncedCount: manualEntries.length,
    syncedIds: syncedIds,
    newEntries: entriesToAdd.length,
    updatedEntries: manualEntries.length - entriesToAdd.length
  });
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function createResponse(success, message, data = {}) {
  const response = {
    success,
    message,
    ...data
  };

  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeaders({
      'Access-Control-Allow-Origin': '*'
    });
}

// Test function (run this in Apps Script to verify setup)
function testSetup() {
  Logger.log('Testing Master Sheet access...');
  const ss = SpreadsheetApp.openById(MASTER_SHEET_ID);
  Logger.log('Master Sheet Name: ' + ss.getName());

  Logger.log('Testing Product Database...');
  const productSheet = ss.getSheetByName('Product Database');
  Logger.log('Products found: ' + (productSheet.getLastRow() - 1));

  Logger.log('Testing Users...');
  const usersSheet = ss.getSheetByName('Users');
  Logger.log('Users found: ' + (usersSheet.getLastRow() - 1));

  Logger.log('Testing Locations...');
  const locationsSheet = ss.getSheetByName('Locations');
  Logger.log('Locations found: ' + (locationsSheet.getLastRow() - 1));

  Logger.log('Setup test complete!');
}
