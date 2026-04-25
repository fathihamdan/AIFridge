import { useState } from 'react';
import { Plus, Search, Trash2, AlertCircle } from 'lucide-react';
import { FridgeItem } from '../App';
import { AddItemModal } from './AddItemModal';

interface FridgeScreenProps {
  items: FridgeItem[];
  onAddItem: (item: Omit<FridgeItem, 'id' | 'addedDate'>) => void;
  onRemoveItem: (id: string) => void;
  onUpdateItem: (id: string, updates: Partial<FridgeItem>) => void;
}

export function FridgeScreen({ items, onAddItem, onRemoveItem }: FridgeScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = ['All', ...Array.from(new Set(items.map(item => item.category)))];

  const getDaysUntilExpiry = (expiryDate: string): number => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getExpiryStatus = (expiryDate: string): 'expired' | 'warning' | 'good' => {
    const days = getDaysUntilExpiry(expiryDate);
    if (days < 0) return 'expired';
    if (days <= 3) return 'warning';
    return 'good';
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const expiringItems = items.filter(item => {
    const days = getDaysUntilExpiry(item.expiryDate);
    return days >= 0 && days <= 3;
  });

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-gray-900 dark:text-white mb-2">My Fridge</h1>
        <p className="text-gray-600 dark:text-gray-400">
          {items.length} items stored
        </p>
      </div>

      {expiringItems.length > 0 && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-red-900 dark:text-red-100">
                {expiringItems.length} item{expiringItems.length > 1 ? 's' : ''} expiring soon
              </p>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                {expiringItems.map(item => item.name).join(', ')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search ingredients..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
        />
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        {categories.map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
              selectedCategory === category
                ? 'bg-[#007057] text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Add Item Button */}
      <button
        onClick={() => setShowAddModal(true)}
        className="w-full mb-4 py-3 bg-[#007057] hover:bg-[#005a45] text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
      >
        <Plus className="w-5 h-5" />
        Add Item
      </button>

      {/* Items List */}
      <div className="space-y-3">
        {filteredItems.map(item => {
          const status = getExpiryStatus(item.expiryDate);
          const daysUntil = getDaysUntilExpiry(item.expiryDate);

          return (
            <div
              key={item.id}
              className={`p-4 rounded-lg border ${
                status === 'expired'
                  ? 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                  : status === 'warning'
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-gray-900 dark:text-white">{item.name}</h3>
                    {status === 'warning' && (
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {item.quantity} {item.unit} • {item.category}
                  </p>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        status === 'expired'
                          ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                          : status === 'warning'
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                          : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                      }`}
                    >
                      {status === 'expired'
                        ? 'Expired'
                        : daysUntil === 0
                        ? 'Expires today'
                        : daysUntil === 1
                        ? 'Expires tomorrow'
                        : `${daysUntil} days left`}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => onRemoveItem(item.id)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <Trash2 className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
            </div>
          );
        })}

        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">No items found</p>
          </div>
        )}
      </div>

      {showAddModal && (
        <AddItemModal
          onClose={() => setShowAddModal(false)}
          onAdd={onAddItem}
        />
      )}
    </div>
  );
}