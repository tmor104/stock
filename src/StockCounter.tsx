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

const KEG_PRODUCTS = [
  'Barline XPA Keg 49.5L',
  'Brookvale Union Ginger Beer Keg 49.5L',
  'Fixation IPA Keg 49.5L',
  'Great Northern Sugar Cane 3.5% Keg 49.5L',
  'Great Northern Light Keg 49.5L',
  'Hahn Super Dry 3.5% Keg 49.5L',
  'Hahn Premium Light Keg 49.5L',
  'James Squire Pale Ale Keg 49.5L',
  'James Squire One Fifty Lashes Pale Ale Keg 49.5L',
  'Rescoratio Pale Ale Keg 49.5L',
  'Little Creatures Pale Ale Keg 49.5L',
  'Little Creatures Rogers Keg 49.5L',
  'Stone & Wood Pacific Ale 49.5L',
  'Tooheys New Keg 49.5L',
  'White Rabbit Dark Ale Keg 49.5L',
  'XXXX Gold 49.5L',
  'Guinness Draught 49.5L',
  'Heineken Pale Ale 50L',
  'Kirrin Hoisan 49.5L',
  'Batch No 9 Tank Per 1L',
  'Batch Apple Cider Tank Per 1L Keg',
  'Your Mates Larry Case Ale 49.5L',
  'Young Henrys Pale Ale 49.5L',
  'Hard Ballad (Solo) 49.5L Keg',
  'Canadian Club & Dry Keg 49.5L',
  'Stone & Wood Hinterland Hazy 49.5L',
  'Yullis Lager 49.5L',
  'Stone & Wood Rotator 49.5L',
  'Tooheys Extra Dry Keg',
  'Hard Ballad Orange 49.5L',
  'XXXX Summer Bright Lager',
  'Stone & Wood Easy Day Pale Ale 49.5L',
  'Moon Dog Fizzer Hard Cream Soda Cider Keg 49.5L',
  'Moon Dog Fizzer Hard Cranberry Soda (Per Litre)',
  'Moon Dog Fizzer Hard Passionfruit (Per Litre)',
  'Moon Dog Fizzer Hard Peach Iced Tea (Per Litre)',
  'Moon Dog Fizzer Hard Lemon (Per Litre)',
  'Moon Dog Fizzer Hard Guava (Per Litre)',
  'Coffee',
  'Tea (per 50 bags)',
  'Choc Powder',
  'Decaf',
  'Chai Powder',
  'St Remio Syrup',
  'Bulk Post-Mix'
];

export default function StockCounter() {
  const [productDatabase, setProductDatabase] = useState<Product[]>([]);
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

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const product = productDatabase.find(p => p.barcode.toString() === barcodeInput.trim());
    
    if (product) {
      setCurrentProduct(product);
      setBarcodeInput('');
      setTimeout(() => quantityInputRef.current?.focus(), 100);
    } else {
      setCurrentProduct({ barcode: barcodeInput, product: 'UNKNOWN - Manual Entry Required' });
      setBarcodeInput('');
      setTimeout(() => quantityInputRef.current?.focus(), 100);
    }
  };

  const handleQuantitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quantityInput || !currentProduct) return;

    const qty = parseFloat(quantityInput);
    if (isNaN(qty) || qty <= 0) {
      alert('Please enter a valid quantity');
      return;
    }

    const entry = {
      barcode: currentProduct.barcode,
      product: currentProduct.product,
      quantity: qty,
      timestamp: new Date().toLocaleString()
    };

    if (currentProduct.product === 'UNKNOWN - Manual Entry Required') {
      setManualEntries(prev => [entry, ...prev]);
    } else {
      setScannedItems(prev => [entry, ...prev]);
    }

    setCurrentProduct(null);
    setQuantityInput('');
    setBarcodeInput('');
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 border border-slate-200">
          <h1 className="text-3xl font-bold text-slate-800 mb-6">📦 Stock Wizard</h1>
          
          {productDatabase.length === 0 && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-amber-900 mb-3 font-medium">Please upload your product database first</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-2"
              >
                <Upload size={20} /> Upload Excel File
              </button>
            </div>
          )}

          {productDatabase.length > 0 && (
            <div className="mb-6">
              <div className="flex gap-2 flex-wrap mb-4">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-slate-600 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-2"
                >
                  <Upload size={18} /> Change Database
                </button>
                <button
                  onClick={exportToExcel}
                  disabled={scannedItems.length === 0 && manualEntries.length === 0}
                  className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
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
                <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <Package size={24} className="text-amber-600" /> Keg & Beverage Counter
                </h2>

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

                <div className="border-2 border-slate-200 rounded-xl overflow-hidden">
                  <div className="max-h-96 overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-slate-100 sticky top-0">
                        <tr>
                          <th className="text-left px-4 py-3 font-semibold text-slate-700 border-b-2 border-slate-200">Product</th>
                          <th className="text-right px-4 py-3 font-semibold text-slate-700 border-b-2 border-slate-200 w-24">Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {KEG_PRODUCTS.map((product, idx) => {
                          const count = kegCounts[product] || 0;
                          return (
                            <tr
                              key={idx}
                              onClick={() => handleKegClick(product)}
                              className="hover:bg-amber-50 cursor-pointer border-b border-slate-100 transition-colors"
                            >
                              <td className="px-4 py-3 text-slate-700">{product}</td>
                              <td className="px-4 py-3 text-right font-semibold text-slate-800">
                                {count > 0 ? count : '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}

          {currentProduct && currentMode === 'scan' && (
            <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="mb-4">
                <div className="text-lg font-semibold text-slate-800">{currentProduct.product}</div>
                <div className="text-sm text-slate-500">{currentProduct.barcode}</div>
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
                        