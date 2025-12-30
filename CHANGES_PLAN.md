# Proposed Changes Plan

## Phase 1: Safe Critical Fixes (No Side Effects)

### 1. API Response Validation
**Change:** Add `response.ok` check before parsing JSON
**Location:** `src/StockCounter.tsx:194-210`
**Side Effects:** ✅ None - Only improves error handling
**Impact:** Will catch HTTP errors (4xx, 5xx) that were previously ignored

### 2. Basic Type Definitions
**Change:** Add TypeScript interfaces for Scan, Product, User, Stocktake
**Location:** Top of `src/StockCounter.tsx`
**Side Effects:** ✅ None - Only adds compile-time type checking
**Impact:** Better IDE support, catch type errors at compile time

### 3. Fix useEffect Dependencies (with useCallback)
**Change:** Wrap functions in useCallback and add proper dependencies
**Locations:** 
- Line 304: `initializeApp` - wrap in useCallback
- Line 325: Add `loadKegs` to dependencies (wrap in useCallback)
- Line 1738: Add `loadStocktakes` to dependencies (wrap in useCallback)
**Side Effects:** ⚠️ Minimal - May cause additional renders if dependencies change, but functions are stable
**Impact:** Prevents stale closures and ensures effects run when needed

### 4. Fix IndexedDB Transaction (Batch Operations)
**Change:** Batch all updates in markScansSynced instead of await in loop
**Location:** `src/StockCounter.tsx:95-110`
**Side Effects:** ✅ None - More efficient, same result
**Impact:** Better performance, more reliable transaction handling

---

## Side Effect Analysis

### ✅ Safe Changes (No Negative Side Effects)

1. **API Response Validation**
   - Current: Ignores HTTP errors, tries to parse error responses as JSON
   - After: Catches HTTP errors early, throws meaningful errors
   - Risk: None - Only improves error handling
   - Benefit: Prevents cryptic JSON parse errors, better error messages

2. **Type Definitions**
   - Current: Uses `any` everywhere
   - After: Proper types
   - Risk: None - Compile-time only
   - Benefit: Better IDE support, catch errors early

3. **IndexedDB Transaction Fix**
   - Current: Awaits each operation in loop (works but inefficient)
   - After: Batch all operations, then await once
   - Risk: None - Same end result, more efficient
   - Benefit: Better performance, more reliable

### ⚠️ Low Risk Changes (Minimal Side Effects)

4. **useEffect Dependencies with useCallback**
   - Current: Missing dependencies, functions recreated on each render
   - After: Functions wrapped in useCallback, proper dependencies
   - Risk: Very Low - Functions don't depend on changing values
   - Potential Issue: If we add dependencies that change frequently, could cause re-renders
   - Mitigation: Only include stable dependencies (dbService, apiService are already stable via useState initializer)
   - Benefit: Prevents bugs from stale closures, follows React best practices

---

## Implementation Order

1. **First:** Type definitions (safest, no runtime impact)
2. **Second:** API response validation (improves error handling)
3. **Third:** IndexedDB transaction fix (performance improvement)
4. **Fourth:** useEffect dependencies (requires careful testing)

---

## Testing Checklist

After changes:
- [ ] Login still works
- [ ] Scans can be created and saved
- [ ] Sync to Google Sheets works
- [ ] Error messages are clearer when API fails
- [ ] No console errors
- [ ] App initializes correctly
- [ ] Keg loading works
- [ ] Stocktake loading works
