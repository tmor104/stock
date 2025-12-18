# Stock Counter - Google Apps Script Setup Guide

## Part 1: Create Your Master Google Sheet

1. **Create a new Google Sheet** at https://sheets.google.com
2. **Name it**: `Stock Master Database`
3. **Create 3 tabs:**

### Tab 1: Product Database
Create these column headers in Row 1:
- A1: `Barcode`
- B1: `Product`
- C1: `Current Stock`
- D1: `$ Value`

Example data (Row 2):
- A2: `12345678`
- B2: `Widget Pro`
- C2: `100`
- D2: `25.50`

### Tab 2: Users
Create this column header in Row 1:
- A1: `Username`

Add your users (one per row starting at Row 2):
- A2: `John`
- A3: `Sarah`
- A4: `Mike`

*Note: Passwords will be stored securely in Apps Script, not in this sheet*

### Tab 3: Locations
Create this column header in Row 1:
- A1: `Location`

Add your warehouse locations (starting at Row 2):
- A2: `Warehouse A`
- A3: `Warehouse B`
- A4: `Retail Floor`
- A5: `Back Storage`

---

## Part 2: Set Up Apps Script

1. **Open Apps Script Editor:**
   - In your Google Sheet, click `Extensions` → `Apps Script`
   - Delete any default code in `Code.gs`

2. **Copy the Apps Script code** (will be provided in `AppsScript.gs` file)

3. **Deploy as Web App:**
   - Click the **Deploy** button (top right) → **New deployment**
   - Click the gear icon ⚙️ next to "Select type" → Choose **Web app**
   - Fill in:
     - **Description**: `Stock Counter API v1`
     - **Execute as**: `Me`
     - **Who has access**: `Anyone with the link` ✅ (IMPORTANT!)
   - Click **Deploy**
   - **Copy the Web App URL** (it looks like: `https://script.google.com/macros/s/AKfy...../exec`)
   - Save this URL - you'll need it for the React app

4. **Authorize the script:**
   - Click **Authorize access**
   - Choose your Google account
   - Click **Advanced** → **Go to Stock Counter API (unsafe)**
   - Click **Allow**

---

## Part 3: Set Up Secure User Passwords

1. **In Apps Script Editor**, click the **Project Settings** icon (⚙️ on left sidebar)
2. Scroll to **Script Properties**
3. Click **Add script property**
4. Add each user's password with format: `password_USERNAME`

Example:
- Property: `password_John` → Value: `john1234`
- Property: `password_Sarah` → Value: `sarah5678`
- Property: `password_Mike` → Value: `mike9999`

5. Click **Save script properties**

**Security Note:** These passwords are NOT visible in the Google Sheet and can only be accessed by the Apps Script.

---

## Part 4: Configure Your React App

1. Open your React app configuration
2. Add the **Web App URL** from Part 2, Step 3
3. You'll need to update the `APPS_SCRIPT_URL` constant in the React code

---

## Part 5: Understanding Stocktake Sheets

When you **start a new stocktake**, the system will automatically:
1. Create a new Google Sheet named: `Stocktake - [Name] - [Date]`
2. Add 2 tabs:
   - **Tally**: Aggregated counts per product
   - **Raw Scans**: Every individual scan with user, timestamp, location

When you **select an existing stocktake**, the app will:
1. Load your previous scans from that stocktake's Raw Scans sheet
2. Show them with color coding (Green=synced, Yellow=pending, Red=failed)
3. Continue adding new scans to the same sheet

---

## Part 6: Testing

1. **Test the API:**
   - In Apps Script Editor, click **Run** → `testSetup`
   - Check **Execution log** for success messages

2. **Test from React app:**
   - Login with a username/password you created
   - Start a new stocktake
   - Scan some items
   - Check that a new Google Sheet was created in your Drive

---

## Troubleshooting

### "Authorization required" error
- Re-run the deployment authorization (Part 2, Step 4)

### "Cannot read property" errors
- Check that all sheet tabs are named exactly: `Product Database`, `Users`, `Locations`
- Check column headers match exactly (case-sensitive)

### Passwords not working
- Verify script properties are named: `password_USERNAME` (exact match)
- Usernames are case-sensitive

### Web app URL not working
- Make sure deployment is set to "Anyone with the link"
- Try redeploying with a new version

---

## Next Steps

Once setup is complete:
1. Load the React app in your browser
2. Login with username/password
3. Create a new stocktake or select existing one
4. Start scanning!

All scans are saved locally (IndexedDB) and auto-sync every 10 scans to Google Sheets.
