# Cloudflare Worker CORS Proxy Setup

This is a **much simpler solution** than fixing CORS in Apps Script! The Cloudflare Worker acts as a middleman that automatically adds CORS headers.

## Why This Works Better

✅ **No Apps Script changes needed** - your existing Apps Script works as-is
✅ **Guaranteed CORS headers** - Cloudflare adds them, not Google
✅ **Free tier available** - 100,000 requests/day on free plan
✅ **Fast & reliable** - Cloudflare's global CDN
✅ **Easy to update** - change the worker without redeploying Apps Script

## Setup Instructions (5 minutes)

### Step 1: Create a Cloudflare Account

1. Go to https://dash.cloudflare.com/sign-up
2. Create a free account (no credit card required)
3. Verify your email

### Step 2: Create the Worker

1. **Go to Workers & Pages**
   - After logging in, click "Workers & Pages" in the left sidebar
   - Click "Create Application"
   - Click "Create Worker"

2. **Name Your Worker**
   - Give it a name like `stock-counter-proxy` or `apps-script-cors`
   - Click "Deploy"

3. **Edit the Worker Code**
   - After deploying, click "Edit Code"
   - Delete all the default code
   - Copy the ENTIRE contents of `cloudflare-worker.js` from this repository
   - Paste it into the Cloudflare editor

4. **Update the Apps Script URL**
   - Find line 18 in the worker code:
     ```javascript
     const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycb.../exec';
     ```
   - Replace the URL with YOUR actual Apps Script URL
   - Make sure to keep the quotes!

5. **Save and Deploy**
   - Click "Save and Deploy"
   - Copy the Worker URL (it will look like: `https://stock-counter-proxy.YOUR-SUBDOMAIN.workers.dev`)

### Step 3: Update Your Frontend

Instead of calling the Apps Script URL directly, call the Cloudflare Worker URL:

```javascript
// OLD - direct to Apps Script (has CORS issues):
const API_URL = 'https://script.google.com/macros/s/AKfycb.../exec';

// NEW - through Cloudflare Worker (no CORS issues):
const API_URL = 'https://stock-counter-proxy.YOUR-SUBDOMAIN.workers.dev';
```

That's it! Your frontend now calls the Worker, which forwards to Apps Script and adds CORS headers.

## Testing Your Worker

### Test 1: Browser Console Test

Open your browser console (F12) and run:

```javascript
fetch('https://YOUR-WORKER-URL.workers.dev')
  .then(r => r.json())
  .then(data => console.log('✅ Worker is working!', data))
  .catch(err => console.error('❌ Error:', err));
```

You should see a successful response with no CORS errors!

### Test 2: Check CORS Headers

In the Network tab (F12 → Network), look at the response headers. You should see:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
```

## How It Works

```
┌─────────────┐         ┌──────────────────┐         ┌──────────────┐
│   Browser   │────────>│ Cloudflare Worker│────────>│ Apps Script  │
│ (Frontend)  │         │  (Adds CORS)     │         │  (Backend)   │
└─────────────┘<────────└──────────────────┘<────────└──────────────┘
     ↑                           ↑
     │                           │
     └─── CORS headers ──────────┘
     (Browser sees these!)
```

1. Your frontend sends a request to the Cloudflare Worker
2. The Worker forwards the request to your Apps Script
3. Apps Script processes the request and sends a response
4. The Worker adds CORS headers to the response
5. Your frontend receives the response with proper CORS headers

## Troubleshooting

### Worker Returns 500 Error
- Check that `APPS_SCRIPT_URL` is correct in the worker code
- Make sure the Apps Script URL ends with `/exec`
- Verify your Apps Script is deployed as a "Web app"

### Still Getting CORS Errors
- Make sure you're calling the Worker URL, not the Apps Script URL
- Clear your browser cache (Ctrl+Shift+R or Cmd+Shift+R)
- Check the Network tab to see which URL is being called

### Worker Not Found (404)
- Wait 1-2 minutes after deploying - it takes time to propagate
- Check the Worker URL is correct
- Make sure the Worker is deployed (not just saved)

## Advantages Over Apps Script CORS Fix

| Apps Script CORS | Cloudflare Worker |
|-----------------|-------------------|
| Must redeploy Apps Script every time | Change worker without touching Apps Script |
| Google may ignore headers sometimes | Cloudflare guarantees headers |
| Requires Apps Script knowledge | Simple JavaScript |
| 30-second execution timeout | No timeout for forwarding |
| Can be slow | Fast global CDN |

## Cost

**Cloudflare Workers Free Tier:**
- ✅ 100,000 requests per day
- ✅ No credit card required
- ✅ Unlimited workers

For most apps, the free tier is plenty!

## Next Steps

Once working, you can:
- Add rate limiting to the worker
- Add authentication/API keys
- Log requests for debugging
- Cache responses for better performance
- Add custom error handling

Your Worker URL becomes your new API endpoint - much more reliable than depending on Apps Script to send CORS headers correctly!
