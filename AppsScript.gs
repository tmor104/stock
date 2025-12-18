// Stock Counter - Google Apps Script Backend
// This script provides API endpoints for the React stock counter app

// CONFIGURATION - Update this with your Master Sheet ID
const MASTER_SHEET_ID = 'YOUR_MASTER_SHEET_ID_HERE'; // Get this from the Google Sheet URL

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
      case 'createStocktake':
        return handleCreateStocktake(request);
      case 'listStocktakes':
        return handleListStocktakes(request);
      case 'syncScans':
        return handleSyncScans(request);
      case 'loadUserScans':
        return handleLoadUserScans(request);
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

  // Append scans to Raw Scans sheet
  const rowsToAdd = scans.map(scan => [
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
  ]);

  const lastRow = rawScansSheet.getLastRow();
  rawScansSheet.getRange(lastRow + 1, 1, rowsToAdd.length, 10).setValues(rowsToAdd);

  // Update Tally sheet
  updateTally(tallySheet, rawScansSheet);

  return createResponse(true, 'Scans synced successfully', {
    syncedCount: scans.length,
    syncedIds: scans.map(s => s.syncId)
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
    .setMimeType(ContentService.MimeType.JSON);
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
