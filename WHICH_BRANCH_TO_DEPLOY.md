# ✅ WHICH BRANCH TO DEPLOY

## The Answer: `claude/fix-cors-headers-jBEX1`

This is the branch with ALL the CORS fixes and updated code. Deploy this one!

## Why This Branch?

✅ **Has the Worker URL** - `src/StockCounter.tsx` uses Cloudflare Worker
✅ **Has all documentation** - Setup guides, examples, instructions
✅ **Has all source files** - Complete React app with build configs
✅ **Already pushed to GitHub** - Ready to deploy right now
✅ **No CORS errors** - Frontend calls Worker, not Apps Script directly

## What's In This Branch?

```
claude/fix-cors-headers-jBEX1/
├── src/
│   ├── StockCounter.tsx          ← Frontend with Worker URL ✅
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── cloudflare-worker.js          ← Worker code
├── AppsScript.gs                 ← Apps Script with CORS headers
├── CLOUDFLARE_SETUP.md           ← Setup instructions
├── DEPLOYMENT_INSTRUCTIONS.md    ← How to deploy
├── QUICK_START.md                ← Quick reference
├── frontend-example.js           ← Code examples
├── package.json                  ← Dependencies
├── vite.config.ts                ← Build config
├── tsconfig.json                 ← TypeScript config
└── index.html                    ← Entry point
```

## How to Deploy This Branch

### Option 1: GitHub Pages (Recommended)

1. Go to your GitHub repository: https://github.com/tmor104/stock
2. Go to Settings → Pages
3. Under "Source", select:
   - **Branch:** `claude/fix-cors-headers-jBEX1`
   - **Folder:** `/` (root) or `docs` if you build there
4. Click "Save"
5. GitHub will build and deploy automatically

### Option 2: Manual Build & Deploy

```bash
# Clone or pull this branch
git checkout claude/fix-cors-headers-jBEX1
git pull

# Install and build
npm install
npm run build

# Deploy the 'dist' folder to your hosting
# (GitHub Pages, Netlify, Vercel, etc.)
```

### Option 3: Merge to Main (if you have a main branch)

```bash
git checkout main
git merge claude/fix-cors-headers-jBEX1
git push origin main
```

Then deploy from `main` as usual.

## Verify It's Working

After deployment:

1. **Open your app** (e.g., https://tmor104.github.io/stock)
2. **Open DevTools** (F12)
3. **Check Console** - No CORS errors!
4. **Check Network tab** - Requests go to `stock-cors-proxy.tomwmorgan47.workers.dev`

## Don't Forget!

Before your app will fully work, you need to:

1. **Update Cloudflare Worker** with your Apps Script URL:
   - Go to https://dash.cloudflare.com
   - Workers & Pages → stock-cors-proxy → Edit Code
   - Line 21: Update `APPS_SCRIPT_URL`
   - Save and Deploy

2. **Test the Worker** in browser console:
   ```javascript
   fetch('https://stock-cors-proxy.tomwmorgan47.workers.dev')
     .then(r => r.json())
     .then(data => console.log('✅ Worker works!', data))
     .catch(err => console.error('❌ Error:', err));
   ```

## Summary

- ✅ **Deploy branch:** `claude/fix-cors-headers-jBEX1`
- ✅ **Status:** All fixes applied, ready to deploy
- ✅ **Worker URL:** https://stock-cors-proxy.tomwmorgan47.workers.dev
- ✅ **No CORS errors:** Frontend → Cloudflare → Apps Script

---

**That's it!** This branch is ready to deploy right now. 🚀
