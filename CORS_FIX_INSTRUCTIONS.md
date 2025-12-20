# Fixing CORS Headers in Google Apps Script

## The Problem

When your GitHub Pages site (https://tmor104.github.io) tries to fetch data from your Google Apps Script, the browser blocks the request because:

1. They're on different domains (cross-origin request)
2. Your Apps Script isn't sending the required `Access-Control-Allow-Origin` header
3. **CORS is enforced by the browser** - you cannot disable it from the client side

## The Solution

You **MUST** add CORS headers to your Google Apps Script responses. This version is configured to allow requests from **ANY domain** using `Access-Control-Allow-Origin: *`. See the `AppsScript.gs` file for the complete implementation.

## Critical Code Sections

### 1. The CORS Response Function (REQUIRED)

```javascript
function createCorsResponse(data) {
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);

  // CRITICAL: This header enables CORS for ALL domains
  output.setHeader('Access-Control-Allow-Origin', '*');

  output.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  output.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  output.setHeader('Access-Control-Max-Age', '3600');

  return output;
}
```

### 2. Use It In Your Request Handlers

```javascript
function doGet(e) {
  try {
    // Your logic here
    var result = { success: true, data: "your data" };

    // ALWAYS return with CORS headers
    return createCorsResponse(result);
  } catch (error) {
    return createCorsResponse({ success: false, error: error.toString() });
  }
}

function doPost(e) {
  // Same pattern for POST
  return createCorsResponse(yourData);
}
```

## Deployment Steps

### Option 1: Quick Update (Recommended)

1. **Open Your Existing Apps Script**
   - Go to https://script.google.com
   - Find and open your "Stock Counter" script (or whatever you named it)

2. **Replace the Entire Code**
   - Select ALL the existing code (Ctrl+A / Cmd+A)
   - Delete it
   - Open the `AppsScript.gs` file from this repository
   - Copy ALL the code from `AppsScript.gs`
   - Paste it into your Apps Script editor

3. **Verify Your Master Sheet ID**
   - Check line 6: `const MASTER_SHEET_ID = '1e3rsYW4RoEpxpH8ZMckLP7VdtnpbbfQpd8N_NB9fRgM';`
   - Make sure this matches your actual Google Sheets ID
   - If not, update it with the correct ID

4. **Save the Script**
   - Click the disk icon or press Ctrl+S / Cmd+S
   - Give it a moment to save

5. **Deploy New Version**
   - Click "Deploy" → "New deployment"
   - Click the gear icon ⚙️ next to "Select type"
   - Choose "Web app"
   - Configure:
     - **Description:** "CORS fix deployment" (or anything you want)
     - **Execute as:** Me (your email)
     - **Who has access:** Anyone
   - Click "Deploy"
   - You may need to authorize the script (click "Authorize access")
   - Copy the **Web App URL** - this is your new API endpoint!

6. **Update Your Frontend Code**
   - Find where you call the Apps Script URL in your frontend code
   - Replace the old URL with the new Web App URL you just copied
   - The URL should look like: `https://script.google.com/macros/s/AKfycb.../exec`

### Option 2: Update Existing Deployment

If you want to update your existing deployment instead:

1. Follow steps 1-4 from Option 1
2. Click "Deploy" → "Manage deployments"
3. Click the edit icon (pencil) next to your existing deployment
4. Change "Version" to "New version"
5. Click "Deploy"
6. The URL stays the same, but the code is updated

**⚠️ IMPORTANT:** After deploying, wait 1-2 minutes before testing. Apps Script deployments sometimes take a moment to propagate.

## Important Notes

- **You CANNOT avoid CORS** - it's a browser security feature
- The headers MUST be set on the server (Apps Script) side
- Every single response needs the CORS headers
- If you change your script, you may need to create a new deployment

## Testing

After deploying, test with:

```javascript
fetch('YOUR_APPS_SCRIPT_URL?action=test')
  .then(r => r.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));
```

If you still see CORS errors, check:
1. Did you deploy a NEW version after adding CORS headers?
2. Are you using the correct deployment URL?
3. Is the `Access-Control-Allow-Origin` header set to your domain or '*'?
