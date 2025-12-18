# 📋 Quick Start Checklist

Follow this checklist to get your Stock Counter up and running in ~20 minutes.

## ☐ Step 1: Create Master Google Sheet (5 min)

1. ☐ Go to https://sheets.google.com
2. ☐ Create new spreadsheet
3. ☐ Name it: `Stock Master Database`
4. ☐ Create Tab 1: `Product Database`
   - ☐ Add headers: Barcode | Product | Current Stock | $ Value
   - ☐ Add at least 3 test products
5. ☐ Create Tab 2: `Users`
   - ☐ Add header: Username
   - ☐ Add your username
   - ☐ Add teammates' usernames
6. ☐ Create Tab 3: `Locations`
   - ☐ Add header: Location
   - ☐ Add your warehouse locations
7. ☐ **Save the Sheet ID** from the URL
   - URL format: `https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit`
   - Copy the SHEET_ID_HERE part

---

## ☐ Step 2: Set Up Apps Script (7 min)

1. ☐ In your Google Sheet, click `Extensions` → `Apps Script`
2. ☐ Delete default code
3. ☐ Open `AppsScript.gs` from this project
4. ☐ Copy ALL the code
5. ☐ Paste into Apps Script editor
6. ☐ **Update Line 6**: Replace `YOUR_MASTER_SHEET_ID_HERE` with your Sheet ID from Step 1
7. ☐ Click **Save** (💾 icon)
8. ☐ Name the project: `Stock Counter API`

### Deploy as Web App

9. ☐ Click **Deploy** → **New deployment**
10. ☐ Click gear icon ⚙️ → Select **Web app**
11. ☐ Set **Execute as**: `Me`
12. ☐ Set **Who has access**: `Anyone with the link`
13. ☐ Click **Deploy**
14. ☐ Click **Authorize access**
15. ☐ Choose your Google account
16. ☐ Click **Advanced** → **Go to Stock Counter API (unsafe)**
17. ☐ Click **Allow**
18. ☐ **Copy the Web App URL** (starts with `https://script.google.com/...`)
19. ☐ Save this URL somewhere safe!

### Test the Setup

20. ☐ In Apps Script, click **Run** → Select `testSetup` function
21. ☐ Check **Execution log** - should show sheet names and counts
22. ☐ If errors appear, double-check sheet tab names match exactly

---

## ☐ Step 3: Set Up User Passwords (3 min)

1. ☐ In Apps Script Editor, click **Project Settings** (⚙️ icon on left)
2. ☐ Scroll to **Script Properties**
3. ☐ Click **Add script property**
4. ☐ For each user, add:
   - Property: `password_USERNAME`
   - Value: `their_password`

Example:
- ☐ Property: `password_John` → Value: `john1234`
- ☐ Property: `password_Sarah` → Value: `sarah5678`

5. ☐ Click **Save script properties**

---

## ☐ Step 4: Configure React App (2 min)

1. ☐ Open `stock_counter_v2.tsx`
2. ☐ Find Line 10: `const APPS_SCRIPT_URL = 'YOUR_APPS_SCRIPT_WEB_APP_URL_HERE';`
3. ☐ Replace with your Web App URL from Step 2 (Step 18)
4. ☐ Save the file

Example:
```typescript
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz.../exec';
```

---

## ☐ Step 5: Test the App (3 min)

### Test 1: Login
1. ☐ Open the React app in your browser
2. ☐ Enter your username (exact match from Users sheet)
3. ☐ Enter your password (from Script Properties)
4. ☐ Click **Sign In**
5. ☐ Should see Settings page

### Test 2: Create Stocktake
1. ☐ Click **Start New Stocktake**
2. ☐ Enter name: `Test Stocktake`
3. ☐ Click **Create Stocktake**
4. ☐ Should redirect to scan page
5. ☐ Check Google Drive - new sheet should appear: `Stocktake - Test Stocktake - [date]`

### Test 3: Scan Item
1. ☐ Select a location from dropdown
2. ☐ Enter a test barcode
3. ☐ Press Enter
4. ☐ Should see product details
5. ☐ Enter quantity: `5`
6. ☐ Click **Confirm**
7. ☐ Should see scan in list with yellow status (unsynced)

### Test 4: Sync
1. ☐ Scan 10 items (or click Manual Sync)
2. ☐ Should see "Syncing..." then "Synced!"
3. ☐ Scan status should turn green
4. ☐ Open the stocktake Google Sheet
5. ☐ Check **Raw Scans** tab - your scans should be there!
6. ☐ Check **Tally** tab - totals should be calculated

### Test 5: Offline Mode
1. ☐ Turn off WiFi
2. ☐ Scan a few items
3. ☐ Should see "Offline" indicator
4. ☐ Scans should still save (yellow status)
5. ☐ Turn WiFi back on
6. ☐ Click **Sync**
7. ☐ Should sync successfully

---

## ☐ Step 6: Multi-User Test (Optional, 5 min)

1. ☐ Add another user to Users sheet
2. ☐ Add their password to Script Properties
3. ☐ Open app in different browser/device
4. ☐ Login as second user
5. ☐ Select same stocktake
6. ☐ Both users scan items
7. ☐ Check Google Sheet - should see scans from both users!

---

## ✅ Checklist Complete!

You're ready to start using the Stock Counter!

### Quick Reference

**Login:**
- Username: (from Users sheet)
- Password: (from Script Properties)

**Web App URL:** [Paste your URL here]

**Master Sheet:** [Paste sheet URL here]

**Support:** Check README.md or SETUP_GUIDE.md for detailed help

---

## 🐛 Common Issues

### "Authentication failed"
- ☐ Check username spelling (case-sensitive)
- ☐ Verify password in Script Properties: `password_USERNAME`

### "Network error"
- ☐ Check Apps Script URL is correct
- ☐ Verify deployment is "Anyone with the link"
- ☐ Check internet connection

### "No products found"
- ☐ Verify Product Database has data (at least row 2)
- ☐ Check column headers are exact: Barcode, Product, Current Stock, $ Value

### Can't access Apps Script
- ☐ Make sure you're logged into same Google account
- ☐ Check sheet permissions

### Scans not syncing
- ☐ Check internet connection
- ☐ Open browser console (F12) for error messages
- ☐ Verify stocktake sheet exists in Drive
- ☐ Check Apps Script execution quota (rarely an issue)

---

## 📞 Next Steps

1. ☐ Add your real product database
2. ☐ Add all team members
3. ☐ Create your first real stocktake
4. ☐ Train your team on how to use it
5. ☐ Bookmark important sheet URLs

**Happy counting! 📦✨**
