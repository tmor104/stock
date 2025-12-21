# Deployment Instructions - Fix CORS Issues

## ✅ What I Fixed

1. **Updated `src/StockCounter.tsx` (line 8)** - Changed from Apps Script URL to Cloudflare Worker URL
2. **Added all source files** to the `claude/fix-cors-headers-jBEX1` branch
3. **Committed and pushed** all changes

## 🚀 What You Need To Do Now

### Step 1: Update Your Cloudflare Worker (CRITICAL!)

The Worker needs the Apps Script URL to forward requests. Make sure you've done this:

1. Go to https://dash.cloudflare.com
2. Click "Workers & Pages"
3. Click on "stock-cors-proxy"
4. Click "Edit Code"
5. Find line 21:
   ```javascript
   const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycb.../exec';
   ```
6. Replace with YOUR actual Apps Script URL
7. Click "Save and Deploy"

**How to get your Apps Script URL:**
- Go to https://script.google.com
- Open your stock counter script
- Click "Deploy" → "Manage deployments"
- Copy the Web App URL (ends with `/exec`)

### Step 2: Deploy Your Frontend

You need to rebuild and deploy your frontend application. The code change is already committed, but you need to:

**Option A: Deploy to GitHub Pages from this branch**

1. Go to your GitHub repository settings
2. Go to "Pages"
3. Set the source branch to `claude/fix-cors-headers-jBEX1`
4. Set the folder to `/` (root) or wherever your build output goes
5. Save

**Option B: Build locally and deploy**

```bash
# Install dependencies
npm install

# Build the project
npm run build

# The build output will be in the 'dist' folder
# Deploy the contents of 'dist' to GitHub Pages
```

**Option C: Merge to your main/deployed branch**

If you have a different branch that gets deployed:
```bash
git checkout your-deployed-branch
git merge claude/fix-cors-headers-jBEX1
git push
```

### Step 3: Test It!

Once deployed, open your app at https://tmor104.github.io/stock (or wherever it's deployed).

**Open the browser console (F12)** and you should see:
- ✅ No CORS errors
- ✅ Successful API calls
- ✅ Data loading from Google Sheets

## 🔍 How to Verify

### Test 1: Check the Network Tab
1. Open browser DevTools (F12)
2. Go to Network tab
3. Try to authenticate or load products
4. Click on the request
5. **Check the URL** - it should be `https://stock-cors-proxy.tomwmorgan47.workers.dev`
6. **Check Response Headers** - should include `Access-Control-Allow-Origin: *`

### Test 2: Console Test
Open the console (F12) and run:
```javascript
fetch('https://stock-cors-proxy.tomwmorgan47.workers.dev')
  .then(r => r.json())
  .then(data => console.log('✅ Worker works!', data))
  .catch(err => console.error('❌ Error:', err));
```

## 📋 Summary of Changes

### Frontend Changes
- **File:** `src/StockCounter.tsx`
- **Line:** 8
- **Change:** `const APPS_SCRIPT_URL = 'https://stock-cors-proxy.tomwmorgan47.workers.dev';`

### Cloudflare Worker
- **URL:** https://stock-cors-proxy.tomwmorgan47.workers.dev
- **What it does:** Forwards requests to your Apps Script and adds CORS headers
- **Code:** See `cloudflare-worker.js`

### Apps Script
- **No changes needed** to the Apps Script itself
- The Worker handles all CORS headers
- Apps Script just needs to process requests normally

## 🎯 How It Works Now

```
┌─────────────────┐         ┌──────────────────────────┐         ┌──────────────┐
│  Your Frontend  │────────>│   Cloudflare Worker      │────────>│ Apps Script  │
│ (GitHub Pages)  │         │ stock-cors-proxy....dev  │         │  (Backend)   │
└─────────────────┘<────────└──────────────────────────┘<────────└──────────────┘
        ↑                              ↑
        │                              │
        └──── CORS headers ────────────┘
         (Added by Cloudflare Worker)
```

1. Frontend calls `https://stock-cors-proxy.tomwmorgan47.workers.dev`
2. Worker forwards to your Apps Script
3. Apps Script processes the request
4. Worker adds CORS headers to the response
5. Frontend receives response (no CORS errors!)

## ❓ Troubleshooting

### Still Getting CORS Errors
- ✅ Verify the Worker has your correct Apps Script URL (Step 1)
- ✅ Make sure you rebuilt and redeployed the frontend (Step 2)
- ✅ Clear browser cache (Ctrl+Shift+R)
- ✅ Check Network tab to verify it's calling the Worker URL, not Apps Script

### Worker Returns 500 Error
- The Worker can't reach your Apps Script
- Check the `APPS_SCRIPT_URL` in the worker code
- Make sure your Apps Script is deployed as a "Web app" with "Anyone" access

### Frontend Not Updated
- You may need to clear cache or do a hard refresh
- Check which branch is deployed to GitHub Pages
- Verify the build includes the latest code

---

**All code changes are committed and pushed to the `claude/fix-cors-headers-jBEX1` branch!** 🎉

You just need to:
1. Update the Cloudflare Worker with your Apps Script URL
2. Deploy/rebuild your frontend
3. Test it!
