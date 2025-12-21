# Quick Start Guide - Cloudflare Worker Setup

Your Cloudflare Worker is deployed at:
**https://stock-cors-proxy.tomwmorgan47.workers.dev**

## ✅ Current Status

- ✅ Worker created and deployed
- ⏳ Need to configure Apps Script URL in worker
- ⏳ Need to test the connection
- ⏳ Need to update frontend to use worker URL

## 🚀 Next Steps

### Step 1: Update Worker with Your Apps Script URL

1. Go to https://dash.cloudflare.com
2. Click "Workers & Pages"
3. Click on your "stock-cors-proxy" worker
4. Click "Edit Code"
5. Find line 21:
   ```javascript
   const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycb.../exec';
   ```
6. Replace the URL with YOUR actual Apps Script deployment URL
7. Click "Save and Deploy"

**Where to find your Apps Script URL:**
- Go to https://script.google.com
- Open your Stock Counter script
- Click "Deploy" → "Manage deployments"
- Copy the "Web App" URL (ends with `/exec`)

### Step 2: Test the Worker

Open your browser console (F12) and run:

```javascript
fetch('https://stock-cors-proxy.tomwmorgan47.workers.dev')
  .then(r => r.json())
  .then(data => console.log('✅ SUCCESS:', data))
  .catch(err => console.error('❌ ERROR:', err));
```

**Expected result:** You should see a JSON response with no CORS errors!

### Step 3: Update Your Frontend

In your frontend code, replace any direct Apps Script calls with the worker URL:

```javascript
// ❌ OLD - Don't use this anymore:
const API_URL = 'https://script.google.com/macros/s/AKfycb.../exec';

// ✅ NEW - Use this instead:
const API_URL = 'https://stock-cors-proxy.tomwmorgan47.workers.dev';
```

See `frontend-example.js` for complete code examples.

## 📝 Example API Calls

### Test the connection:
```javascript
fetch('https://stock-cors-proxy.tomwmorgan47.workers.dev')
  .then(r => r.json())
  .then(data => console.log(data));
```

### Get product database:
```javascript
fetch('https://stock-cors-proxy.tomwmorgan47.workers.dev', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'getProductDatabase' })
})
  .then(r => r.json())
  .then(data => console.log('Products:', data.products));
```

### Authenticate user:
```javascript
fetch('https://stock-cors-proxy.tomwmorgan47.workers.dev', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'authenticate',
    username: 'youruser',
    password: 'yourpass'
  })
})
  .then(r => r.json())
  .then(data => console.log('Auth:', data));
```

## 🔍 Troubleshooting

### "Worker returned error"
- Check that you've updated `APPS_SCRIPT_URL` in the worker code
- Make sure your Apps Script is deployed as a "Web app"
- Verify the Apps Script URL ends with `/exec`

### "Still getting CORS errors"
- Make sure you're calling the **worker URL**, not the Apps Script URL
- Clear browser cache (Ctrl+Shift+R)
- Check Network tab to verify which URL is being called

### "404 Not Found"
- Wait 1-2 minutes after deploying - propagation takes time
- Verify the worker URL is correct
- Check that the worker is deployed (not just saved)

## 📚 Files Reference

- `cloudflare-worker.js` - The worker code (deployed to Cloudflare)
- `frontend-example.js` - Example API calls for your frontend
- `CLOUDFLARE_SETUP.md` - Detailed setup instructions
- `AppsScript.gs` - Your Google Apps Script backend

## 🎯 How It Works

```
┌──────────────┐       ┌─────────────────────────────────────┐       ┌──────────────┐
│   Browser    │──────>│  Cloudflare Worker                  │──────>│ Apps Script  │
│  (Frontend)  │       │  stock-cors-proxy.tomwmorgan47      │       │  (Backend)   │
└──────────────┘<──────└─────────────────────────────────────┘<──────└──────────────┘
      ↑                              ↑
      │                              │
      └──── CORS headers ────────────┘
       (No more CORS errors!)
```

1. Your frontend calls the worker
2. Worker forwards request to Apps Script
3. Apps Script processes and responds
4. Worker adds CORS headers
5. Your frontend receives the response (no CORS errors!)

## ✨ Benefits

✅ No CORS errors - guaranteed
✅ No need to modify Apps Script CORS headers
✅ Works from any domain (GitHub Pages, localhost, etc.)
✅ Free tier: 100,000 requests/day
✅ Fast global CDN

---

**Need help?** Check the detailed guide in `CLOUDFLARE_SETUP.md`
