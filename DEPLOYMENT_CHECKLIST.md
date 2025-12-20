# 🚨 CRITICAL DEPLOYMENT CHECKLIST

## The CORS Error Will NOT Go Away Unless You Follow These EXACT Steps:

### Step 1: Verify Current Deployment
1. Go to Google Apps Script
2. Click **Deploy** → **Manage deployments**
3. Check the CURRENT deployment settings

### Step 2: Check "Who has access" Setting
**This is the #1 cause of CORS errors!**

Your deployment MUST have:
- ✅ **Who has access: Anyone**
- ❌ NOT "Only myself"
- ❌ NOT "Anyone with Google account"

### Step 3: Create New Version
1. Click **Edit** (pencil icon) on your deployment
2. Version: Select **"New version"**
3. Description: "Fix CORS - Stage 5 updates"
4. Execute as: **Me**
5. **Who has access: Anyone** ← VERIFY THIS!
6. Click **Deploy**

### Step 4: Verify the URL
After deployment, copy the Web App URL. It should end with `/exec`

Example: `https://script.google.com/macros/s/AKfycb.../exec`

### Step 5: Test with This URL
Open this URL in a new browser tab:
```
https://script.google.com/macros/s/YOUR_ID_HERE/exec
```

You should see: `Stock Counter API is running. Use POST requests.`

If you see a login page or permission request, your "Who has access" is NOT set to "Anyone"!

---

## 🧪 Test CORS Directly

Open browser console (F12) and run:
```javascript
fetch('https://script.google.com/macros/s/AKfycbx6yH0XWvbsDlYvhf1OaozoQhGAvlRIFPlN9oV9dr-3P5gPZpb29yl9coSOkvzEYqD04w/exec', {
  method: 'POST',
  body: JSON.stringify({ action: 'authenticate', username: 'test', password: 'test' })
})
.then(r => r.json())
.then(console.log)
.catch(console.error)
```

If you get CORS error = "Who has access" is NOT "Anyone"
If you get response = CORS is working!
