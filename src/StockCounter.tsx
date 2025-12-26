import { useState, useRef, useEffect } from 'react';
import { Search, Package, Scan, ArrowLeft, Settings, LogOut, RefreshCw, WifiOff, CheckCircle, Clock, Edit2, Trash2 } from 'lucide-react';

// ============================================
// CONFIGURATION
// ============================================
// USE CLOUDFLARE WORKER TO AVOID CORS ISSUES
const APPS_SCRIPT_URL = 'https://stock-cors-proxy.tomwmorgan47.workers.dev';
const SYNC_INTERVAL = 10; // Sync every 10 scans

// ============================================
// INDEXEDDB UTILITIES
// ============================================
const DB_NAME = 'StockCounterDB';
const DB_VERSION = 1;

class IndexedDBService {
  db: IDBDatabase | null = null;

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const target = event.target as IDBOpenDBRequest;
        const db = target.result;

        // Store for scans
        if (!db.objectStoreNames.contains('scans')) {
          const scansStore = db.createObjectStore('scans', { keyPath: 'syncId' });
          scansStore.createIndex('synced', 'synced', { unique: false });
          scansStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Store for app state
        if (!db.objectStoreNames.contains('appState')) {
          db.createObjectStore('appState', { keyPath: 'key' });
        }

        // Store for product database
        if (!db.objectStoreNames.contains('products')) {
          const productsStore = db.createObjectStore('products', { keyPath: 'barcode' });
          productsStore.createIndex('product', 'product', { unique: false });
        }

        // Store for locations
        if (!db.objectStoreNames.contains('locations')) {
          db.createObjectStore('locations', { keyPath: 'name' });
        }
      };
    });
  }

  async saveScan(scan: any) {
    if (!this.db) throw new Error('Database not initialized');
    const tx = this.db.transaction(['scans'], 'readwrite');
    const store = tx.objectStore('scans');
    await store.put(scan);
  }

  async getUnsyncedScans(): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');
    const tx = this.db.transaction(['scans'], 'readonly');
    const store = tx.objectStore('scans');
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        // Filter for unsynced scans in JavaScript (boolean not valid as IDBKeyRange)
        const unsynced = request.result.filter((scan: any) => !scan.synced);
        resolve(unsynced);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getAllScans(): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');
    const tx = this.db.transaction(['scans'], 'readonly');
    const store = tx.objectStore('scans');
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async markScansSynced(syncIds: string[]) {
    if (!this.db) throw new Error('Database not initialized');
    const tx = this.db.transaction(['scans'], 'readwrite');
    const store = tx.objectStore('scans');

    for (const syncId of syncIds) {
      const request = store.get(syncId);
      const scan: any = await new Promise((resolve) => {
        request.onsuccess = () => resolve(request.result);
      });
      if (scan) {
        scan.synced = true;
        await store.put(scan);
      }
    }
  }

  async clearScans() {
    if (!this.db) throw new Error('Database not initialized');
    const tx = this.db.transaction(['scans'], 'readwrite');
    const store = tx.objectStore('scans');
    await store.clear();
  }

  async deleteScan(syncId: string) {
    if (!this.db) throw new Error('Database not initialized');
    const tx = this.db.transaction(['scans'], 'readwrite');
    const store = tx.objectStore('scans');
    await store.delete(syncId);
  }

  async saveState(key: string, value: any) {
    if (!this.db) throw new Error('Database not initialized');
    const tx = this.db.transaction(['appState'], 'readwrite');
    const store = tx.objectStore('appState');
    await store.put({ key, value });
  }

  async getState(key: string): Promise<any> {
    if (!this.db) throw new Error('Database not initialized');
    const tx = this.db.transaction(['appState'], 'readonly');
    const store = tx.objectStore('appState');
    const request = store.get(key);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result?.value);
      request.onerror = () => reject(request.error);
    });
  }

  async saveProducts(products: any[]) {
    if (!this.db) throw new Error('Database not initialized');
    const tx = this.db.transaction(['products'], 'readwrite');
    const store = tx.objectStore('products');
    await store.clear();
    for (const product of products) {
      await store.put(product);
    }
  }

  async getProducts(): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');
    const tx = this.db.transaction(['products'], 'readonly');
    const store = tx.objectStore('products');
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async saveLocations(locations: string[]) {
    if (!this.db) throw new Error('Database not initialized');
    const tx = this.db.transaction(['locations'], 'readwrite');
    const store = tx.objectStore('locations');
    await store.clear();
    for (const location of locations) {
      await store.put({ name: location });
    }
  }

  async getLocations(): Promise<string[]> {
    if (!this.db) throw new Error('Database not initialized');
    const tx = this.db.transaction(['locations'], 'readonly');
    const store = tx.objectStore('locations');
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result.map((l: any) => l.name));
      request.onerror = () => reject(request.error);
    });
  }
}

// ============================================
// GOOGLE SHEETS API SERVICE
// ============================================
class GoogleSheetsService {
  async callAPI(action: string, data: Record<string, any> = {}) {
    const startTime = performance.now();
    console.log(`🌐 API Request: ${action}`, data);

    try {
      const fetchStartTime = performance.now();
      // Use simple POST without custom headers to avoid CORS preflight
      const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ action, ...data })
        // No Content-Type or mode = "simple request" = no preflight!
      });
      const fetchDuration = (performance.now() - fetchStartTime) / 1000;
      console.log(`🌐 Fetch completed for ${action} in ${fetchDuration.toFixed(2)}s`);

      const parseStartTime = performance.now();
      const result = await response.json();
      const parseDuration = (performance.now() - parseStartTime) / 1000;
      console.log(`🌐 JSON parsing took ${parseDuration.toFixed(2)}s`);

      const totalDuration = (performance.now() - startTime) / 1000;
      console.log(`✅ API ${action} completed in ${totalDuration.toFixed(2)}s`);
      return result;
    } catch (error) {
      const errorDuration = (performance.now() - startTime) / 1000;
      console.error(`❌ API Error for ${action} after ${errorDuration.toFixed(2)}s:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error('Network error: ' + errorMessage);
    }
  }

  async authenticate(username: string, password: string) {
    return this.callAPI('authenticate', { username, password });
  }

  async getProductDatabase() {
    return this.callAPI('getProductDatabase');
  }

  async getLocations() {
    return this.callAPI('getLocations');
  }

  async createStocktake(name: string, user: string) {
    return this.callAPI('createStocktake', { name, user });
  }

  async listStocktakes() {
    return this.callAPI('listStocktakes');
  }

  async syncScans(stocktakeId: string, scans: any[]) {
    return this.callAPI('syncScans', { stocktakeId, scans });
  }

  async loadUserScans(stocktakeId: string, username: string) {
    return this.callAPI('loadUserScans', { stocktakeId, username });
  }

  async getKegs() {
    return this.callAPI('getKegs');
  }

  async syncKegs(stocktakeId: string, kegs: any[], location: string, user: string) {
    return this.callAPI('syncKegs', { stocktakeId, kegs, location, user });
  }

  async syncManualEntries(stocktakeId: string, manualEntries: any[]) {
    return this.callAPI('syncManualEntries', { stocktakeId, manualEntries });
  }

  async deleteScans(stocktakeId: string, syncIds: string[]) {
    return this.callAPI('deleteScans', { stocktakeId, syncIds });
  }
}

// ============================================
// MAIN COMPONENT
// ============================================
export default function StockCounter() {
  // Services
  const [dbService] = useState(() => new IndexedDBService());
  const [apiService] = useState(() => new GoogleSheetsService());

  // App State
  const [appMode, setAppMode] = useState('login'); // login, settings, scan
  const [user, setUser] = useState<any>(null);
  const [currentStocktake, setCurrentStocktake] = useState<any>(null);
  const [currentLocation, setCurrentLocation] = useState('');

  // Data
  const [productDatabase, setProductDatabase] = useState<any[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [scannedItems, setScannedItems] = useState<any[]>([]);
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const [kegsList, setKegsList] = useState<any[]>([]);

  // Scan Mode
  const [scanType, setScanType] = useState('regular'); // regular, manual, kegs
  const [currentMode, setCurrentMode] = useState('scan');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [quantityInput, setQuantityInput] = useState('');
  const [currentProduct, setCurrentProduct] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [manualCounts, setManualCounts] = useState<any[]>([]);

  // UI State
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');
  const [editingScan, setEditingScan] = useState<any>(null);
  const [editQuantity, setEditQuantity] = useState('');

  // Refs
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);
  const onlineHandlerRef = useRef<() => void>();
  const offlineHandlerRef = useRef<() => void>();

  // ============================================
  // INITIALIZATION
  // ============================================
  useEffect(() => {
    initializeApp();

    // Online/offline detection - store function references for proper cleanup
    onlineHandlerRef.current = () => setIsOnline(true);
    offlineHandlerRef.current = () => setIsOnline(false);

    window.addEventListener('online', onlineHandlerRef.current);
    window.addEventListener('offline', offlineHandlerRef.current);

    return () => {
      if (onlineHandlerRef.current) {
        window.removeEventListener('online', onlineHandlerRef.current);
      }
      if (offlineHandlerRef.current) {
        window.removeEventListener('offline', offlineHandlerRef.current);
      }
    };
  }, []);

  // Load kegs when switching to kegs mode
  useEffect(() => {
    if (scanType === 'kegs' && kegsList.length === 0) {
      loadKegs();
    }
  }, [scanType]);

  const loadKegs = async () => {
    try {
      const result = await apiService.getKegs();
      if (result.success) {
        // Initialize kegs with count = 0
        const kegsWithCounts = result.kegs.map((kegName: string) => ({
          name: kegName,
          count: 0
        }));
        setKegsList(kegsWithCounts);
      }
    } catch (error) {
      console.error('Error loading kegs:', error);
      alert('Failed to load kegs from Master Sheet');
    }
  };

  const initializeApp = async () => {
    try {
      await dbService.init();

      // Restore session
      const savedUser = await dbService.getState('user');
      const savedStocktake = await dbService.getState('currentStocktake');
      const savedLocation = await dbService.getState('currentLocation');

      if (savedUser) {
        setUser(savedUser);
        if (savedStocktake) {
          setCurrentStocktake(savedStocktake);
          setCurrentLocation(savedLocation || '');
          setAppMode('scan');
          await loadSessionData();
        } else {
          setAppMode('settings');
        }
      }
    } catch (error) {
      console.error('Initialization error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert('Failed to initialize app: ' + errorMessage);
    }
  };

  const loadSessionData = async () => {
    try {
      // Load products from IndexedDB
      const cachedProducts = await dbService.getProducts();
      if (cachedProducts.length > 0) {
        setProductDatabase(cachedProducts);
      }

      // Load locations from IndexedDB
      const cachedLocations = await dbService.getLocations();
      if (cachedLocations.length > 0) {
        setLocations(cachedLocations);
      }

      // Load scans from IndexedDB
      const allScans = await dbService.getAllScans();

      // Filter out deleted scans from display
      const activeScans = allScans.filter((scan: any) => !scan.deleted);

      // Sort scans by timestamp (most recent first)
      const sortedScans = [...activeScans].sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      setScannedItems(sortedScans);

      // Restore unsynced manual entries to manualCounts state
      const manualEntries = activeScans.filter((scan: any) =>
        scan.isManualEntry && !scan.synced
      );
      setManualCounts(manualEntries);

      // Count unsynced scans (includes pending deletions)
      const unsynced = await dbService.getUnsyncedScans();
      setUnsyncedCount(unsynced.length);

      // Try to sync if online
      if (isOnline && unsynced.length > 0) {
        await syncToGoogleSheets();
      }
    } catch (error) {
      console.error('Error loading session data:', error);
    }
  };

  // ============================================
  // AUTHENTICATION
  // ============================================
  const handleLogin = async (username: string, password: string) => {
    try {
      const result = await apiService.authenticate(username, password);

      if (result.success) {
        const userData = { username };
        setUser(userData);
        await dbService.saveState('user', userData);
        setAppMode('settings');
        return true;
      } else {
        alert(result.message);
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert('Login failed: ' + errorMessage);
      return false;
    }
  };

  const handleLogout = async () => {
    // Check for unsynced scans
    const unsynced = await dbService.getUnsyncedScans();
    if (unsynced.length > 0) {
      if (!confirm(`You have ${unsynced.length} unsynced scans. Are you sure you want to logout?`)) {
        return;
      }
    }

    setUser(null);
    setCurrentStocktake(null);
    setCurrentLocation('');
    setAppMode('login');
    await dbService.saveState('user', null);
    await dbService.saveState('currentStocktake', null);
  };

  // ============================================
  // STOCKTAKE MANAGEMENT
  // ============================================
  const handleCreateStocktake = async (name: string) => {
    try {
      const result = await apiService.createStocktake(name, user?.username);

      if (result.success) {
        const stocktake = {
          id: result.stocktakeId,
          name: result.name,
          url: result.url
        };

        setCurrentStocktake(stocktake);
        await dbService.saveState('currentStocktake', stocktake);
        await loadProductsAndLocations();
        setAppMode('scan');
        return true;
      } else {
        alert(result.message);
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert('Failed to create stocktake: ' + errorMessage);
      return false;
    }
  };

  const handleSelectStocktake = async (stocktake: any) => {
    try {
      // Keep all scans from all stocktakes in IndexedDB - just switch the active stocktake
      // Scans are filtered by stocktakeId when displaying in loadSessionData
      setCurrentStocktake(stocktake);
      await dbService.saveState('currentStocktake', stocktake);

      // Load products and locations
      await loadProductsAndLocations();

      // Load user's previous scans from this stocktake
      const result = await apiService.loadUserScans(stocktake.id, user.username);

      if (result.success && result.scans.length > 0) {
        // Save to IndexedDB with source marker
        for (const scan of result.scans) {
          const scanWithSource = {
            ...scan,
            stocktakeId: stocktake.id,
            stocktakeName: stocktake.name,
            source: 'loaded_from_server'
          };
          await dbService.saveScan(scanWithSource);
        }
        // Sort scans by timestamp (most recent first)
        const scansWithSource = result.scans.map((scan: any) => ({
          ...scan,
          stocktakeId: stocktake.id,
          stocktakeName: stocktake.name,
          source: 'loaded_from_server'
        }));
        const sortedScans = [...scansWithSource].sort((a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        setScannedItems(sortedScans);
        alert(`Loaded ${result.scans.length} previous scans from this stocktake.`);
      }

      setAppMode('scan');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert('Failed to load stocktake: ' + errorMessage);
      console.error('Error selecting stocktake:', error);
    }
  };

  const loadProductsAndLocations = async () => {
    try {
      // Load products
      const productsResult = await apiService.getProductDatabase();
      if (productsResult.success) {
        setProductDatabase(productsResult.products);
        await dbService.saveProducts(productsResult.products);
        console.log('✅ Products loaded:', productsResult.products.length);
      } else {
        console.warn('⚠️ Failed to load products from API:', productsResult.message);
      }

      // Load locations
      const locationsResult = await apiService.getLocations();
      console.log('📍 Locations API response:', locationsResult);

      if (locationsResult.success && locationsResult.locations && locationsResult.locations.length > 0) {
        setLocations(locationsResult.locations);
        await dbService.saveLocations(locationsResult.locations);
        console.log('✅ Locations loaded:', locationsResult.locations);

        // Set default location if not set
        if (!currentLocation) {
          setCurrentLocation(locationsResult.locations[0]);
          await dbService.saveState('currentLocation', locationsResult.locations[0]);
          console.log('📍 Default location set:', locationsResult.locations[0]);
        }
      } else {
        console.warn('⚠️ Failed to load locations from API or empty locations array');
        // Try to load from cache
        const cachedLocations = await dbService.getLocations();
        if (cachedLocations.length > 0) {
          setLocations(cachedLocations);
          console.log('✅ Loaded locations from cache:', cachedLocations);
          if (!currentLocation) {
            setCurrentLocation(cachedLocations[0]);
            await dbService.saveState('currentLocation', cachedLocations[0]);
          }
        } else {
          console.error('❌ No locations available in cache either');
          alert('Warning: No locations could be loaded. Please check your Master Sheet has locations configured.');
        }
      }
    } catch (error) {
      console.error('❌ Error loading data:', error);
      alert('Could not load product database. Using offline data if available.');

      // Fallback to cached data
      const cachedProducts = await dbService.getProducts();
      const cachedLocations = await dbService.getLocations();
      setProductDatabase(cachedProducts);
      setLocations(cachedLocations);

      if (cachedLocations.length > 0 && !currentLocation) {
        setCurrentLocation(cachedLocations[0]);
        await dbService.saveState('currentLocation', cachedLocations[0]);
      }

      console.log('📦 Loaded from cache - Products:', cachedProducts.length, 'Locations:', cachedLocations.length);
    }
  };

  // ============================================
  // SCANNING
  // ============================================
  const handleBarcodeSubmit = (e: any) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const product = productDatabase.find((p: any) => p.barcode === barcodeInput.trim());

    if (product) {
      setCurrentProduct(product);
      setBarcodeInput('');
      setTimeout(() => quantityInputRef.current?.focus(), 100);
    } else {
      setCurrentProduct({
        barcode: barcodeInput,
        product: 'UNKNOWN - Manual Entry Required',
        currentStock: 0,
        value: 0
      });
      setBarcodeInput('');
      setTimeout(() => quantityInputRef.current?.focus(), 100);
    }
  };

  const handleQuantitySubmit = async (e: any) => {
    e.preventDefault();
    if (!quantityInput || !currentProduct) return;

    const qty = parseFloat(quantityInput);
    if (isNaN(qty) || qty <= 0) {
      alert('Please enter a valid quantity');
      return;
    }

    // Regular scan (or manual entry)
    const isManualEntry = currentProduct.isManualEntry;
    const scan = {
      syncId: `${Date.now()}-${Math.random()}`,
      barcode: isManualEntry ? '' : currentProduct.barcode,
      product: currentProduct.product,
      quantity: qty,
      location: currentLocation,
      user: user.username,
      timestamp: new Date().toISOString(),
      stockLevel: currentProduct.currentStock || 0,
      value: currentProduct.value || 0,
      synced: false,
      isManualEntry: isManualEntry || false,
      stocktakeId: currentStocktake?.id || 'unknown',
      stocktakeName: currentStocktake?.name || 'Unknown Stocktake',
      source: 'local_scan'
    };

    // Save all scans (both manual and barcode) to IndexedDB
    await dbService.saveScan(scan);

    // Update UI
    if (isManualEntry) {
      // Also update manualCounts for sync tracking
      setManualCounts((prev: any[]) => [scan, ...prev]);
    }
    setScannedItems((prev: any[]) => [scan, ...prev]);
    setUnsyncedCount((prev: number) => prev + 1);

    // Auto-sync every 10 scans
    if ((unsyncedCount + 1) % SYNC_INTERVAL === 0 && isOnline) {
      await syncToGoogleSheets();
    }

    // Reset form
    setCurrentProduct(null);
    setQuantityInput('');
    setBarcodeInput('');
    setSearchQuery('');
    setSearchResults([]);
    setTimeout(() => barcodeInputRef.current?.focus(), 100);
  };

  // ============================================
  // EDIT SCANS
  // ============================================
  const handleEditScan = (scan: any) => {
    setEditingScan(scan);
    setEditQuantity(scan.quantity.toString());
  };

  const handleSaveEdit = async () => {
    if (!editingScan || !editQuantity) return;

    const qty = parseFloat(editQuantity);
    if (isNaN(qty) || qty <= 0) {
      alert('Please enter a valid quantity');
      return;
    }

    // Update the scan with new quantity
    const updatedScan = {
      ...editingScan,
      quantity: qty,
      synced: false, // Mark as unsynced so it gets re-synced
      lastModified: new Date().toISOString()
    };

    // Update in IndexedDB
    await dbService.saveScan(updatedScan);

    // Update UI
    setScannedItems((prev: any[]) =>
      prev.map((scan: any) =>
        scan.syncId === updatedScan.syncId ? updatedScan : scan
      )
    );

    // Update unsynced count
    const unsynced = await dbService.getUnsyncedScans();
    setUnsyncedCount(unsynced.length);

    // Clear edit state
    setEditingScan(null);
    setEditQuantity('');

    // Auto-sync if online
    if (isOnline) {
      await syncToGoogleSheets();
    }
  };

  const handleCancelEdit = () => {
    setEditingScan(null);
    setEditQuantity('');
  };

  const handleDeleteScan = async (scan: any) => {
    if (!confirm(`Delete scan for ${scan.product}?`)) return;

    // Mark as deleted in IndexedDB (soft delete for batch sync)
    const deletedScan = {
      ...scan,
      deleted: true,
      synced: false, // Needs to sync the deletion
      deletedAt: new Date().toISOString()
    };
    await dbService.saveScan(deletedScan);

    // Remove from UI immediately
    setScannedItems((prev: any[]) => prev.filter((s: any) => s.syncId !== scan.syncId));

    // Update unsynced count (includes pending deletions)
    const unsynced = await dbService.getUnsyncedScans();
    setUnsyncedCount(unsynced.length);
  };

  // ============================================
  // SYNCING
  // ============================================
  const syncToGoogleSheets = async () => {
    if (!currentStocktake || isSyncing) return;

    setIsSyncing(true);
    setSyncStatus('Syncing...');

    try {
      const unsyncedScans = await dbService.getUnsyncedScans();

      if (unsyncedScans.length === 0) {
        setSyncStatus('All synced!');
        setTimeout(() => setSyncStatus(''), 2000);
        setIsSyncing(false);
        return;
      }

      // Separate deleted scans from regular scans
      const deletedScans = unsyncedScans.filter((scan: any) => scan.deleted === true);
      const regularScans = unsyncedScans.filter((scan: any) => !scan.deleted);

      let totalSynced = 0;

      // Sync regular scans (additions/updates)
      if (regularScans.length > 0) {
        const result = await apiService.syncScans(currentStocktake.id, regularScans);

        if (result.success) {
          // Mark scans as synced
          await dbService.markScansSynced(result.syncedIds);

          // Update UI
          setScannedItems((prev: any[]) =>
            prev.map((scan: any) =>
              result.syncedIds.includes(scan.syncId)
                ? { ...scan, synced: true }
                : scan
            )
          );

          totalSynced += result.syncedCount;
        }
      }

      // Sync deletions
      if (deletedScans.length > 0) {
        const deleteResult = await apiService.deleteScans(
          currentStocktake.id,
          deletedScans.map((s: any) => s.syncId)
        );

        if (deleteResult.success) {
          // Permanently remove deleted scans from IndexedDB
          for (const scan of deletedScans) {
            await dbService.deleteScan(scan.syncId);
          }
          totalSynced += deleteResult.deletedCount;
        }
      }

      setUnsyncedCount(0);
      setSyncStatus(`Synced ${totalSynced} items!`);
      setTimeout(() => setSyncStatus(''), 3000);
    } catch (error) {
      console.error('Sync error:', error);
      setSyncStatus('Sync failed');
      setTimeout(() => setSyncStatus(''), 3000);
    } finally {
      setIsSyncing(false);
    }
  };

  const syncKegs = async () => {
    if (!currentStocktake || isSyncing) return;

    // Filter kegs with count > 0
    const kegsWithCounts = kegsList.filter((keg: any) => keg.count > 0);

    if (kegsWithCounts.length === 0) {
      alert('No keg counts to sync. Please add counts before syncing.');
      return;
    }

    setIsSyncing(true);
    setSyncStatus('Syncing kegs...');

    try {
      const result = await apiService.syncKegs(
        currentStocktake.id,
        kegsWithCounts,
        currentLocation,
        user.username
      );

      if (result.success) {
        setSyncStatus(`Synced ${result.syncedCount} kegs!`);

        // Reset keg counts after successful sync
        setKegsList((prev: any[]) =>
          prev.map((keg: any) => ({ ...keg, count: 0 }))
        );

        setTimeout(() => setSyncStatus(''), 3000);
        alert(`Successfully synced ${result.syncedCount} kegs to spreadsheet!`);
      } else {
        setSyncStatus('Sync failed');
        setTimeout(() => setSyncStatus(''), 3000);
        alert('Failed to sync kegs: ' + result.message);
      }
    } catch (error) {
      console.error('Keg sync error:', error);
      setSyncStatus('Sync failed');
      setTimeout(() => setSyncStatus(''), 3000);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert('Failed to sync kegs: ' + errorMessage);
    } finally {
      setIsSyncing(false);
    }
  };

  const syncManualEntries = async () => {
    if (!currentStocktake || isSyncing) return;

    if (manualCounts.length === 0) {
      alert('No manual entries to sync.');
      return;
    }

    setIsSyncing(true);
    setSyncStatus('Syncing manual entries...');

    try {
      const result = await apiService.syncManualEntries(
        currentStocktake.id,
        manualCounts
      );

      if (result.success) {
        setSyncStatus(`Synced ${result.syncedCount} manual entries!`);

        // Clear manual entries after successful sync
        setManualCounts([]);

        setTimeout(() => setSyncStatus(''), 3000);
        alert(`Successfully synced ${result.syncedCount} manual entries to spreadsheet!`);
      } else {
        setSyncStatus('Sync failed');
        setTimeout(() => setSyncStatus(''), 3000);
        alert('Failed to sync manual entries: ' + result.message);
      }
    } catch (error) {
      console.error('Manual entry sync error:', error);
      setSyncStatus('Sync failed');
      setTimeout(() => setSyncStatus(''), 3000);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert('Failed to sync manual entries: ' + errorMessage);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleChangeLocation = async (newLocation: string) => {
    setCurrentLocation(newLocation);
    await dbService.saveState('currentLocation', newLocation);
  };

  // ============================================
  // SEARCH
  // ============================================
  const handleSearch = (query: string) => {
    const searchTerm = query || searchQuery;
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    const results = productDatabase.filter((p: any) =>
      p.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.barcode.toString().includes(searchTerm)
    );
    setSearchResults(results);
  };

  const selectSearchResult = (product: any) => {
    setCurrentProduct(product);
    setSearchQuery('');
    setSearchResults([]);
    setCurrentMode('scan');
    setTimeout(() => quantityInputRef.current?.focus(), 100);
  };

  // ============================================
  // UI HELPERS
  // ============================================
  const getSyncStatusColor = (scan: any) => {
    if (scan.synced) return 'bg-green-50 border-green-200';
    return 'bg-yellow-50 border-yellow-300';
  };

  const getSyncStatusIcon = (scan: any) => {
    if (scan.synced) return <CheckCircle size={16} className="text-green-600" />;
    return <Clock size={16} className="text-yellow-600" />;
  };

  // ============================================
  // RENDER: LOGIN PAGE
  // ============================================
  if (appMode === 'login') {
    return <LoginPage onLogin={handleLogin} dbService={dbService} />;
  }

  // ============================================
  // RENDER: SETTINGS PAGE
  // ============================================
  if (appMode === 'settings') {
    return (
      <SettingsPage
        user={user}
        currentStocktake={currentStocktake}
        onCreateStocktake={handleCreateStocktake}
        onSelectStocktake={handleSelectStocktake}
        onLogout={handleLogout}
        onBack={currentStocktake ? () => setAppMode('scan') : undefined}
        apiService={apiService}
      />
    );
  }

  // ============================================
  // RENDER: SCAN MODE
  // ============================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-2 sm:p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-br from-blue-600 to-purple-700 rounded-2xl shadow-2xl p-4 sm:p-6 mb-4 sm:mb-6 border border-blue-300">
          <div className="flex justify-between items-start mb-4 gap-2">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-lg">📦 Stock Wizard</h1>
              <p className="text-xs sm:text-sm text-blue-100 truncate">
                {user.username} • {currentStocktake?.name}
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => setAppMode('settings')}
                className="bg-white/20 backdrop-blur-sm text-white p-2 rounded-lg hover:bg-white/30 transition-all shadow-lg"
                title="Settings"
              >
                <Settings size={18} className="sm:w-5 sm:h-5" />
              </button>
              <button
                onClick={handleLogout}
                className="bg-red-500/80 backdrop-blur-sm text-white p-2 rounded-lg hover:bg-red-600 transition-all shadow-lg"
                title="Logout"
              >
                <LogOut size={18} className="sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>

          {/* Scan Type Selector */}
          <div className="mb-4">
            <label className="text-xs sm:text-sm font-medium text-white mb-2 block">Scan Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setScanType('regular')}
                className={`px-3 sm:px-4 py-2 rounded-lg font-semibold transition-all text-sm sm:text-base ${
                  scanType === 'regular'
                    ? 'bg-white text-blue-600 shadow-lg'
                    : 'bg-white/20 backdrop-blur-sm text-white hover:bg-white/30'
                }`}
              >
                📦 Regular
              </button>
              <button
                onClick={() => setScanType('kegs')}
                className={`px-3 sm:px-4 py-2 rounded-lg font-semibold transition-all text-sm sm:text-base ${
                  scanType === 'kegs'
                    ? 'bg-white text-orange-600 shadow-lg'
                    : 'bg-white/20 backdrop-blur-sm text-white hover:bg-white/30'
                }`}
              >
                🍺 Kegs
              </button>
            </div>
          </div>

          {/* Location & Sync Status */}
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-white mb-1 block">Current Location</label>
              <select
                value={currentLocation}
                onChange={(e) => handleChangeLocation(e.target.value)}
                className="w-full px-3 py-2 bg-white/20 backdrop-blur-sm border-2 border-white/30 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50"
              >
                {locations.map(loc => (
                  <option key={loc} value={loc} className="text-slate-800">{loc}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {!isOnline && (
                <div className="flex items-center gap-1 text-orange-300 bg-orange-900/30 px-2 py-1 rounded-lg">
                  <WifiOff size={16} />
                  <span className="text-xs font-medium">Offline</span>
                </div>
              )}

              {unsyncedCount > 0 && (
                <>
                  <span className="text-xs font-medium text-yellow-200 bg-yellow-900/30 px-2 py-1 rounded-lg whitespace-nowrap">
                    {unsyncedCount} pending
                  </span>
                  <button
                    onClick={syncToGoogleSheets}
                    disabled={!isOnline || isSyncing}
                    className="bg-white/90 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-white disabled:bg-white/30 transition-all shadow-lg font-semibold flex items-center gap-1 text-sm whitespace-nowrap"
                  >
                    <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                    Sync
                  </button>
                </>
              )}

              {syncStatus && (
                <span className="text-xs font-medium text-green-200 bg-green-900/30 px-2 py-1 rounded-lg">{syncStatus}</span>
              )}
            </div>
          </div>
        </div>

        {/* Scan Interface */}
        {currentMode === 'scan' && !currentProduct && (
          <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 mb-4 sm:mb-6 border border-slate-200">
            <label className="block text-base sm:text-lg font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Scan size={20} className="sm:w-6 sm:h-6 text-slate-600" /> Scan Barcode
            </label>
            <input
              ref={barcodeInputRef}
              type="text"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleBarcodeSubmit(e);
                }
              }}
              placeholder="Scan or enter barcode..."
              className="w-full px-4 py-3 sm:py-4 text-lg sm:text-xl border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-all"
              autoFocus
            />

            <div className="grid grid-cols-2 gap-2 mt-4">
              <button
                onClick={() => setCurrentMode('search')}
                className="bg-gradient-to-r from-slate-600 to-slate-700 text-white px-2 sm:px-3 py-2 rounded-lg hover:from-slate-700 hover:to-slate-800 transition-all shadow-md flex items-center justify-center gap-1 sm:gap-1.5 text-xs sm:text-sm font-semibold"
              >
                <Search size={14} className="sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Search Product</span>
                <span className="sm:hidden">Search</span>
              </button>
              <button
                onClick={syncToGoogleSheets}
                disabled={!isOnline || isSyncing || unsyncedCount === 0}
                className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-2 sm:px-3 py-2 rounded-lg hover:from-emerald-600 hover:to-green-700 disabled:bg-slate-300 transition-all shadow-md flex items-center justify-center gap-1 sm:gap-1.5 text-xs sm:text-sm font-semibold"
              >
                <RefreshCw size={14} className="sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Manual Sync</span>
                <span className="sm:hidden">Sync</span>
              </button>
            </div>
          </div>
        )}

        {/* Product Confirmation */}
        {currentProduct && currentMode === 'scan' && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 border border-slate-200">
            <div className="mb-4">
              <div className="text-lg font-semibold text-slate-800">{currentProduct.product}</div>
              <div className="text-sm text-slate-500">Barcode: {currentProduct.barcode}</div>
              <div className="text-sm text-slate-600">Current Stock: {currentProduct.currentStock} • Value: ${currentProduct.value}</div>
            </div>

            <div>
              <label className="block text-slate-700 mb-2">Enter Quantity</label>
              <input
                ref={quantityInputRef}
                type="number"
                step="0.01"
                value={quantityInput}
                onChange={(e) => setQuantityInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleQuantitySubmit(e);
                  }
                }}
                placeholder="Enter quantity..."
                className="w-full px-4 py-3 text-xl border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 mb-3 transition-all"
              />

              {/* Box Counter Quick Options */}
              <div className="mb-3">
                <label className="block text-xs text-slate-600 mb-2 font-semibold">Quick Add (Boxes):</label>
                <div className="grid grid-cols-6 gap-2">
                  {[1, 5, 6, 7, 12, 24].map(amount => (
                    <button
                      key={amount}
                      onClick={() => {
                        const current = parseFloat(quantityInput) || 0;
                        setQuantityInput((current + amount).toString());
                      }}
                      className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-3 py-2 rounded-lg hover:from-blue-600 hover:to-indigo-700 font-bold transition-all shadow-md transform hover:scale-105 text-sm"
                    >
                      +{amount}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleQuantitySubmit}
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 text-white px-6 py-3 rounded-lg hover:from-emerald-600 hover:to-green-700 font-bold transition-all shadow-lg transform hover:scale-105"
                >
                  Confirm
                </button>
                <button
                  onClick={() => {
                    setCurrentProduct(null);
                    setQuantityInput('');
                  }}
                  className="bg-gradient-to-r from-slate-400 to-slate-500 text-white px-6 py-3 rounded-lg hover:from-slate-500 hover:to-slate-600 font-bold transition-all shadow-lg transform hover:scale-105"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Search Mode */}
        {currentMode === 'search' && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 border border-slate-200">
            <button
              onClick={() => {
                setCurrentMode('scan');
                setSearchQuery('');
                setSearchResults([]);
              }}
              className="mb-4 flex items-center gap-2 text-slate-600 hover:text-slate-800"
            >
              <ArrowLeft size={20} /> Back to Scan
            </button>

            <label className="block text-lg font-semibold text-slate-700 mb-3">Search Product</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                handleSearch(e.target.value);
              }}
              placeholder="Start typing product name or barcode..."
              className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-all"
              autoFocus
            />

            {searchQuery.trim() && searchResults.length === 0 && (
              <div className="mt-4 p-4 bg-purple-50 border-2 border-purple-200 rounded-lg">
                <p className="text-purple-800 font-semibold mb-3">✍️ Product not found in database</p>
                <p className="text-purple-700 text-sm mb-4">Create a manual entry for: "{searchQuery}"</p>
                <button
                  onClick={() => {
                    setCurrentProduct({
                      product: searchQuery,
                      barcode: '',
                      currentStock: 0,
                      value: 0,
                      isManualEntry: true
                    });
                    setCurrentMode('scan');
                    setTimeout(() => quantityInputRef.current?.focus(), 100);
                  }}
                  className="bg-gradient-to-r from-purple-500 to-purple-700 text-white px-4 py-2 rounded-lg hover:from-purple-600 hover:to-purple-800 font-semibold transition-all shadow-md"
                >
                  ✍️ Create Manual Entry
                </button>
              </div>
            )}

            {searchResults.length > 0 && (
              <div className="mt-4 max-h-96 overflow-y-auto">
                {searchResults.map((product, idx) => (
                  <div
                    key={idx}
                    onClick={() => selectSearchResult(product)}
                    className="p-3 hover:bg-slate-50 cursor-pointer border-b last:border-b-0 transition-colors"
                  >
                    <div className="font-semibold text-slate-800">{product.product}</div>
                    <div className="text-sm text-slate-500">Barcode: {product.barcode} • Stock: {product.currentStock}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Edit Scan Modal */}
        {editingScan && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
              <h3 className="text-xl font-bold text-slate-800 mb-4">Edit Scan</h3>

              <div className="mb-4">
                <div className="text-lg font-semibold text-slate-800">{editingScan.product}</div>
                <div className="text-sm text-slate-500">Barcode: {editingScan.barcode}</div>
                <div className="text-sm text-slate-600">Location: {editingScan.location}</div>
              </div>

              <div className="mb-6">
                <label className="block text-slate-700 font-medium mb-2">Quantity</label>
                <input
                  type="number"
                  step="0.01"
                  value={editQuantity}
                  onChange={(e) => setEditQuantity(e.target.value)}
                  className="w-full px-4 py-3 text-xl border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-lg hover:from-blue-600 hover:to-indigo-700 font-bold transition-all shadow-lg transform hover:scale-105"
                >
                  Save Changes
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="bg-gradient-to-r from-slate-400 to-slate-500 text-white px-6 py-3 rounded-lg hover:from-slate-500 hover:to-slate-600 font-bold transition-all shadow-lg transform hover:scale-105"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Scanned Items List - Regular Scans */}
        {scanType === 'regular' && scannedItems.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 border border-slate-200 mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-semibold text-slate-800 mb-4 break-words">
              📦 Regular Scans ({scannedItems.length})
              {unsyncedCount > 0 && (
                <span className="text-xs sm:text-sm text-yellow-700 ml-2 whitespace-nowrap">
                  ({unsyncedCount} unsynced)
                </span>
              )}
            </h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {scannedItems.map((item, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 p-3 rounded-lg border ${getSyncStatusColor(item)}`}
                >
                  <div className="flex-1 min-w-0 w-full">
                    <div className="font-semibold text-slate-800 break-words">{item.product}</div>
                    <div className="text-xs sm:text-sm text-slate-500 break-words">
                      {item.barcode} • Qty: {item.quantity} • {item.location}
                    </div>
                    <div className="text-xs text-slate-400">
                      {new Date(item.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                    {getSyncStatusIcon(item)}
                    <button
                      onClick={() => handleEditScan(item)}
                      className="p-1.5 sm:p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit scan"
                    >
                      <Edit2 size={16} className="sm:w-[18px] sm:h-[18px]" />
                    </button>
                    <button
                      onClick={() => handleDeleteScan(item)}
                      className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete scan"
                    >
                      <Trash2 size={16} className="sm:w-[18px] sm:h-[18px]" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Manual Entries List */}
        {scanType === 'regular' && manualCounts.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 border border-slate-200 mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <h2 className="text-lg sm:text-xl font-semibold text-slate-800">
                ✍️ Manual Entries ({manualCounts.length})
                <span className="block sm:inline text-xs sm:text-sm text-purple-600 sm:ml-2 mt-1 sm:mt-0">
                  (Not in barcode database)
                </span>
              </h2>
              <button
                onClick={syncManualEntries}
                disabled={!isOnline || isSyncing}
                className="bg-gradient-to-r from-purple-500 to-purple-700 text-white px-4 py-2 rounded-lg hover:from-purple-600 hover:to-purple-800 disabled:bg-slate-300 disabled:from-slate-300 disabled:to-slate-400 transition-all shadow-md flex items-center gap-2 font-semibold text-sm whitespace-nowrap"
              >
                <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                Sync Manual
              </button>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {manualCounts.map((item, idx) => (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 p-3 rounded-lg border border-purple-200 bg-purple-50"
                >
                  <div className="flex-1 min-w-0 w-full">
                    <div className="font-semibold text-slate-800 break-words">✍️ {item.product}</div>
                    <div className="text-xs sm:text-sm text-slate-500 break-words">
                      Manual Entry • Qty: {item.quantity} • {item.location}
                    </div>
                    <div className="text-xs text-slate-400">
                      {new Date(item.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setManualCounts((prev: any[]) => prev.filter((c: any) => c.syncId !== item.syncId));
                    }}
                    className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0 self-end sm:self-center"
                    title="Delete"
                  >
                    <Trash2 size={16} className="sm:w-[18px] sm:h-[18px]" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Keg Counting Table */}
        {scanType === 'kegs' && (
          <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 border border-slate-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <h2 className="text-lg sm:text-xl font-semibold text-slate-800">
                🍺 Keg Counting
              </h2>
              <button
                onClick={syncKegs}
                disabled={!isOnline || isSyncing || kegsList.every((k: any) => k.count === 0)}
                className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-2 rounded-lg hover:from-orange-600 hover:to-orange-700 disabled:bg-slate-300 disabled:from-slate-300 disabled:to-slate-400 transition-all shadow-md flex items-center gap-2 font-semibold text-sm whitespace-nowrap"
              >
                <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                Sync Kegs
              </button>
            </div>
            {kegsList.length === 0 ? (
              <p className="text-center text-slate-600 py-8 text-sm">Loading kegs from Master Sheet...</p>
            ) : (
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                  <table className="min-w-full border-collapse">
                    <thead>
                      <tr className="bg-orange-100 border-b-2 border-orange-300">
                        <th className="text-left p-2 sm:p-3 font-bold text-orange-900 text-sm sm:text-base">Keg Name</th>
                        <th className="text-center p-2 sm:p-3 font-bold text-orange-900 text-sm sm:text-base whitespace-nowrap">Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {kegsList.map((keg, idx) => (
                        <tr key={idx} className="border-b border-slate-200 hover:bg-orange-50">
                          <td className="p-2 sm:p-3 font-semibold text-slate-800 text-sm sm:text-base break-words">{keg.name}</td>
                          <td className="p-2 sm:p-3 text-center">
                            <input
                              type="number"
                              value={keg.count}
                              onChange={(e) => {
                                const newCount = parseInt(e.target.value) || 0;
                                setKegsList((prev: any[]) =>
                                  prev.map((k: any, i: number) =>
                                    i === idx ? { ...k, count: newCount } : k
                                  )
                                );
                              }}
                              className="w-20 sm:w-24 px-2 sm:px-3 py-1.5 sm:py-2 text-center border-2 border-orange-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 font-bold text-base sm:text-lg"
                              min="0"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// LOGIN PAGE COMPONENT
// ============================================
interface LoginPageProps {
  onLogin: (username: string, password: string) => Promise<boolean>;
  dbService: IndexedDBService;
}

function LoginPage({ onLogin, dbService }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [viewingData, setViewingData] = useState(false);
  const [savedData, setSavedData] = useState<any[]>([]);
  const [unsyncedCount, setUnsyncedCount] = useState(0);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    await onLogin(username, password);
    setLoading(false);
  };

  const handleViewData = async () => {
    try {
      await dbService.init();
      const scans = await dbService.getAllScans();
      const unsynced = await dbService.getUnsyncedScans();

      setSavedData(scans);
      setUnsyncedCount(unsynced.length);
      setViewingData(true);
    } catch (error) {
      alert('Failed to load saved data');
    }
  };

  const handleClearStocktake = async (stocktakeId: string, stocktakeName: string, stocktakeUnsynced: number) => {
    if (stocktakeUnsynced > 0) {
      if (!confirm(`⚠️ WARNING: "${stocktakeName}" has ${stocktakeUnsynced} unsynced scans!\n\nClearing will DELETE all unsynced data permanently.\n\nAre you sure you want to continue?`)) {
        return;
      }
      if (!confirm(`This action cannot be undone. Clear "${stocktakeName}"?`)) {
        return;
      }
    } else {
      if (!confirm(`Clear all cached data for "${stocktakeName}"?`)) {
        return;
      }
    }

    try {
      await dbService.init();

      // Delete all scans for this stocktake
      const allScans = await dbService.getAllScans();
      const stocktakeScans = allScans.filter((scan: any) => scan.stocktakeId === stocktakeId);
      for (const scan of stocktakeScans) {
        await dbService.deleteScan(scan.syncId);
      }

      // Refresh saved data display
      const remainingScans = await dbService.getAllScans();
      setSavedData(remainingScans);

      // Recalculate unsynced count
      const unsynced = await dbService.getUnsyncedScans();
      setUnsyncedCount(unsynced.length);

      alert(`✓ Cleared "${stocktakeName}" successfully!`);

      // If no scans left, return to login
      if (remainingScans.length === 0) {
        setViewingData(false);
      }
    } catch (error) {
      alert('Failed to clear stocktake data');
    }
  };

  const handleClearData = async () => {
    if (unsyncedCount > 0) {
      if (!confirm(`⚠️ WARNING: You have ${unsyncedCount} unsynced scans!\n\nClearing cache will DELETE all unsynced data permanently.\n\nAre you sure you want to continue?`)) {
        return;
      }
      if (!confirm('This action cannot be undone. Clear all data?')) {
        return;
      }
    } else {
      if (!confirm('Clear all cached scan data?')) {
        return;
      }
    }

    try {
      await dbService.init();
      await dbService.clearScans();
      await dbService.saveState('user', null);
      await dbService.saveState('currentStocktake', null);
      setSavedData([]);
      setUnsyncedCount(0);
      alert('✓ Cache cleared successfully!');
      setViewingData(false);
    } catch (error) {
      alert('Failed to clear cache');
    }
  };

  if (viewingData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 p-2 sm:p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-8 overflow-hidden">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-800 break-words">📊 Saved Scan Data</h2>
              <button
                onClick={() => setViewingData(false)}
                className="text-slate-600 hover:text-slate-800 flex items-center gap-2 whitespace-nowrap text-sm sm:text-base"
              >
                <ArrowLeft size={20} /> Back to Login
              </button>
            </div>

            {unsyncedCount > 0 && (
              <div className="mb-6 p-4 bg-yellow-50 border-2 border-yellow-400 rounded-lg">
                <p className="text-yellow-800 font-semibold">⚠️ Warning: {unsyncedCount} unsynced scans</p>
                <p className="text-yellow-700 text-sm">Please sync your data before clearing cache to avoid data loss.</p>
              </div>
            )}

            {savedData.length === 0 ? (
              <p className="text-center text-slate-600 py-8">No saved scan data found</p>
            ) : (
              <div className="space-y-4">
                <p className="text-slate-600 font-semibold">Total scans: {savedData.length}</p>

                {/* Group scans by stocktake */}
                {Object.entries(
                  savedData.reduce((groups: Record<string, any[]>, scan: any) => {
                    const stocktakeKey = scan.stocktakeId || 'unknown';
                    const stocktakeName = scan.stocktakeName || 'Unknown Stocktake';
                    const key = `${stocktakeKey}::${stocktakeName}`;
                    if (!groups[key]) {
                      groups[key] = [];
                    }
                    groups[key].push(scan);
                    return groups;
                  }, {})
                ).map(([key, scans]: [string, any]) => {
                  const [stocktakeId, stocktakeName] = key.split('::');
                  const stocktakeUnsynced = scans.filter((s: any) => !s.synced).length;

                  return (
                    <div key={key} className="border-2 border-slate-300 rounded-lg p-3 sm:p-4 bg-white overflow-hidden">
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-base sm:text-lg text-slate-800 break-words">📦 {stocktakeName}</h3>
                          <p className="text-xs text-slate-500 break-all">ID: {stocktakeId}</p>
                        </div>
                        <div className="flex flex-col sm:text-right gap-2 w-full sm:w-auto">
                          <div className="flex justify-between sm:flex-col gap-2">
                            <p className="text-sm font-semibold text-slate-700 whitespace-nowrap">{scans.length} scans</p>
                            {stocktakeUnsynced > 0 && (
                              <p className="text-xs text-yellow-600 font-semibold whitespace-nowrap">
                                ⚠️ {stocktakeUnsynced} unsynced
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => handleClearStocktake(stocktakeId, stocktakeName, stocktakeUnsynced)}
                            className="text-xs bg-red-500 text-white px-3 py-1.5 rounded hover:bg-red-600 font-semibold transition-colors whitespace-nowrap"
                          >
                            Clear This Stocktake
                          </button>
                        </div>
                      </div>

                      {/* Group by source within stocktake */}
                      {Object.entries(
                        scans.reduce((sourceGroups: Record<string, any[]>, scan: any) => {
                          const source = scan.source || 'unknown';
                          if (!sourceGroups[source]) {
                            sourceGroups[source] = [];
                          }
                          sourceGroups[source].push(scan);
                          return sourceGroups;
                        }, {})
                      ).map(([source, sourceScans]: [string, any]) => {
                        const sourceLabel = {
                          'local_scan': '📱 Local Scans',
                          'loaded_from_server': '☁️ Loaded from Server',
                          'unknown': '❓ Unknown Source'
                        }[source] || source;

                        return (
                          <div key={source} className="mb-3">
                            <p className="text-sm font-semibold text-slate-600 mb-2">
                              {sourceLabel} ({sourceScans.length})
                            </p>
                            <div className="max-h-64 overflow-y-auto space-y-2 pl-0 sm:pl-3">
                              {sourceScans.map((scan: any, idx: number) => (
                                <div key={idx} className="p-2 border rounded bg-slate-50 text-sm overflow-hidden">
                                  <div className="font-semibold break-words">{scan.product}</div>
                                  <div className="text-xs text-slate-600 break-words">
                                    Qty: {scan.quantity} • {scan.location} • {scan.user}
                                  </div>
                                  <div className="text-xs text-slate-400 break-words">
                                    {new Date(scan.timestamp).toLocaleString()}
                                    {!scan.synced && <span className="ml-2 text-yellow-600 font-semibold whitespace-nowrap">⚠️ Unsynced</span>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                onClick={handleClearData}
                className="flex-1 bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 font-bold transition-all shadow-lg"
              >
                Clear All Data
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md transform hover:scale-105 transition-transform">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-700 bg-clip-text text-transparent mb-2">📦 Stock Wizard</h1>
        <p className="text-slate-600 mb-8 font-medium">Sign in to start counting</p>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-slate-700 font-semibold mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              placeholder="Enter your username"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-slate-700 font-semibold mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              placeholder="Enter your password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-700 text-white py-3 rounded-lg hover:from-blue-700 hover:to-purple-800 font-bold transition-all shadow-lg transform hover:scale-105 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <button
            type="button"
            onClick={handleViewData}
            className="w-full mt-3 bg-slate-100 text-slate-700 py-3 rounded-lg hover:bg-slate-200 font-semibold transition-all border-2 border-slate-300"
          >
            📊 View Saved Data
          </button>
        </form>
      </div>
    </div>
  );
}

// ============================================
// SETTINGS PAGE COMPONENT
// ============================================
interface SettingsPageProps {
  user: any;
  currentStocktake: any;
  onCreateStocktake: (name: string) => Promise<boolean>;
  onSelectStocktake: (stocktake: any) => Promise<void>;
  onLogout: () => void;
  onBack?: () => void;
  apiService: GoogleSheetsService;
}

function SettingsPage({ user, currentStocktake, onCreateStocktake, onSelectStocktake, onLogout, onBack, apiService }: SettingsPageProps) {
  const [mode, setMode] = useState('menu'); // menu, create, select
  const [stocktakeName, setStocktakeName] = useState('');
  const [availableStocktakes, setAvailableStocktakes] = useState<any[]>([]);
  const [selectedStocktake, setSelectedStocktake] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStocktake, setLoadingStocktake] = useState(false);

  useEffect(() => {
    if (mode === 'select') {
      loadStocktakes();
    }
  }, [mode]);

  const loadStocktakes = async () => {
    setLoading(true);
    const startTime = performance.now();
    console.log('⏱️ Starting to load stocktakes...');

    try {
      const apiStartTime = performance.now();
      const result = await apiService.listStocktakes();
      const apiEndTime = performance.now();
      const apiDuration = (apiEndTime - apiStartTime) / 1000;

      console.log(`⏱️ API call took: ${apiDuration.toFixed(2)}s`);

      if (result.success) {
        setAvailableStocktakes(result.stocktakes);
        const totalDuration = (performance.now() - startTime) / 1000;
        console.log(`✅ Stocktakes loaded successfully in ${totalDuration.toFixed(2)}s`);
        console.log(`📊 Found ${result.stocktakes.length} stocktakes`);
      } else {
        console.error('❌ API returned success=false:', result.message);
        alert('Failed to load stocktakes: ' + result.message);
      }
    } catch (error) {
      const errorDuration = (performance.now() - startTime) / 1000;
      console.error(`❌ Error after ${errorDuration.toFixed(2)}s:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert('Failed to load stocktakes: ' + errorMessage);
    } finally {
      setLoading(false);
      const totalDuration = (performance.now() - startTime) / 1000;
      console.log(`⏱️ Total loadStocktakes duration: ${totalDuration.toFixed(2)}s`);
    }
  };

  const handleCreate = async (e: any) => {
    e.preventDefault();
    if (!stocktakeName.trim()) return;

    setLoading(true);
    const success = await onCreateStocktake(stocktakeName);
    setLoading(false);

    if (success) {
      setStocktakeName('');
    }
  };

  const handleContinueStocktake = async () => {
    setLoadingStocktake(true);
    try {
      await onSelectStocktake(selectedStocktake);
    } finally {
      // Note: This may not execute if navigation happens, but that's okay
      setLoadingStocktake(false);
    }
  };

  if (mode === 'create') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <button
            onClick={() => setMode('menu')}
            className="mb-4 flex items-center gap-2 text-slate-600 hover:text-slate-800"
          >
            <ArrowLeft size={20} /> Back
          </button>

          <h2 className="text-2xl font-bold text-slate-800 mb-6">Create New Stocktake</h2>

          <form onSubmit={handleCreate}>
            <div className="mb-6">
              <label className="block text-slate-700 font-medium mb-2">Stocktake Name</label>
              <input
                type="text"
                value={stocktakeName}
                onChange={(e) => setStocktakeName(e.target.value)}
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                placeholder="e.g., End of Month - December"
                required
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 text-white py-3 rounded-lg hover:bg-emerald-700 font-semibold transition-colors disabled:bg-slate-400"
            >
              {loading ? 'Creating...' : 'Create Stocktake'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (mode === 'select') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <button
              onClick={() => {
                setMode('menu');
                setSelectedStocktake(null);
              }}
              className="mb-4 flex items-center gap-2 text-slate-600 hover:text-slate-800"
            >
              <ArrowLeft size={20} /> Back
            </button>

            <h2 className="text-2xl font-bold text-slate-800 mb-6">Select Stocktake</h2>

            {loading ? (
              <p className="text-center text-slate-600">Loading stocktakes...</p>
            ) : availableStocktakes.length === 0 ? (
              <p className="text-center text-slate-600">No stocktakes found</p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h3 className="font-semibold text-slate-700 mb-2">Available Stocktakes</h3>
                  {availableStocktakes.map((stocktake: any) => (
                    <div
                      key={stocktake.id}
                      onClick={() => setSelectedStocktake(stocktake)}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedStocktake?.id === stocktake.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      <div className="font-semibold text-slate-800">{stocktake.name}</div>
                      <div className="text-sm text-slate-500 mt-1">
                        Created: {stocktake.createdDate}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        {new Date(stocktake.lastModified).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>

                {selectedStocktake && (
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
                    <h3 className="font-bold text-xl text-blue-900 mb-4">Stocktake Details</h3>
                    <div className="space-y-3 mb-6">
                      <div>
                        <p className="text-sm text-blue-700 font-semibold">Name:</p>
                        <p className="text-blue-900">{selectedStocktake.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-blue-700 font-semibold">Created By:</p>
                        <p className="text-blue-900">{selectedStocktake.createdBy}</p>
                      </div>
                      <div>
                        <p className="text-sm text-blue-700 font-semibold">Created Date:</p>
                        <p className="text-blue-900">{selectedStocktake.createdDate}</p>
                      </div>
                      <div>
                        <p className="text-sm text-blue-700 font-semibold">Last Modified:</p>
                        <p className="text-blue-900">{new Date(selectedStocktake.lastModified).toLocaleString()}</p>
                      </div>
                    </div>
                    <button
                      onClick={handleContinueStocktake}
                      disabled={loadingStocktake}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-4 rounded-lg hover:from-blue-700 hover:to-indigo-800 disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed font-bold transition-all shadow-lg transform hover:scale-105 disabled:hover:scale-100"
                    >
                      {loadingStocktake ? '⏳ Loading...' : '📦 Continue with this Stocktake'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Main menu
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Settings</h2>
            <p className="text-slate-600">Hello, {user.username}!</p>
          </div>
          <button
            onClick={onLogout}
            className="text-red-600 hover:text-red-700 flex items-center gap-1 text-sm font-medium"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>

        {currentStocktake && onBack && (
          <button
            onClick={onBack}
            className="mb-4 flex items-center gap-2 text-slate-600 hover:text-slate-800"
          >
            <ArrowLeft size={20} /> Back to Scanning
          </button>
        )}

        {currentStocktake && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
            <p className="text-sm font-medium text-emerald-800">Active Stocktake:</p>
            <p className="text-emerald-900 font-semibold">{currentStocktake.name}</p>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={() => setMode('create')}
            className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white py-4 rounded-lg hover:from-emerald-600 hover:to-green-700 font-bold transition-all shadow-lg flex items-center justify-center gap-2 transform hover:scale-105"
          >
            <Package size={20} /> Start New Stocktake
          </button>

          <button
            onClick={() => setMode('select')}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-4 rounded-lg hover:from-blue-700 hover:to-indigo-800 font-bold transition-all shadow-lg flex items-center justify-center gap-2 transform hover:scale-105"
          >
            <Search size={20} /> Continue Existing Stocktake
          </button>
        </div>
      </div>
    </div>
  );
}
