# Fixing CORS Headers in Google Apps Script

## The Problem

When your GitHub Pages site (https://tmor104.github.io) tries to fetch data from your Google Apps Script, the browser blocks the request because:

1. They're on different domains (cross-origin request)
2. Your Apps Script isn't sending the required `Access-Control-Allow-Origin` header
3. **CORS is enforced by the browser** - you cannot disable it from the client side

## The Solution

You **MUST** add CORS headers to your Google Apps Script responses. See the `Code.gs` file for the complete implementation.

## Critical Code Sections

### 1. The CORS Response Function (REQUIRED)

```javascript
function createCorsResponse(data) {
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);

  // CRITICAL: This header enables CORS
  output.setHeader('Access-Control-Allow-Origin', 'https://tmor104.github.io');

  // Or use '*' to allow any origin (less secure but works for testing)
  // output.setHeader('Access-Control-Allow-Origin', '*');

  output.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  output.setHeader('Access-Control-Allow-Headers', 'Content-Type');

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

1. **Open Google Apps Script**
   - Go to https://script.google.com
   - Open your existing stock counter script

2. **Add CORS Headers**
   - Copy the `createCorsResponse` function from `Code.gs`
   - Update ALL your `doGet` and `doPost` functions to use `createCorsResponse()`
   - Make sure EVERY response includes the CORS headers

3. **Deploy as Web App**
   - Click "Deploy" → "New deployment"
   - Choose type: "Web app"
   - Execute as: "Me"
   - Who has access: "Anyone" (or "Anyone with Google account" depending on your needs)
   - Click "Deploy"
   - Copy the new Web App URL

4. **Update Your Frontend**
   - Replace the old script URL with the new deployment URL
   - Test the connection

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
