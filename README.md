# 📦 Stock Counter with Google Sheets Integration

A comprehensive stock-taking application with offline support, Google Sheets sync, and multi-user collaboration.

## ✨ Features

### Core Features
- ✅ **Barcode Scanning** - Quick scan mode with barcode scanner support
- ✅ **Product Search** - Search by product name or barcode
- ✅ **Offline-First** - Works without internet, syncs when connected
- ✅ **Auto-Sync** - Automatically syncs every 10 scans
- ✅ **Location Tracking** - Tag scans with warehouse locations
- ✅ **Multi-User Support** - Multiple users can work on the same stocktake
- ✅ **Secure Authentication** - Passwords stored securely in Google Apps Script
- ✅ **Sync Status Indicators** - Color-coded scan status (Green = synced, Yellow = pending)

### Google Sheets Integration
- 📊 **Import Product Database** from Google Sheets
- 💾 **Export Scans** to Google Sheets in real-time
- 🔄 **Automatic Tally** - Auto-calculated totals per product
- 📈 **Raw Scan Tracking** - Every scan recorded with user, timestamp, location
- 🔒 **Secure Access** - API secured with Apps Script

### Data Management
- 💿 **IndexedDB Storage** - All scans saved locally
- 🔄 **Smart Sync** - Only uploads unsynced data
- 🎯 **Stocktake Management** - Create new or continue existing stocktakes
- 👤 **User History** - Load your previous scans from any device

## 🚀 Quick Start

### Prerequisites
- Google account
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Barcode scanner (optional - can type barcodes manually)

### Setup Steps

1. **Follow the Setup Guide** - See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for detailed instructions
2. **Create Master Sheet** - Set up Product Database, Users, and Locations
3. **Deploy Apps Script** - Copy code from [AppsScript.gs](./AppsScript.gs)
4. **Configure React App** - Update `APPS_SCRIPT_URL` in the code
5. **Start Scanning!** - Login and create your first stocktake

## 📋 Sheet Structures

### Master Sheet (one-time setup)

**Sheet 1: Product Database**
| Barcode | Product | Current Stock | $ Value |
|---------|---------|---------------|---------|
| 12345678 | Widget Pro | 100 | 25.50 |
| 87654321 | Gadget Max | 50 | 45.00 |

**Sheet 2: Users**
| Username |
|----------|
| John |
| Sarah |
| Mike |

*Note: Passwords are stored securely in Apps Script Properties*

**Sheet 3: Locations**
| Location |
|----------|
| Warehouse A |
| Warehouse B |
| Retail Floor |

### Stocktake Sheets (created automatically per stocktake)

**Sheet 1: Tally (Aggregated Totals)**
| Barcode | Product | Total Quantity | Locations | Last Updated | Stock Level |
|---------|---------|----------------|-----------|--------------|-------------|
| 12345678 | Widget Pro | 45 | Warehouse A, Warehouse B | 2024-01-15 14:30 | 100 |

**Sheet 2: Raw Scans (All Individual Scans)**
| Barcode | Product | Quantity | Location | User | Timestamp | Stock Level | $ Value | Synced | Sync ID |
|---------|---------|----------|----------|------|-----------|-------------|---------|--------|---------|
| 12345678 | Widget Pro | 20 | Warehouse A | John | 2024-01-15 14:25 | 100 | 25.50 | Yes | 1234567890-0.123 |
| 12345678 | Widget Pro | 25 | Warehouse B | Sarah | 2024-01-15 14:30 | 100 | 25.50 | Yes | 1234567891-0.456 |

## 🎯 Usage Guide

### Login Flow
1. Open the app
2. Enter your username and password
3. Click "Sign In"

### Starting a New Stocktake
1. Click "Start New Stocktake"
2. Enter a name (e.g., "End of Month - January")
3. The app creates a new Google Sheet
4. Select your starting location
5. Begin scanning!

### Continuing an Existing Stocktake
1. Click "Continue Existing Stocktake"
2. Select from the list of available stocktakes
3. Your previous scans will load automatically
4. Continue scanning from where you left off

### Scanning Items
1. Scan or type a barcode
2. Enter the quantity found
3. Click "Confirm"
4. Repeat!

Every 10 scans, data auto-syncs to Google Sheets.

### Changing Location
1. Use the location dropdown in the header
2. All subsequent scans will be tagged with the new location

### Manual Sync
- Click the "Sync" button to manually sync unsynced scans
- Useful before switching stocktakes or logging out

### Offline Mode
- The app works completely offline
- Scans are saved locally in IndexedDB
- Yellow status indicator shows pending scans
- When back online, click "Sync" or wait for auto-sync

## 🔐 Security

- **Passwords** are stored in Google Apps Script Properties (not in sheets)
- **Web App URL** should be kept private (anyone with link can use if they have valid credentials)
- **Audit Trail** - Every scan records who, what, when, where

## 🎨 UI Indicators

### Sync Status Colors
- 🟢 **Green** - Scan is synced to Google Sheets
- 🟡 **Yellow** - Scan is pending (not yet synced)

### Status Icons
- ✅ **Check Circle** - Synced successfully
- 🕐 **Clock** - Waiting to sync
- 📡 **WiFi Off** - Offline mode

## 📱 Mobile Support

The app is fully responsive and works on:
- 📱 Smartphones
- 📲 Tablets
- 💻 Desktops

Recommended browsers:
- Chrome (best performance)
- Safari (iOS)
- Firefox
- Edge

## 🛠️ Troubleshooting

### "Authentication failed"
- Check username spelling (case-sensitive)
- Verify password in Apps Script Properties matches

### "Cannot sync"
- Check internet connection
- Verify Apps Script URL is correct
- Check Apps Script deployment is set to "Anyone with link"

### "No products found"
- Ensure Product Database sheet has data
- Check column headers are exactly: Barcode, Product, Current Stock, $ Value

### Scans not appearing in Google Sheet
- Check the stocktake sheet name in Google Drive
- Verify sync button shows "All synced!"
- Check Apps Script execution log for errors

## 📊 Data Flow

```
1. User scans item
   ↓
2. Saved to IndexedDB (local device)
   ↓
3. Displayed in UI with yellow status
   ↓
4. After 10 scans OR manual sync
   ↓
5. POST to Apps Script API
   ↓
6. Apps Script writes to Google Sheet (Raw Scans)
   ↓
7. Apps Script updates Tally sheet
   ↓
8. Response received
   ↓
9. Local scans marked as synced (green status)
```

## 🔄 Multi-User Workflow

### Scenario: 3 users counting same stocktake

1. **User 1** creates "Monthly Stocktake - Jan 2024"
2. **User 2** and **User 3** select "Monthly Stocktake - Jan 2024"
3. All users scan different products in different locations
4. Each user's scans are:
   - Saved locally on their device
   - Synced to the same Google Sheet
   - Tagged with their username
5. Tally sheet shows combined counts from all users
6. Raw Scans sheet shows individual attribution

### Best Practices
- ✅ Assign different locations to different users
- ✅ Sync regularly (especially when switching stocktakes)
- ✅ Check "All synced!" before logging out
- ✅ Use descriptive stocktake names with dates

## 🚧 Limitations

- **Concurrent edits**: Last sync wins (no conflict resolution)
- **Deletion**: Cannot delete scans once synced
- **Editing**: Cannot edit synced scans (only local unsynced ones)
- **API Quota**: Google Apps Script has daily quotas (usually not a problem for normal use)

## 📈 Future Enhancements (Optional)

Potential features to add:
- [ ] Export to CSV/Excel from app
- [ ] Variance reporting (counted vs. expected stock)
- [ ] Barcode generation
- [ ] Product image support
- [ ] Analytics dashboard
- [ ] Print labels

## 📄 Files Included

- `stock_counter_v2.tsx` - Main React application
- `AppsScript.gs` - Google Apps Script backend
- `SETUP_GUIDE.md` - Step-by-step setup instructions
- `README.md` - This file

## 🤝 Support

If you encounter issues:
1. Check the Troubleshooting section
2. Review Apps Script execution logs
3. Verify sheet structure matches documentation
4. Check browser console for errors

## 📝 License

This project is provided as-is for stock counting purposes.

---

**Happy Counting! 📦✨**
