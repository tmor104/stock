import { useState, useRef, useEffect } from 'react';
import { Upload, Search, Package, Scan, Download, Edit2, Trash2, X, ArrowLeft } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Product {
  barcode: string | number;
  product: string;
}

interface StockEntry {
  barcode: string | number;
  product: string;
  quantity: number;
  timestamp: string;
  note?: string;
}

export default function StockCounter() {
  const [productDatabase, setProductDatabase] = useState<Product[]>([]);
  const [kegProducts, setKegProducts] = useState<string[]>([]);
  const [scannedItems, setScannedItems] = useState<StockEntry[]>([]);
  const [manualEntries, setManualEntries] = useState<StockEntry[]>([]);
  const [currentMode, setCurrentMode] = useState('scan');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [quantityInput, setQuantityInput] = useState('');
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [editingIndex, setEditingIndex] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState('');
  const [boxCount, setBoxCount] = useState('');
  const [itemsPerBox, setItemsPerBox] = useState('');
  const [manualBarcode, setManualBarcode] = useState('');
  const [manualProduct, setManualProduct] = useState('');
  const [kegCounts, setKegCounts] = useState<Record<string, number>>({});
  const [editingKeg, setEditingKeg] = useState<string | null>(null);
  const [kegInputValue, setKegInputValue] = useState('');
  const [showKegAddReplace, setShowKegAddReplace] = useState(false);
  const [unknownProductName, setUnknownProductName] = useState('');

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const kegFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentMode === 'scan' && barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, [currentMode, currentProduct]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const result = evt.target?.result;
      if (!result) return;
      const data = new Uint8Array(result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: ['barcode', 'product'] }) as Product[];

      const cleanData = jsonData.slice(1).filter((row: Product) => row.barcode && row.product);
      setProductDatabase(cleanData);
      alert(`Loaded ${cleanData.length} products from spreadsheet`);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleKegFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const result = evt.target?.result;
      if (!result) return;
      const data = new Uint8Array(result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as string[][];

      // Extract first column (product names), skip header row
      const products = jsonData.slice(1)
        .map(row => row[0])
        .filter(item => item && typeof item === 'string' && item.trim());

      setKegProducts(products as string[]);
      setKegCounts({}); // Reset counts when new list is uploaded
      alert(`Loaded ${products.length} keg/beverage products`);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const product = productDatabase.find(p => p.barcode.toString() === barcodeInput.trim());

    if (product) {
      setCurrentProduct(product);
      setBarcodeInput('');
      setUnknownProductName('');
      setTimeout(() => quantityInputRef.current?.focus(), 100);
    } else {
      setCurrentProduct({ barcode: barcodeInput, product: '' });
      setBarcodeInput('');
      setUnknownProductName('');
    }
  };

  const handleQuantitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quantityInput || !currentProduct) return;

    // If product name is empty (unknown barcode), require product name input
    if (!currentProduct.product && !unknownProductName.trim()) {
      alert('Please enter a product name for this unknown barcode');
      return;
    }

    const qty = parseFloat(quantityInput);
    if (isNaN(qty) || qty <= 0) {
      alert('Please enter a valid quantity');
      return;
    }

    const productName = currentProduct.product || unknownProductName.trim();
    const entry = {
      barcode: currentProduct.barcode,
      product: productName,
      quantity: qty,
      timestamp: new Date().toLocaleString()
    };

    // Unknown barcodes always go to manual entries
    if (!currentProduct.product) {
      setManualEntries(prev => [entry, ...prev]);
    } else {
      setScannedItems(prev => [entry, ...prev]);
    }

    setCurrentProduct(null);
    setQuantityInput('');
    setBarcodeInput('');
    setUnknownProductName('');
    setTimeout(() => barcodeInputRef.current?.focus(), 100);
  };

  const handleSearch = (query: string) => {
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

  const selectSearchResult = (product: Product) => {
    setCurrentProduct(product);
    setSearchQuery('');
    setSearchResults([]);
    setCurrentMode('scan');
    setTimeout(() => quantityInputRef.current?.focus(), 100);
  };

  const handleManualEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBarcode || !manualProduct || !quantityInput) return;

    const qty = parseFloat(quantityInput);
    if (isNaN(qty) || qty <= 0) {
      alert('Please enter a valid quantity');
      return;
    }

    const entry = {
      barcode: manualBarcode,
      product: manualProduct,
      quantity: qty,
      timestamp: new Date().toLocaleString()
    };

    setManualEntries(prev => [entry, ...prev]);
    setManualBarcode('');
    setManualProduct('');
    setQuantityInput('');
    setCurrentMode('scan');
  };

  const handleKegClick = (product: string) => {
    const currentValue = kegCounts[product] || 0;
    setEditingKeg(product);
    setKegInputValue('');
    setShowKegAddReplace(currentValue > 0);
  };

  const handleKegSave = (action: 'add' | 'replace') => {
    if (!editingKeg || !kegInputValue) return;

    const inputQty = parseFloat(kegInputValue);
    if (isNaN(inputQty) || inputQty <= 0) {
      alert('Please enter a valid quantity');
      return;
    }

    const currentQty = kegCounts[editingKeg] || 0;
    const newQty = action === 'add' ? currentQty + inputQty : inputQty;

    // Update keg counts
    setKegCounts(prev => ({
      ...prev,
      [editingKeg]: newQty
    }));

    // Update manual entries for export
    const existingIndex = manualEntries.findIndex(item => item.product === editingKeg);
    const entry: StockEntry = {
      barcode: 'KEG',
      product: editingKeg,
      quantity: newQty,
      timestamp: new Date().toLocaleString()
    };

    if (existingIndex !== -1) {
      setManualEntries(prev => prev.map((item, idx) =>
        idx === existingIndex ? entry : item
      ));
    } else {
      setManualEntries(prev => [entry, ...prev]);
    }

    setEditingKeg(null);
    setKegInputValue('');
    setShowKegAddReplace(false);
  };

  const handleKegCancel = () => {
    setEditingKeg(null);
    setKegInputValue('');
    setShowKegAddReplace(false);
  };

  const handleBoxCount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProduct || !boxCount || !itemsPerBox) return;

    const boxes = parseInt(boxCount);
    const perBox = parseInt(itemsPerBox);
    
    if (isNaN(boxes) || isNaN(perBox) || boxes <= 0 || perBox <= 0) {
      alert('Please enter valid numbers');
      return;
    }

    const totalQty = boxes * perBox;
    
    const entry = {
      barcode: currentProduct.barcode,
      product: currentProduct.product,
      quantity: totalQty,
      timestamp: new Date().toLocaleString(),
      note: `${boxes} boxes × ${perBox} items`
    };

    setScannedItems(prev => [entry, ...prev]);
    setCurrentProduct(null);
    setBoxCount('');
    setItemsPerBox('');
    setSearchQuery('');
    setCurrentMode('scan');
  };

  const deleteEntry = (index: number, isManual: boolean) => {
    if (isManual) {
      setManualEntries(prev => prev.filter((_, i) => i !== index));
    } else {
      setScannedItems(prev => prev.filter((_, i) => i !== index));
    }
  };

  const startEdit = (index: number, quantity: number, isManual: boolean) => {
    setEditingIndex(isManual ? `manual-${index}` : `scanned-${index}`);
    setEditQuantity(quantity.toString());
  };

  const saveEdit = (index: number, isManual: boolean) => {
    const newQty = parseFloat(editQuantity);
    if (isNaN(newQty) || newQty <= 0) {
      alert('Please enter a valid quantity');
      return;
    }

    if (isManual) {
      setManualEntries(prev => prev.map((item, i) => 
        i === index ? { ...item, quantity: newQty } : item
      ));
    } else {
      setScannedItems(prev => prev.map((item, i) => 
        i === index ? { ...item, quantity: newQty } : item
      ));
    }
    setEditingIndex(null);
    setEditQuantity('');
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    
    const scannedData = scannedItems.map(item => ({
      Barcode: item.barcode,
      Product: item.product,
      Quantity: item.quantity,
      Timestamp: item.timestamp,
      Note: item.note || ''
    }));
    const ws1 = XLSX.utils.json_to_sheet(scannedData);
    XLSX.utils.book_append_sheet(wb, ws1, 'Scanned Items');
    
    const manualData = manualEntries.map(item => ({
      Barcode: item.barcode,
      Product: item.product,
      Quantity: item.quantity,
      Timestamp: item.timestamp
    }));
    const ws2 = XLSX.utils.json_to_sheet(manualData);
    XLSX.utils.book_append_sheet(wb, ws2, 'Manual Entries');
    
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });
    
    const buf = new ArrayBuffer(wbout.length);
    const view = new Uint8Array(buf);
    for (let i = 0; i < wbout.length; i++) {
      view[i] = wbout.charCodeAt(i) & 0xFF;
    }
    const blob = new Blob([buf], { type: 'application/octet-stream' });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stock_count_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const BackToScanButton = () => (
    <button
      onClick={() => {
        setCurrentMode('scan');
        setCurrentProduct(null);
        setSearchQuery('');
        setSearchResults([]);
      }}
      className="fixed top-4 left-4 bg-slate-800 text-white p-3 rounded-full shadow-lg hover:bg-slate-700 transition-all z-50"
      title="Back to Scan"
    >
      <ArrowLeft size={24} />
    </button>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 p-4">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8 mb-6 border border-gray-200">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-indigo-500 to-blue-600 p-3 rounded-lg shadow-md">
                <Package size={32} className="text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Stock Wizard</h1>
                <p className="text-sm text-gray-600">DIY Stock Management</p>
              </div>
            </div>
            {currentMode !== 'scan' && (
              <button
                onClick={() => {
                  setCurrentMode('scan');
                  setCurrentProduct(null);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-all shadow-sm font-medium flex items-center gap-2"
              >
                <ArrowLeft size={18} /> Back to Scan
              </button>
            )}
          </div>

          {productDatabase.length === 0 && (
            <div className="mb-6 p-6 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-900 mb-4 font-semibold">Upload Product Database</p>
              <p className="text-blue-700 text-sm mb-4">Import your products from an Excel file to get started</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-all shadow-sm font-medium flex items-center gap-2"
              >
                <Upload size={20} /> Upload Excel File
              </button>
            </div>
          )}

          {productDatabase.length > 0 && (
            <div className="mb-6">
              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-gray-600 text-white px-5 py-2.5 rounded-lg hover:bg-gray-700 transition-all shadow-sm font-medium flex items-center gap-2"
                >
                  <Upload size={18} /> Change Database
                </button>
                <button
                  onClick={exportToExcel}
                  disabled={scannedItems.length === 0 && manualEntries.length === 0}
                  className="bg-emerald-600 text-white px-5 py-2.5 rounded-lg hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all shadow-sm font-medium flex items-center gap-2"
                >
                  <Download size={18} /> Export to Excel
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>
          )}

          {currentMode === 'scan' && !currentProduct && productDatabase.length > 0 && (
            <div className="mb-6">
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
                  <Search size={16} /> Search
                </button>
                <button
                  onClick={() => setCurrentMode('manual')}
                  className="bg-slate-100 text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-200 transition-colors flex items-center justify-center gap-1.5 text-sm font-medium"
                >
                  <Edit2 size={16} /> Manual
                </button>
                <button
                  onClick={() => setCurrentMode('boxes')}
                  className="bg-slate-100 text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-200 transition-colors flex items-center justify-center gap-1.5 text-sm font-medium"
                >
                  <Package size={16} /> Boxes
                </button>
                <button
                  onClick={() => setCurrentMode('kegs')}
                  className="bg-amber-100 text-amber-800 px-3 py-2 rounded-lg hover:bg-amber-200 transition-colors flex items-center justify-center gap-1.5 text-sm font-medium"
                >
                  <Package size={16} /> Kegs
                </button>
              </div>
            </div>
          )}

          {currentMode === 'search' && (
            <>
              <BackToScanButton />
              <div className="mb-6">
                <label className="block text-lg font-semibold text-slate-700 mb-3">Search Product</label>
                <div className="relative">
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
                  {searchResults.length > 0 && searchQuery && (
                    <div className="absolute z-10 w-full mt-2 bg-white border-2 border-slate-300 rounded-xl shadow-xl max-h-80 overflow-y-auto">
                      {searchResults.map((product, idx) => (
                        <div
                          key={idx}
                          onClick={() => selectSearchResult(product)}
                          className="p-3 hover:bg-slate-50 cursor-pointer border-b last:border-b-0 transition-colors"
                        >
                          <div className="font-semibold text-slate-800">{product.product}</div>
                          <div className="text-sm text-slate-500">{product.barcode}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {currentMode === 'boxes' && (
            <>
              <BackToScanButton />
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-slate-800 mb-4">Count Boxes</h2>
                
                {!currentProduct ? (
                  <>
                    <label className="block text-slate-700 mb-3">Search for Product</label>
                    <div className="relative mb-4">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          handleSearch(e.target.value);
                        }}
                        placeholder="Start typing product name..."
                        className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-all"
                        autoFocus
                      />
                      {searchResults.length > 0 && searchQuery && (
                        <div className="absolute z-10 w-full mt-2 bg-white border-2 border-slate-300 rounded-xl shadow-xl max-h-64 overflow-y-auto">
                          {searchResults.map((product, idx) => (
                            <div
                              key={idx}
                              onClick={() => {
                                setCurrentProduct(product);
                                setSearchResults([]);
                                setSearchQuery('');
                              }}
                              className="p-3 hover:bg-slate-50 cursor-pointer border-b last:border-b-0 transition-colors"
                            >
                              <div className="font-semibold text-slate-800">{product.product}</div>
                              <div className="text-sm text-slate-500">{product.barcode}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div>
                    <div className="bg-slate-50 p-4 rounded-xl mb-4 border border-slate-200">
                      <div className="font-semibold text-lg text-slate-800">{currentProduct.product}</div>
                      <div className="text-sm text-slate-500">{currentProduct.barcode}</div>
                    </div>
                    
                    <label className="block text-slate-700 mb-2">Number of Boxes</label>
                    <input
                      type="number"
                      value={boxCount}
                      onChange={(e) => setBoxCount(e.target.value)}
                      placeholder="Enter number of boxes..."
                      className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl mb-4 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-all"
                      autoFocus
                    />
                    
                    <label className="block text-slate-700 mb-2">Items Per Box</label>
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      {[6, 12, 24, 30].map(num => (
                        <button
                          key={num}
                          onClick={() => setItemsPerBox(num.toString())}
                          className={`py-2 rounded-lg font-semibold transition-all ${
                            itemsPerBox === num.toString()
                              ? 'bg-slate-800 text-white'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                    <input
                      type="number"
                      value={itemsPerBox}
                      onChange={(e) => setItemsPerBox(e.target.value)}
                      placeholder="Or enter custom amount..."
                      className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl mb-4 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-all"
                    />
                    
                    {boxCount && itemsPerBox && (
                      <div className="bg-emerald-50 p-3 rounded-xl mb-4 border border-emerald-200">
                        <span className="font-semibold text-emerald-800">Total: {parseInt(boxCount) * parseInt(itemsPerBox)} items</span>
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <button
                        onClick={handleBoxCount}
                        className="flex-1 bg-slate-800 text-white px-6 py-3 rounded-lg hover:bg-slate-700 font-semibold transition-colors"
                      >
                        Add to Count
                      </button>
                      <button
                        onClick={() => {
                          setCurrentProduct(null);
                          setBoxCount('');
                          setItemsPerBox('');
                        }}
                        className="bg-slate-200 text-slate-700 px-6 py-3 rounded-lg hover:bg-slate-300 font-semibold transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {currentMode === 'manual' && (
            <>
              <BackToScanButton />
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-slate-800 mb-4">Manual Entry</h2>
                <div>
                  <label className="block text-slate-700 mb-2">Barcode</label>
                  <input
                    type="text"
                    value={manualBarcode}
                    onChange={(e) => setManualBarcode(e.target.value)}
                    placeholder="Enter barcode..."
                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl mb-4 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-all"
                    autoFocus
                  />

                  <label className="block text-slate-700 mb-2">Product Name</label>
                  <input
                    type="text"
                    value={manualProduct}
                    onChange={(e) => setManualProduct(e.target.value)}
                    placeholder="Enter product name..."
                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl mb-4 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-all"
                  />

                  <label className="block text-slate-700 mb-2">Quantity</label>
                  <input
                    type="number"
                    step="0.01"
                    value={quantityInput}
                    onChange={(e) => setQuantityInput(e.target.value)}
                    placeholder="Enter quantity..."
                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl mb-4 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-all"
                  />

                  <button
                    onClick={handleManualEntry}
                    className="w-full bg-slate-800 text-white px-6 py-3 rounded-lg hover:bg-slate-700 font-semibold transition-colors"
                  >
                    Add Manual Entry
                  </button>
                </div>
              </div>
            </>
          )}

          {currentMode === 'kegs' && (
            <>
              <BackToScanButton />
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Package size={24} className="text-indigo-600" /> Keg & Beverage Counter
                  </h2>
                  <button
                    onClick={() => kegFileInputRef.current?.click()}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 font-medium text-sm shadow-sm"
                  >
                    <Upload size={16} /> {kegProducts.length > 0 ? 'Change List' : 'Upload List'}
                  </button>
                  <input
                    ref={kegFileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleKegFileUpload}
                    className="hidden"
                  />
                </div>

                {kegProducts.length === 0 && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6 text-center">
                    <Package size={48} className="mx-auto text-indigo-400 mb-3" />
                    <p className="text-indigo-900 font-semibold mb-2">No keg list uploaded</p>
                    <p className="text-indigo-700 text-sm mb-4">Upload an Excel file with product names in the first column</p>
                    <button
                      onClick={() => kegFileInputRef.current?.click()}
                      className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-sm"
                    >
                      Upload Keg List
                    </button>
                  </div>
                )}

                {editingKeg && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl p-6 max-w-md w-full">
                      <h3 className="text-lg font-semibold text-slate-800 mb-4">{editingKeg}</h3>
                      <p className="text-sm text-slate-600 mb-4">
                        {showKegAddReplace && `Current count: ${kegCounts[editingKeg]}`}
                      </p>

                      <label className="block text-slate-700 mb-2">Enter Quantity</label>
                      <input
                        type="number"
                        step="0.01"
                        value={kegInputValue}
                        onChange={(e) => setKegInputValue(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !showKegAddReplace) {
                            handleKegSave('replace');
                          }
                        }}
                        placeholder="Enter quantity..."
                        className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl mb-4 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                        autoFocus
                      />

                      <div className="flex gap-2">
                        {showKegAddReplace ? (
                          <>
                            <button
                              onClick={() => handleKegSave('add')}
                              className="flex-1 bg-emerald-600 text-white px-4 py-3 rounded-lg hover:bg-emerald-700 font-semibold transition-colors"
                            >
                              Add (+)
                            </button>
                            <button
                              onClick={() => handleKegSave('replace')}
                              className="flex-1 bg-amber-600 text-white px-4 py-3 rounded-lg hover:bg-amber-700 font-semibold transition-colors"
                            >
                              Replace
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleKegSave('replace')}
                            className="flex-1 bg-amber-600 text-white px-4 py-3 rounded-lg hover:bg-amber-700 font-semibold transition-colors"
                          >
                            Save
                          </button>
                        )}
                        <button
                          onClick={handleKegCancel}
                          className="bg-slate-200 text-slate-700 px-4 py-3 rounded-lg hover:bg-slate-300 font-semibold transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {kegProducts.length > 0 && (
                  <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                    <div className="max-h-96 overflow-y-auto">
                      <table className="w-full">
                        <thead className="bg-gradient-to-r from-indigo-50 to-blue-50 sticky top-0">
                          <tr>
                            <th className="text-left px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Product</th>
                            <th className="text-right px-4 py-3 font-semibold text-gray-700 border-b border-gray-200 w-24">Count</th>
                          </tr>
                        </thead>
                        <tbody>
                          {kegProducts.map((product, idx) => {
                            const count = kegCounts[product] || 0;
                            return (
                              <tr
                                key={idx}
                                onClick={() => handleKegClick(product)}
                                className="hover:bg-indigo-50 cursor-pointer border-b border-gray-100 transition-colors"
                              >
                                <td className="px-4 py-3 text-gray-700 font-medium">{product}</td>
                                <td className="px-4 py-3 text-right font-bold text-gray-900">
                                  {count > 0 ? count : <span className="text-gray-400">-</span>}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {currentProduct && currentMode === 'scan' && (
            <div className="mb-6 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border-2 border-blue-200 shadow-sm">
              <div className="mb-4">
                {currentProduct.product ? (
                  <>
                    <div className="text-lg font-bold text-gray-900">{currentProduct.product}</div>
                    <div className="text-sm text-gray-600 font-medium">Barcode: {currentProduct.barcode}</div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm font-semibold">
                        Unknown Barcode
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 font-medium mb-3">Barcode: {currentProduct.barcode}</div>
                    <label className="block text-gray-700 font-semibold mb-2">Product Name</label>
                    <input
                      type="text"
                      value={unknownProductName}
                      onChange={(e) => setUnknownProductName(e.target.value)}
                      placeholder="Enter product name..."
                      className="w-full px-4 py-3 text-lg border-2 border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 mb-3 transition-all bg-white"
                      autoFocus
                    />
                  </>
                )}
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">Quantity</label>
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
                  className="w-full px-4 py-3 text-xl border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 mb-3 transition-all"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleQuantitySubmit}
                    className="flex-1 bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 font-semibold transition-all shadow-sm"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => {
                      setCurrentProduct(null);
                      setQuantityInput('');
                      setUnknownProductName('');
                    }}
                    className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 font-semibold transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {scannedItems.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 border border-slate-200">
            <h2 className="text-xl font-semibold text-slate-800 mb-4">Scanned Items ({scannedItems.length})</h2>
            <div className="space-y-2">
              {scannedItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex-1">
                    <div className="font-semibold text-slate-800">{item.product}</div>
                    <div className="text-sm text-slate-500">{item.barcode}</div>
                    {item.note && <div className="text-xs text-slate-600 mt-1">{item.note}</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    {editingIndex === `scanned-${idx}` ? (
                      <>
                        <input
                          type="number"
                          step="0.01"
                          value={editQuantity}
                          onChange={(e) => setEditQuantity(e.target.value)}
                          className="w-24 px-2 py-1 border-2 border-slate-300 rounded-lg"
                        />
                        <button
                          onClick={() => saveEdit(idx, false)}
                          className="bg-emerald-600 text-white px-3 py-1 rounded-lg hover:bg-emerald-700 transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingIndex(null)}
                          className="bg-slate-300 text-slate-700 px-3 py-1 rounded-lg hover:bg-slate-400 transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="font-bold text-lg text-slate-800">{item.quantity}</span>
                        <button
                          onClick={() => startEdit(idx, item.quantity, false)}
                          className="text-slate-600 hover:text-slate-800 transition-colors"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => deleteEntry(idx, false)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {manualEntries.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-slate-200">
            <h2 className="text-xl font-semibold text-slate-800 mb-4">Manual Entries ({manualEntries.length})</h2>
            <div className="space-y-2">
              {manualEntries.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="flex-1">
                    <div className="font-semibold text-slate-800">{item.product}</div>
                    <div className="text-sm text-slate-500">{item.barcode}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {editingIndex === `manual-${idx}` ? (
                      <>
                        <input
                          type="number"
                          step="0.01"
                          value={editQuantity}
                          onChange={(e) => setEditQuantity(e.target.value)}
                          className="w-24 px-2 py-1 border-2 border-slate-300 rounded-lg"
                        />
                        <button
                          onClick={() => saveEdit(idx, true)}
                          className="bg-emerald-600 text-white px-3 py-1 rounded-lg hover:bg-emerald-700 transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingIndex(null)}
                          className="bg-slate-300 text-slate-700 px-3 py-1 rounded-lg hover:bg-slate-400 transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="font-bold text-lg text-slate-800">{item.quantity}</span>
                        <button
                          onClick={() => startEdit(idx, item.quantity, true)}
                          className="text-slate-600 hover:text-slate-800 transition-colors"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => deleteEntry(idx, true)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </>
                    )}
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
                        