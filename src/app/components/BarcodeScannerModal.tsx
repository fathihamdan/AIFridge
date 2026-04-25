import { useState } from 'react';
import { X, Scan } from 'lucide-react';

interface BarcodeScannerModalProps {
  onClose: () => void;
  onResult: (barcode: string, productName: string) => void;
}

// Mock barcode database
const BARCODE_DATABASE: Record<string, string> = {
  '123456789': 'Organic Milk',
  '987654321': 'Free Range Eggs',
  '555555555': 'Whole Wheat Bread',
  '111111111': 'Greek Yogurt',
  '222222222': 'Cheddar Cheese',
};

export function BarcodeScannerModal({ onClose, onResult }: BarcodeScannerModalProps) {
  const [manualBarcode, setManualBarcode] = useState('');
  const [scanning, setScanning] = useState(false);

  const handleManualEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBarcode) return;

    const productName = BARCODE_DATABASE[manualBarcode] || 'Unknown Product';
    onResult(manualBarcode, productName);
  };

  const simulateScan = () => {
    setScanning(true);
    
    // Simulate barcode scanning delay
    setTimeout(() => {
      const barcodes = Object.keys(BARCODE_DATABASE);
      const randomBarcode = barcodes[Math.floor(Math.random() * barcodes.length)];
      const productName = BARCODE_DATABASE[randomBarcode];
      
      setScanning(false);
      onResult(randomBarcode, productName);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center">
      <div className="w-full max-w-md mx-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-gray-900 dark:text-white">Scan Barcode</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          <div className="p-6">
            {/* Camera Preview Placeholder */}
            <div className="relative aspect-square bg-gray-900 rounded-lg mb-4 overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                {scanning ? (
                  <div className="text-center">
                    <div className="animate-pulse mb-4">
                      <Scan className="w-16 h-16 text-[#007057] mx-auto" />
                    </div>
                    <p className="text-white">Scanning...</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <Scan className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-400">Position barcode within frame</p>
                  </div>
                )}
              </div>

              {/* Scanning Frame */}
              <div className="absolute inset-8 border-2 border-blue-500 rounded-lg">
                {scanning && (
                  <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-blue-500 animate-pulse"></div>
                )}
              </div>
            </div>

            <button
              onClick={simulateScan}
              disabled={scanning}
              className="w-full py-3 bg-[#007057] hover:bg-[#005a45] disabled:bg-gray-400 text-white rounded-lg transition-colors mb-4"
            >
              {scanning ? 'Scanning...' : 'Simulate Scan'}
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="px-2 bg-white dark:bg-gray-800 text-sm text-gray-500 dark:text-gray-400">
                  or enter manually
                </span>
              </div>
            </div>

            <form onSubmit={handleManualEntry} className="space-y-3">
              <input
                type="text"
                placeholder="Enter barcode number"
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
              />
              <button
                type="submit"
                className="w-full py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors"
              >
                Submit
              </button>
            </form>

            <div className="mt-4 p-3 bg-[#007057]/10 dark:bg-[#007057]/20 rounded-lg">
              <p className="text-xs text-[#007057]">
                Try these test barcodes: 123456789, 987654321, 555555555
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}