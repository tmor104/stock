# Upgrade Notes: Stock Counter v1 → v2

## What's New in V2

### 🎯 Major New Features

1. **Google Sheets Integration**
   - Import product database from Google Sheets
   - Auto-sync scans to Google Sheets
   - Create and manage multiple stocktakes
   - Real-time collaboration between users

2. **Offline Support**
   - Works without internet connection
   - All scans saved locally (IndexedDB)
   - Auto-sync when connection restored
   - Visual sync status indicators

3. **Location Tracking**
   - Tag each scan with warehouse location
   - Change location on-the-fly
   - Location data included in exports

4. **User Management**
   - Secure login with username/password
   - Multi-user support for same stocktake
   - Track who scanned what and when
   - Passwords stored securely in Apps Script

5. **Enhanced Product Database**
   - Additional fields: Current Stock, $ Value
   - These values included in scan data
   - Better product search

6. **Stocktake Management**
   - Create new stocktakes (creates new Google Sheets)
   - Continue existing stocktakes
   - Load your previous scans
   - Each stocktake = separate Google Sheet

### 📊 Data Structure Changes

#### V1 (Old)
- Local Excel upload only
- Export to Excel file
- No sync capability
- Single user only

#### V2 (New)
- Google Sheets import
- Live sync to Google Sheets
- Offline-first with IndexedDB
- Multi-user collaboration
- Location tracking
- Secure authentication

### 🔄 Migration Path

If you have data from v1:

1. **Export v1 data** to Excel (if you have active counts)
2. **Create Product Database** in Google Sheets:
   - Copy your existing Excel product list
   - Add columns: Current Stock, $ Value
3. **Set up v2** following SETUP_GUIDE.md
4. **Import v1 scan data** (optional):
   - Manually paste into a stocktake Raw Scans sheet
   - Or start fresh with v2

### 📝 Key Differences

| Feature | V1 | V2 |
|---------|----|----|
| Product Database | Local Excel upload | Google Sheets |
| Scan Storage | Browser memory (temporary) | IndexedDB (persistent) |
| Export | Excel file download | Google Sheets sync |
| Multi-user | No | Yes ✅ |
| Offline Support | No | Yes ✅ |
| Location Tracking | No | Yes ✅ |
| Authentication | No | Yes ✅ |
| Sync Status | N/A | Color-coded (green/yellow) |
| Stocktake Management | N/A | Create/select stocktakes |

### 🎨 UI Changes

**New Components:**
- Login page
- Settings page
- Location selector
- Sync status indicator
- Stocktake selector
- Offline mode indicator

**Removed Components:**
- File upload button (replaced with Google Sheets import)
- Manual entry mode (simplified - now same as unknown barcode)
- Box counting mode (can be re-added if needed)

### ⚙️ Configuration Required

**V1 Configuration:**
- None (just open and use)

**V2 Configuration:**
- Google Sheet setup (Product Database, Users, Locations)
- Apps Script deployment
- Apps Script URL in React app
- User passwords in Script Properties

### 🔐 Security Improvements

**V1:**
- No authentication
- Anyone with access to app can scan
- No audit trail

**V2:**
- Username/password authentication
- Passwords stored securely (not in sheets)
- Complete audit trail (who, what, when, where)
- Stocktake-level access control

### 📱 Performance

**V1:**
- All data in React state
- Lost on page refresh
- No persistence

**V2:**
- IndexedDB for local storage
- Survives page refresh
- Efficient sync (only unsynced data)
- Background sync every 10 scans

### 🐛 Bug Fixes & Improvements

- ✅ Data persistence across sessions
- ✅ Better search performance
- ✅ Cleaner UI with mode separation
- ✅ Sync status visibility
- ✅ Network error handling
- ✅ Offline capability

### 🚀 Setup Time Comparison

**V1 Setup Time:** < 1 minute
- Open app
- Upload Excel file
- Start scanning

**V2 Setup Time:** ~15-20 minutes (first time only)
- Create Google Sheet (5 min)
- Deploy Apps Script (5 min)
- Set up passwords (3 min)
- Configure React app (2 min)
- Test (5 min)

**Worth it?** YES if you need:
- Multi-user collaboration
- Offline support
- Data persistence
- Cloud backup
- Audit trail

### 📦 Backward Compatibility

**Breaking Changes:**
- V2 uses different file (`stock_counter_v2.tsx`)
- V1 data NOT automatically migrated
- Different data structure

**Recommendation:**
- Keep v1 file for reference
- Start fresh with v2 for new stocktakes
- Manually migrate v1 product list to Google Sheets

### 🎯 Which Version Should You Use?

**Use V1 if:**
- Quick one-time count
- Single user
- Don't need cloud sync
- Want zero setup time
- Offline counting with manual Excel export is fine

**Use V2 if:**
- Multiple users counting simultaneously
- Need cloud backup
- Want offline support with auto-sync
- Need audit trail (who counted what)
- Location tracking required
- Long-term stocktake management

### 📚 Additional Resources

- [SETUP_GUIDE.md](./SETUP_GUIDE.md) - Complete setup instructions
- [README.md](./README.md) - Full feature documentation
- [AppsScript.gs](./AppsScript.gs) - Backend API code
- [stock_counter_v2.tsx](./stock_counter_v2.tsx) - Frontend React code

### 💡 Tips for New Users

1. **Start Small**: Set up with 5-10 test products first
2. **Test Offline**: Turn off WiFi and verify scans save locally
3. **Multi-User Testing**: Have 2 people scan same stocktake to test sync
4. **Check Sheets**: After syncing, verify data in Google Sheet
5. **Bookmark Sheet URLs**: Save stocktake sheet URLs for easy access

### 🔮 Roadmap

Potential future additions:
- Variance reporting (counted vs expected)
- Export to PDF
- Mobile app version
- Barcode printing
- Product images
- Advanced analytics

---

Questions? Issues? Check the Troubleshooting section in README.md
