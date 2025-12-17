# Stock Wizard - Data Capacity Analysis

## Current Architecture Limitations

### 1. **React State Management**
- **Practical Limit**: ~10,000-50,000 items before noticeable slowdown
- **Hard Limit**: Depends on available RAM (typically 100,000+ items possible but slow)
- **Current Implementation**: Uses simple useState arrays which re-render on every update
- **Recommendation**: Current design is fine for typical inventory use (1,000-5,000 items)

### 2. **Excel (XLSX) Library Limits**
- **Read Limit**: Can handle Excel files with 1,048,576 rows (Excel's max)
- **Write/Export Limit**: Same as read - 1,048,576 rows
- **Practical Export Limit**: ~100,000 rows before significant slowdown
- **Memory**: Large files (>10MB) may cause browser memory issues

### 3. **Browser Memory**
- **Typical Browser RAM**: 2-4GB per tab
- **Each Entry Size**: ~200-500 bytes (depending on string lengths)
- **Estimated Capacity**:
  - Conservative: 20,000 entries (~10MB)
  - Optimistic: 100,000 entries (~50MB)
- **Risk**: Browser may crash if memory exceeds limits

### 4. **DOM Rendering Performance**
- **Current Issue**: Rendering large lists (>1,000 items) causes lag
- **Scanned Items List**: Will become slow with >500 items
- **Manual Entries List**: Same limitation
- **Kegs Table**: Should handle all 47 products fine
- **Solution Needed**: Virtual scrolling for lists >500 items

### 5. **LocalStorage (if implemented)**
- **Limit**: 5-10MB per domain
- **Entries**: ~10,000-25,000 entries max
- **Not currently used**: Data is lost on refresh

## Recommendations

### For Current Use Case (Bar/Restaurant Inventory)
✅ **Safe Range**: 0-5,000 total entries across all lists
✅ **Product Database**: Up to 10,000 products
✅ **Keg Products**: Up to 500 products
⚠️ **Warning Zone**: 5,000-10,000 entries (may slow down)
❌ **Danger Zone**: >10,000 entries (likely performance issues)

### Typical Usage Estimate
- **Product Database**: 500-2,000 items
- **Single Inventory Count**: 50-500 scanned items
- **Manual Entries**: 10-100 items
- **Keg Counts**: 20-50 active kegs
- **Total per Session**: ~100-600 entries
- **Verdict**: ✅ Current design is suitable

### Improvements Needed for Scale
1. **Virtual Scrolling**: Implement for lists >500 items
2. **Pagination**: Break large lists into pages
3. **Debounced Rendering**: Reduce re-render frequency
4. **IndexedDB**: Replace state with database for >5,000 items
5. **Web Workers**: Move Excel processing off main thread

### Breaking Points
- **Will NOT break**: <5,000 entries
- **May lag**: 5,000-10,000 entries
- **Will likely crash**: >50,000 entries
- **Excel export fails**: >1,000,000 rows (Excel limit)

## Conclusion
For a bar/restaurant inventory system counting daily/weekly stock, the current implementation is **perfectly adequate** and will not break under normal usage.
