import { useState } from 'react';
import { X, Scan, Search, TrendingUp, Receipt } from 'lucide-react';
import { FridgeItem } from '../App';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { ReceiptScannerModal } from './ReceiptScannerModal';

interface AddItemModalProps {
  onClose: () => void;
  onAdd: (item: Omit<FridgeItem, 'id' | 'addedDate'>) => void;
}

const SUGGESTED_ITEMS = [
  { name: 'Milk', category: 'Dairy', unit: 'L', defaultQty: 1 },
  { name: 'Eggs', category: 'Dairy', unit: 'pcs', defaultQty: 12 },
  { name: 'Bread', category: 'Bakery', unit: 'loaf', defaultQty: 1 },
  { name: 'Chicken Breast', category: 'Meat', unit: 'g', defaultQty: 500 },
  { name: 'Tomatoes', category: 'Vegetables', unit: 'pcs', defaultQty: 4 },
  { name: 'Lettuce', category: 'Vegetables', unit: 'head', defaultQty: 1 },
  { name: 'Cheese', category: 'Dairy', unit: 'g', defaultQty: 250 },
  { name: 'Yogurt', category: 'Dairy', unit: 'g', defaultQty: 500 },
  { name: 'Orange Juice', category: 'Beverages', unit: 'L', defaultQty: 1 },
  { name: 'Apples', category: 'Fruits', unit: 'pcs', defaultQty: 6 },
];

type AddMethod = 'manual' | 'search' | 'suggestions';

export function AddItemModal({ onClose, onAdd }: AddItemModalProps) {
  const [method, setMethod] = useState<AddMethod>('suggestions');
  const [showScanner, setShowScanner] = useState(false);
  const [showReceiptScanner, setShowReceiptScanner] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    category: 'Dairy',
    quantity: 1,
    unit: 'pcs',
    expiryDate: '',
  });

  const categories = ['Dairy', 'Meat', 'Vegetables', 'Fruits', 'Bakery', 'Beverages', 'Other'];
  const units = ['pcs', 'g', 'kg', 'L', 'ml', 'oz', 'lb'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.expiryDate) return;

    onAdd({
      name: formData.name,
      category: formData.category,
      quantity: formData.quantity,
      unit: formData.unit,
      expiryDate: formData.expiryDate,
    });
    onClose();
  };

  const handleSuggestedItemClick = (item: typeof SUGGESTED_ITEMS[0]) => {
    const defaultExpiry = new Date();
    defaultExpiry.setDate(defaultExpiry.getDate() + 7);
    
    setFormData({
      name: item.name,
      category: item.category,
      quantity: item.defaultQty,
      unit: item.unit,
      expiryDate: defaultExpiry.toISOString().split('T')[0],
    });
    setMethod('manual');
  };

  const handleBarcodeResult = (barcode: string, productName: string) => {
    const defaultExpiry = new Date();
    defaultExpiry.setDate(defaultExpiry.getDate() + 7);

    setFormData({
      ...formData,
      name: productName,
      expiryDate: defaultExpiry.toISOString().split('T')[0],
    });
    setShowScanner(false);
    setMethod('manual');
  };

  const handleReceiptItems = (items: Omit<FridgeItem, 'id' | 'addedDate'>[]) => {
    items.forEach(item => onAdd(item));
    setShowReceiptScanner(false);
    onClose();
  };

  const filteredSuggestions = SUGGESTED_ITEMS.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
        <div className="bg-white dark:bg-gray-800 w-full sm:max-w-lg sm:rounded-lg rounded-t-2xl max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
            <h2 className="text-gray-900 dark:text-white">Add Item</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          <div className="p-4">
            {/* Add Method Selector */}
            {method === 'suggestions' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setShowScanner(true)}
                    className="p-4 bg-[#007057]/10 dark:bg-[#007057]/20 border-2 border-[#007057]/30 dark:border-[#007057]/40 rounded-lg hover:bg-[#007057]/20 dark:hover:bg-[#007057]/30 transition-colors"
                  >
                    <Scan className="w-8 h-8 text-[#007057] mx-auto mb-2" />
                    <p className="text-sm text-[#007057]">Scan Barcode</p>
                  </button>
                  <button
                    onClick={() => setShowReceiptScanner(true)}
                    className="p-4 bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-200 dark:border-purple-800 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
                  >
                    <Receipt className="w-8 h-8 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
                    <p className="text-sm text-purple-900 dark:text-purple-100">Scan Receipt</p>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setMethod('search')}
                    className="p-4 bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                  >
                    <Search className="w-8 h-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
                    <p className="text-sm text-green-900 dark:text-green-100">Search Items</p>
                  </button>
                  <button
                    onClick={() => setMethod('manual')}
                    className="p-4 bg-gray-100 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    <TrendingUp className="w-8 h-8 text-gray-600 dark:text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-900 dark:text-gray-100">Enter Manually</p>
                  </button>
                </div>

                <div>
                  <h3 className="text-gray-900 dark:text-white mb-3">Popular Items</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {SUGGESTED_ITEMS.slice(0, 6).map((item, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestedItemClick(item)}
                        className="p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-left"
                      >
                        <p className="text-gray-900 dark:text-white">{item.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{item.category}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Search Method */}
            {method === 'search' && (
              <div className="space-y-4">
                <button
                  onClick={() => setMethod('suggestions')}
                  className="text-blue-600 dark:text-blue-400 text-sm"
                >
                  ← Back
                </button>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search for items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    autoFocus
                  />
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredSuggestions.map((item, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestedItemClick(item)}
                      className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-left"
                    >
                      <p className="text-gray-900 dark:text-white">{item.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {item.category} • {item.defaultQty} {item.unit}
                      </p>
                    </button>
                  ))}
                  {filteredSuggestions.length === 0 && (
                    <p className="text-center py-8 text-gray-500 dark:text-gray-400">
                      No items found
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Manual Entry Form */}
            {method === 'manual' && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <button
                  type="button"
                  onClick={() => setMethod('suggestions')}
                  className="text-blue-600 dark:text-blue-400 text-sm"
                >
                  ← Back
                </button>

                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                    Item Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                      min="0.1"
                      step="0.1"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                      Unit
                    </label>
                    <select
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                    >
                      {units.map(unit => (
                        <option key={unit} value={unit}>{unit}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-[#007057] hover:bg-[#005a45] text-white rounded-lg transition-colors"
                >
                  Add to Fridge
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {showScanner && (
        <BarcodeScannerModal
          onClose={() => setShowScanner(false)}
          onResult={handleBarcodeResult}
        />
      )}

      {showReceiptScanner && (
        <ReceiptScannerModal
          onClose={() => setShowReceiptScanner(false)}
          onAddItems={handleReceiptItems}
        />
      )}
    </>
  );
}