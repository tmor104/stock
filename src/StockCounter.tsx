import { useState, useRef, useEffect } from 'react';
import { Search, Package, Scan, ArrowLeft, Settings, LogOut, RefreshCw, WifiOff, CheckCircle, Clock } from 'lucide-react';

// ============================================
// CONFIGURATION
// ============================================
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx6yH0XWvbsDlYvhf1OaozoQhGAvlRIFPlN9oV9dr-3P5gPZpb29yl9coSOkvzEYqD04w/exec';
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
    const index = store.index('synced');
    const request = index.getAll(IDBKeyRange.only(false));

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
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
    try {
      const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...data }),
        mode: 'cors'
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('API Error:', error);
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

  // Scan Mode
  const [currentMode, setCurrentMode] = useState('scan');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [quantityInput, setQuantityInput] = useState('');
  const [currentProduct, setCurrentProduct] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // UI State
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');

  // Refs
  const barcodeInputRef = useRef(null);
  const quantityInputRef = useRef(null);

  // ============================================
  // INITIALIZATION
  // ============================================
  useEffect(() => {
    initializeApp();

    // Online/offline detection
    window.addEventListener('online', () => setIsOnline(true));
    window.addEventListener('offline', () => setIsOnline(false));

    return () => {
      window.removeEventListener('online', () => setIsOnline(true));
      window.removeEventListener('offline', () => setIsOnline(false));
    };
  }, []);

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
      setScannedItems(allScans);

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
      setCurrentStocktake(stocktake);
      await dbService.saveState('currentStocktake', stocktake);

      // Load products and locations
      await loadProductsAndLocations();

      // Load user's previous scans from this stocktake
      const result = await apiService.loadUserScans(stocktake.id, user.username);

      if (result.success && result.scans.length > 0) {
        // Save to IndexedDB
        for (const scan of result.scans) {
          await dbService.saveScan(scan);
        }
        setScannedItems(result.scans);
        alert(`Loaded ${result.scans.length} previous scans from this stocktake.`);
      }

      setAppMode('scan');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert('Failed to load stocktake: ' + errorMessage);
    }
  };

  const loadProductsAndLocations = async () => {
    try {
      // Load products
      const productsResult = await apiService.getProductDatabase();
      if (productsResult.success) {
        setProductDatabase(productsResult.products);
        await dbService.saveProducts(productsResult.products);
      }

      // Load locations
      const locationsResult = await apiService.getLocations();
      if (locationsResult.success) {
        setLocations(locationsResult.locations);
        await dbService.saveLocations(locationsResult.locations);

        // Set default location if not set
        if (!currentLocation && locationsResult.locations.length > 0) {
          setCurrentLocation(locationsResult.locations[0]);
          await dbService.saveState('currentLocation', locationsResult.locations[0]);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Could not load product database. Using offline data if available.');

      // Fallback to cached data
      const cachedProducts = await dbService.getProducts();
      const cachedLocations = await dbService.getLocations();
      setProductDatabase(cachedProducts);
      setLocations(cachedLocations);
    }
  };

  // ============================================
  // SCANNING
  // ============================================
  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const product = productDatabase.find(p => p.barcode === barcodeInput.trim());

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

  const handleQuantitySubmit = async (e) => {
    e.preventDefault();
    if (!quantityInput || !currentProduct) return;

    const qty = parseFloat(quantityInput);
    if (isNaN(qty) || qty <= 0) {
      alert('Please enter a valid quantity');
      return;
    }

    // Create scan entry
    const scan = {
      syncId: `${Date.now()}-${Math.random()}`,
      barcode: currentProduct.barcode,
      product: currentProduct.product,
      quantity: qty,
      location: currentLocation,
      user: user.username,
      timestamp: new Date().toISOString(),
      stockLevel: currentProduct.currentStock || 0,
      value: currentProduct.value || 0,
      synced: false
    };

    // Save to IndexedDB
    await dbService.saveScan(scan);

    // Update UI
    setScannedItems(prev => [scan, ...prev]);
    setUnsyncedCount(prev => prev + 1);

    // Reset form
    setCurrentProduct(null);
    setQuantityInput('');
    setBarcodeInput('');
    setTimeout(() => barcodeInputRef.current?.focus(), 100);

    // Auto-sync every 10 scans
    if ((unsyncedCount + 1) % SYNC_INTERVAL === 0 && isOnline) {
      await syncToGoogleSheets();
    }
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

      const result = await apiService.syncScans(currentStocktake.id, unsyncedScans);

      if (result.success) {
        // Mark scans as synced
        await dbService.markScansSynced(result.syncedIds);

        // Update UI
        setScannedItems(prev =>
          prev.map(scan =>
            result.syncedIds.includes(scan.syncId)
              ? { ...scan, synced: true }
              : scan
          )
        );

        setUnsyncedCount(0);
        setSyncStatus(`Synced ${result.syncedCount} scans!`);
        setTimeout(() => setSyncStatus(''), 3000);
      } else {
        setSyncStatus('Sync failed');
        setTimeout(() => setSyncStatus(''), 3000);
      }
    } catch (error) {
      console.error('Sync error:', error);
      setSyncStatus('Sync failed');
      setTimeout(() => setSyncStatus(''), 3000);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleChangeLocation = async (newLocation) => {
    setCurrentLocation(newLocation);
    await dbService.saveState('currentLocation', newLocation);
  };

  // ============================================
  // SEARCH
  // ============================================
  const handleSearch = (query) => {
    const searchTerm = query || searchQuery;
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    const results = productDatabase.filter(p =>
      p.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.barcode.toString().includes(searchTerm)
    );
    setSearchResults(results);
  };

  const selectSearchResult = (product) => {
    setCurrentProduct(product);
    setSearchQuery('');
    setSearchResults([]);
    setCurrentMode('scan');
    setTimeout(() => quantityInputRef.current?.focus(), 100);
  };

  // ============================================
  // UI HELPERS
  // ============================================
  const getSyncStatusColor = (scan) => {
    if (scan.synced) return 'bg-green-50 border-green-200';
    return 'bg-yellow-50 border-yellow-300';
  };

  const getSyncStatusIcon = (scan) => {
    if (scan.synced) return <CheckCircle size={16} className="text-green-600" />;
    return <Clock size={16} className="text-yellow-600" />;
  };

  // ============================================
  // RENDER: LOGIN PAGE
  // ============================================
  if (appMode === 'login') {
    return <LoginPage onLogin={handleLogin} />;
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
        apiService={apiService}
      />
    );
  }

  // ============================================
  // RENDER: SCAN MODE
  // ============================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 border border-slate-200">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">📦 Stock Wizard</h1>
              <p className="text-sm text-slate-600">
                {user.username} • {currentStocktake?.name}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setAppMode('settings')}
                className="bg-slate-600 text-white p-2 rounded-lg hover:bg-slate-700 transition-colors"
                title="Settings"
              >
                <Settings size={20} />
              </button>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white p-2 rounded-lg hover:bg-red-700 transition-colors"
                title="Logout"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>

          {/* Location & Sync Status */}
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <label className="text-sm font-medium text-slate-700 mb-1 block">Current Location</label>
              <select
                value={currentLocation}
                onChange={(e) => handleChangeLocation(e.target.value)}
                className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
              >
                {locations.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              {!isOnline && (
                <div className="flex items-center gap-1 text-orange-600">
                  <WifiOff size={18} />
                  <span className="text-sm font-medium">Offline</span>
                </div>
              )}

              {unsyncedCount > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-yellow-700">
                    {unsyncedCount} unsynced
                  </span>
                  <button
                    onClick={syncToGoogleSheets}
                    disabled={!isOnline || isSyncing}
                    className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 disabled:bg-slate-300 transition-colors flex items-center gap-1"
                  >
                    <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
                    Sync
                  </button>
                </div>
              )}

              {syncStatus && (
                <span className="text-sm font-medium text-green-600">{syncStatus}</span>
              )}
            </div>
          </div>
        </div>

        {/* Scan Interface */}
        {currentMode === 'scan' && !currentProduct && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 border border-slate-200">
            <label className="block text-lg font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Scan size={24} className="text-slate-600" /> Scan Barcode
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
              className="w-full px-4 py-4 text-xl border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-all"
              autoFocus
            />

            <div className="grid grid-cols-2 gap-2 mt-4">
              <button
                onClick={() => setCurrentMode('search')}
                className="bg-slate-100 text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-200 transition-colors flex items-center justify-center gap-1.5 text-sm font-medium"
              >
                <Search size={16} /> Search Product
              </button>
              <button
                onClick={syncToGoogleSheets}
                disabled={!isOnline || isSyncing || unsyncedCount === 0}
                className="bg-emerald-600 text-white px-3 py-2 rounded-lg hover:bg-emerald-700 disabled:bg-slate-300 transition-colors flex items-center justify-center gap-1.5 text-sm font-medium"
              >
                <RefreshCw size={16} /> Manual Sync
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
              <div className="flex gap-2">
                <button
                  onClick={handleQuantitySubmit}
                  className="flex-1 bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 font-semibold transition-colors"
                >
                  Confirm
                </button>
                <button
                  onClick={() => {
                    setCurrentProduct(null);
                    setQuantityInput('');
                  }}
                  className="bg-slate-200 text-slate-700 px-6 py-3 rounded-lg hover:bg-slate-300 font-semibold transition-colors"
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
              onClick={() => setCurrentMode('scan')}
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

        {/* Scanned Items List */}
        {scannedItems.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-slate-200">
            <h2 className="text-xl font-semibold text-slate-800 mb-4">
              Your Scans ({scannedItems.length})
              {unsyncedCount > 0 && (
                <span className="text-sm text-yellow-700 ml-2">
                  ({unsyncedCount} unsynced)
                </span>
              )}
            </h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {scannedItems.map((item, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${getSyncStatusColor(item)}`}
                >
                  <div className="flex-1">
                    <div className="font-semibold text-slate-800">{item.product}</div>
                    <div className="text-sm text-slate-500">
                      {item.barcode} • Qty: {item.quantity} • {item.location}
                    </div>
                    <div className="text-xs text-slate-400">
                      {new Date(item.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getSyncStatusIcon(item)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// LOGIN PAGE COMPONENT
// ============================================
function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onLogin(username, password);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <h1 className="text-4xl font-bold text-slate-800 mb-2">📦 Stock Wizard</h1>
        <p className="text-slate-600 mb-8">Sign in to start counting</p>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-slate-700 font-medium mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
              placeholder="Enter your username"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-slate-700 font-medium mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
              placeholder="Enter your password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-800 text-white py-3 rounded-lg hover:bg-slate-700 font-semibold transition-colors disabled:bg-slate-400"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ============================================
// SETTINGS PAGE COMPONENT
// ============================================
function SettingsPage({ user, currentStocktake, onCreateStocktake, onSelectStocktake, onLogout, apiService }) {
  const [mode, setMode] = useState('menu'); // menu, create, select
  const [stocktakeName, setStocktakeName] = useState('');
  const [availableStocktakes, setAvailableStocktakes] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (mode === 'select') {
      loadStocktakes();
    }
  }, [mode]);

  const loadStocktakes = async () => {
    setLoading(true);
    try {
      const result = await apiService.listStocktakes();
      if (result.success) {
        setAvailableStocktakes(result.stocktakes);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert('Failed to load stocktakes: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!stocktakeName.trim()) return;

    setLoading(true);
    const success = await onCreateStocktake(stocktakeName);
    setLoading(false);

    if (success) {
      setStocktakeName('');
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
              onClick={() => setMode('menu')}
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
              <div className="space-y-3">
                {availableStocktakes.map((stocktake) => (
                  <div
                    key={stocktake.id}
                    onClick={() => onSelectStocktake(stocktake)}
                    className="p-4 border-2 border-slate-200 rounded-lg hover:border-slate-400 hover:bg-slate-50 cursor-pointer transition-all"
                  >
                    <div className="font-semibold text-slate-800">{stocktake.name}</div>
                    <div className="text-sm text-slate-500 mt-1">
                      Created: {stocktake.createdDate} • By: {stocktake.createdBy}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      Last modified: {new Date(stocktake.lastModified).toLocaleString()}
                    </div>
                  </div>
                ))}
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

        {currentStocktake && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
            <p className="text-sm font-medium text-emerald-800">Active Stocktake:</p>
            <p className="text-emerald-900 font-semibold">{currentStocktake.name}</p>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={() => setMode('create')}
            className="w-full bg-emerald-600 text-white py-4 rounded-lg hover:bg-emerald-700 font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <Package size={20} /> Start New Stocktake
          </button>

          <button
            onClick={() => setMode('select')}
            className="w-full bg-slate-600 text-white py-4 rounded-lg hover:bg-slate-700 font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <Search size={20} /> Continue Existing Stocktake
          </button>
        </div>
      </div>
    </div>
  );
}
