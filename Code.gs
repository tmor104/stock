/**
 * Google Apps Script for Stock Counter Application
 * This script handles CORS properly to allow requests from GitHub Pages
 */

// Handle GET requests
function doGet(e) {
  return handleRequest(e);
}

// Handle POST requests
function doPost(e) {
  return handleRequest(e);
}

// Main request handler with CORS support
function handleRequest(e) {
  try {
    // Parse the request
    var params = e.parameter || {};
    var action = params.action || '';

    var result = {};

    // Handle different actions
    switch(action) {
      case 'saveStock':
        result = saveStockData(params);
        break;
      case 'getStock':
        result = getStockData(params);
        break;
      default:
        result = { success: false, error: 'Unknown action' };
    }

    // Return response with CORS headers
    return createCorsResponse(result);

  } catch (error) {
    return createCorsResponse({
      success: false,
      error: error.toString()
    });
  }
}

// Create response with proper CORS headers
function createCorsResponse(data) {
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);

  // CRITICAL: These headers enable CORS
  // Allow requests from your GitHub Pages site
  output.setHeader('Access-Control-Allow-Origin', 'https://tmor104.github.io');

  // Alternatively, use '*' to allow from any origin (less secure)
  // output.setHeader('Access-Control-Allow-Origin', '*');

  output.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  output.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  output.setHeader('Access-Control-Max-Age', '3600');

  return output;
}

// Example: Save stock data to Google Sheets
function saveStockData(params) {
  try {
    var spreadsheetId = 'YOUR_SPREADSHEET_ID'; // Replace with your spreadsheet ID
    var sheet = SpreadsheetApp.openById(spreadsheetId).getActiveSheet();

    // Example: Parse and save data
    var data = JSON.parse(params.data || '[]');

    // Add timestamp
    var timestamp = new Date();

    // Append data to sheet
    data.forEach(function(item) {
      sheet.appendRow([
        timestamp,
        item.barcode,
        item.product,
        item.quantity,
        item.note || ''
      ]);
    });

    return {
      success: true,
      message: 'Stock data saved successfully',
      rowsAdded: data.length
    };

  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

// Example: Get stock data from Google Sheets
function getStockData(params) {
  try {
    var spreadsheetId = 'YOUR_SPREADSHEET_ID'; // Replace with your spreadsheet ID
    var sheet = SpreadsheetApp.openById(spreadsheetId).getActiveSheet();

    var data = sheet.getDataRange().getValues();

    return {
      success: true,
      data: data
    };

  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}
