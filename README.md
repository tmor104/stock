# Stock Wizard 📦 Inventory Counter

A progressive web app for real-time inventory management with offline support, barcode scanning, and Google Sheets integration.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│         GitHub Pages (Frontend)             │
│      https://tmor104.github.io/stock        │
│                                             │
│  - React + TypeScript                       │
│  - Offline-first (IndexedDB)                │
│  - Barcode scanning                         │
│  - Real-time sync                           │
└──────────────────┬──────────────────────────┘
                   │
                   │ ⬆️ Read data (GET/POST)
                   │ ⬇️ Write data (POST)
                   │
┌──────────────────▼──────────────────────────┐
│      Cloudflare Worker (CORS Proxy)         │
│  https://stock-cors-proxy.tomwmorgan47      │
│              .workers.dev                   │
│                                             │
│  - Adds CORS headers                        │
│  - Forwards requests                        │
│  - No data transformation                   │
└──────────────────┬──────────────────────────┘
                   │
                   │ ⬆️ Forwards requests
                   │ ⬇️ Returns responses
                   │
┌──────────────────▼──────────────────────────┐
│    Google Apps Script (Backend API)         │
│     https://script.google.com/macros/...    │
│                                             │
│  - Authentication                           │
│  - Product database management              │
│  - Stocktake sessions                       │
│  - Scan synchronization                     │
│  - Location management                      │
└──────────────────┬──────────────────────────┘
                   │
                   │ ⬆️ Read/Write via Apps Script API
                   │ ⬇️ Returns data
                   │
┌──────────────────▼──────────────────────────┐
│         Google Sheets (Database)            │
│          Master Sheet ID: 1e3rsYW4...       │
│                                             │
│  Sheets:                                    │
│  - Users (authentication)                   │
│  - Product Database                         │
│  - Locations                                │
│  - Stocktakes (dynamic sheets)              │
└─────────────────────────────────────────────┘
```

## 🔄 Two-Way Data Flow

The application supports full **bidirectional communication**:

### Frontend → Backend (Write Operations)
- ✅ User authentication
- ✅ Create new stocktakes
- ✅ Sync scanned items to Google Sheets
- ✅ Update inventory counts
- ✅ Add/edit products

### Backend → Frontend (Read Operations)
- ✅ Load product database
- ✅ Load locations
- ✅ Load existing stocktakes
- ✅ Load user scans
- ✅ Retrieve user credentials

**All data flows through the same path:** Frontend ↔ Cloudflare Worker ↔ Apps Script ↔ Google Sheets

## 🚀 Features

- 📱 **Progressive Web App** - Works offline, installable on mobile
- 📷 **Barcode Scanning** - Camera-based barcode detection
- 🔍 **Product Search** - Fuzzy search with autocomplete
- 💾 **Offline Support** - IndexedDB for local storage
- 🔄 **Auto-Sync** - Syncs every 10 scans or on-demand
- 👥 **Multi-User** - User authentication and session management
- 📊 **Google Sheets Integration** - Real-time data sync
- 🏢 **Multi-Location** - Support for multiple warehouse locations

## 📋 Prerequisites

- Google Account (for Apps Script and Sheets)
- Cloudflare Account (free tier works)
- GitHub Account (for GitHub Pages hosting)
- Node.js 18+ (for local development)

## ⚙️ Setup Instructions

### Part 1: Google Sheets Setup

1. **Create a Google Sheet** or use existing Master Sheet
   - Sheet ID: `1e3rsYW4RoEpxpH8ZMckLP7VdtnpbbfQpd8N_NB9fRgM`

2. **Required Sheet Tabs:**
   - `Users` - Column A: usernames
   - `Product Database` - Columns: Barcode, Product, Description, Price
   - `Locations` - List of warehouse locations
   - Individual stocktake sheets (created automatically)

3. **Set up user passwords:**
   - Go to Apps Script → Project Settings → Script Properties
   - Add properties: `password_username` = `actual_password`
   - Example: `password_john` = `secret123`

### Part 2: Google Apps Script Setup ⚠️ ACTION REQUIRED

1. **Go to Google Apps Script**
   - Visit: https://script.google.com
   - Click "New Project"

2. **Copy the Backend Code**
   - Open `AppsScript.gs` from this repository
   - Copy ALL the code
   - Paste into the Apps Script editor (replace any default code)

3. **Verify Configuration**
   - Check line 6: `const MASTER_SHEET_ID = '1e3rsYW4RoEpxpH8ZMckLP7VdtnpbbfQpd8N_NB9fRgM';`
   - Update if using a different Sheet ID

4. **Save the Script**
   - Click the disk icon or Ctrl+S / Cmd+S
   - Name it "Stock Counter Backend"

5. **Deploy as Web App**
   - Click "Deploy" → "New deployment"
   - Click gear icon ⚙️ → Select "Web app"
   - Settings:
     - **Description:** "Stock Counter API"
     - **Execute as:** Me (your@email.com)
     - **Who has access:** Anyone
   - Click "Deploy"
   - Authorize the script (click "Authorize access")
   - **📝 COPY THE WEB APP URL** - you'll need this for Cloudflare setup

6. **The URL should look like:**
   ```
   https://script.google.com/macros/s/AKfycbx6yH0XWvbsDlYvhf1OaozoQhGAvlRIFPlN9oV9dr-3P5gPZpb29yl9coSOkvzEYqD04w/exec
   ```

### Part 3: Cloudflare Worker Setup ⚠️ ACTION REQUIRED

1. **Go to Cloudflare Dashboard**
   - Visit: https://dash.cloudflare.com
   - Sign up for free account if needed

2. **Create Worker**
   - Click "Workers & Pages" in sidebar
   - Click "Create Application" → "Create Worker"
   - Name it: `stock-cors-proxy` (or your preferred name)
   - Click "Deploy"

3. **Update Worker Code**
   - After deploying, click "Edit Code"
   - Delete the default code
   - Open `cloudflare-worker.js` from this repository
   - Copy ALL the code
   - Paste into Cloudflare editor

4. **⚠️ CRITICAL: Update Apps Script URL**
   - Find line 21 in the worker:
     ```javascript
     const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycb.../exec';
     ```
   - Replace with YOUR Apps Script URL from Part 2, step 6
   - Example:
     ```javascript
     const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx6yH0XWvbsDlYvhf1OaozoQhGAvlRIFPlN9oV9dr-3P5gPZpb29yl9coSOkvzEYqD04w/exec';
     ```

5. **Save and Deploy**
   - Click "Save and Deploy"
   - **📝 COPY THE WORKER URL** - should be `https://stock-cors-proxy.tomwmorgan47.workers.dev`

### Part 4: Frontend Configuration (Already Done ✅)

The frontend is already configured to use the Cloudflare Worker:
- See `src/StockCounter.tsx` line 8
- Current setting: `const APPS_SCRIPT_URL = 'https://stock-cors-proxy.tomwmorgan47.workers.dev';`

**If your Worker URL is different:**
1. Update line 8 in `src/StockCounter.tsx`
2. Rebuild and redeploy

### Part 5: Deploy to GitHub Pages

**Option A: Automatic (if GitHub Actions configured)**
```bash
git push origin main
```

**Option B: Manual Build and Deploy**
```bash
# Install dependencies
npm install

# Build the project
npm run build

# Deploy dist/ folder to GitHub Pages
# Use gh-pages or GitHub's web interface
```

**Option C: GitHub Pages Settings**
1. Go to Repository Settings → Pages
2. Source: Deploy from branch
3. Branch: `main` / folder: `/` (root)
4. Save

## 🧪 Testing the Setup

### Test 1: Cloudflare Worker
Open browser console and run:
```javascript
fetch('https://stock-cors-proxy.tomwmorgan47.workers.dev')
  .then(r => r.json())
  .then(data => console.log('✅ Worker:', data))
  .catch(err => console.error('❌ Error:', err));
```

Expected: `{ success: true, message: "API is running", ... }`

### Test 2: Get Products
```javascript
fetch('https://stock-cors-proxy.tomwmorgan47.workers.dev', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'getProductDatabase' })
})
  .then(r => r.json())
  .then(data => console.log('✅ Products:', data))
  .catch(err => console.error('❌ Error:', err));
```

### Test 3: Authentication
```javascript
fetch('https://stock-cors-proxy.tomwmorgan47.workers.dev', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'authenticate',
    username: 'testuser',
    password: 'testpass'
  })
})
  .then(r => r.json())
  .then(data => console.log('✅ Auth:', data))
  .catch(err => console.error('❌ Error:', err));
```

## 📁 Project Structure

```
stock/
├── src/
│   ├── StockCounter.tsx      # Main React component (1839 lines)
│   ├── App.tsx                # App wrapper
│   └── main.tsx               # Entry point
├── AppsScript.gs              # Google Apps Script backend
├── cloudflare-worker.js       # CORS proxy worker
├── index.html                 # HTML entry point
├── package.json               # Dependencies
├── tsconfig.json              # TypeScript config
├── vite.config.ts             # Vite build config
└── README.md                  # This file
```

## 🔧 Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📱 Using the App

1. **Login** - Enter username and password
2. **Select Location** - Choose warehouse location
3. **Start/Resume Stocktake** - Create new or continue existing
4. **Scan Products:**
   - Use camera to scan barcodes
   - Or search manually
   - Enter quantities
   - Add notes if needed
5. **Auto-Sync** - Every 10 scans sync to Google Sheets
6. **Manual Sync** - Click sync button anytime
7. **Offline Mode** - Continues working offline, syncs when online

## 🛠️ API Endpoints

All requests go through: `https://stock-cors-proxy.tomwmorgan47.workers.dev`

### POST Requests (action parameter)

| Action | Parameters | Description |
|--------|-----------|-------------|
| `authenticate` | username, password | User login |
| `getProductDatabase` | - | Load all products |
| `getLocations` | - | Load warehouse locations |
| `createStocktake` | stocktakeId, location, username | Create new stocktake |
| `listStocktakes` | - | List all stocktakes |
| `syncScans` | stocktakeId, scans[] | Sync scanned items |
| `loadUserScans` | stocktakeId, username | Load user's scans |

## 🚨 Troubleshooting

### CORS Errors
- ✅ Verify Cloudflare Worker has correct Apps Script URL
- ✅ Check Apps Script is deployed with "Anyone" access
- ✅ Clear browser cache

### 500 Errors from Worker
- ✅ Verify Apps Script URL in worker (line 21 of cloudflare-worker.js)
- ✅ Verify Apps Script deployment is active
- ✅ Check Apps Script logs for errors

### Authentication Fails
- ✅ Check Script Properties in Apps Script
- ✅ Verify password properties: `password_username`
- ✅ Check username exists in Users sheet

### Data Not Syncing
- ✅ Check Network tab - verify requests reach worker
- ✅ Verify stocktake sheet exists in Google Sheets
- ✅ Check Apps Script execution logs

## 📊 Google Sheets Format

### Users Sheet
| Username |
|----------|
| john     |
| sarah    |

### Product Database
| Barcode | Product | Description | Price |
|---------|---------|-------------|-------|
| 123456  | Widget  | Blue widget | 9.99  |

### Locations Sheet
| Location      |
|---------------|
| Warehouse A   |
| Warehouse B   |

### Stocktake Sheets (auto-created)
| Username | Timestamp | Barcode | Product | Quantity | Location | Notes |
|----------|-----------|---------|---------|----------|----------|-------|
| john     | 2025-... | 123456  | Widget  | 5        | Whse A   | ...   |

## 🔐 Security Notes

- User passwords stored in Script Properties (not in sheets)
- Apps Script deployed with "Execute as: Me" (runs with your permissions)
- Cloudflare Worker uses wildcard CORS (`*`) - consider restricting in production
- Consider adding API key authentication to worker for production use

## 📄 License

MIT License - feel free to use and modify

## 🤝 Contributing

Issues and pull requests welcome!

---

**Need help?** Check the troubleshooting section or create an issue on GitHub.
