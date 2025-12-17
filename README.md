# Stock Wizard - Inventory Counter

A React-based stock counting application with barcode scanning, manual entry, box counting, and keg tracking features.

## Features

- **Barcode Scanning**: Quick product lookup via barcode scanner
- **Search**: Find products by name or barcode
- **Manual Entry**: Add custom products not in the database
- **Box Counting**: Calculate totals from boxes × items per box
- **Keg Counter**: Predefined list of 47+ kegs and beverages
- **Addition Mode**: Automatically add quantities to existing entries
- **Excel Import/Export**: Upload product database and export counts

## Development

Install dependencies:
```bash
npm install
```

Run development server:
```bash
npm run dev
```

Build for production:
```bash
npm run build
```

## GitHub Pages

This project is automatically deployed to GitHub Pages when you push to the main or `claude/fork-stock-counter-IWQap` branch.

Live URL: https://tmor104.github.io/stock/

## Usage

1. Upload your product database (Excel file with barcode and product columns)
2. Enable "Addition Mode" to automatically sum quantities for the same product
3. Use the "Kegs" button for quick access to predefined keg products
4. Export your counts to Excel when finished
