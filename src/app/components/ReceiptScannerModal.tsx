import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Camera, Upload, Check, RotateCcw, ZapOff } from 'lucide-react';
import { FridgeItem } from '../App';

interface ReceiptScannerModalProps {
  onClose: () => void;
  onAddItems: (items: Omit<FridgeItem, 'id' | 'addedDate'>[]) => void;
}

interface ScannedItem {
  name: string;
  category: string;
  quantity: number;
  unit: string;
  selected: boolean;
  expiryDays: number; // AI-predicted days until expiry from today
}

type Mode = 'choose' | 'camera' | 'scanning' | 'results';

const CATEGORY_EXPIRY_DAYS: Record<string, number> = {
  Dairy: 7,
  Meat: 3,
  Vegetables: 5,
  Fruits: 7,
  Bakery: 5,
  Beverages: 30,
  Frozen: 90,
  Condiments: 60,
  Snacks: 14,
  Other: 7,
};

export function ReceiptScannerModal({ onClose, onAddItems }: ReceiptScannerModalProps) {
  const [mode, setMode] = useState<Mode>('choose');
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  // Once the camera <video> element is in the DOM, attach the stream
  useEffect(() => {
    if (mode === 'camera' && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [mode]);

  // Start webcam stream — set mode first so <video> mounts, then useEffect above attaches the stream
  const startCamera = useCallback(async () => {
    setCameraError(null);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      setMode('camera'); // triggers render → useEffect assigns srcObject
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('Permission') || msg.includes('NotAllowed')) {
        setCameraError('Camera permission denied. Please allow camera access in your browser and try again.');
      } else if (msg.includes('NotFound') || msg.includes('DevicesNotFound')) {
        setCameraError('No camera found on this device.');
      } else {
        setCameraError(`Could not access camera: ${msg}`);
      }
    }
  }, []);

  // Stop webcam stream
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const scanReceiptWithAI = async (imageBase64: string, mimeType: string): Promise<ScannedItem[]> => {
    const OPENROUTER_API_KEY = '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';
    const MODEL = 'google/gemini-2.0-flash-001'; // vision-capable model; swap freely on openrouter.ai/models

    const prompt = `You are a smart receipt scanner and food expiry expert. The user will provide a photo of a grocery receipt.
Extract all food and grocery items from the receipt.
Respond ONLY with a valid JSON array (no markdown, no extra text) of item objects.
Each item object must have exactly these fields:
{
  "name": "Item Name",
  "category": "one of: Dairy, Meat, Vegetables, Fruits, Bakery, Beverages, Frozen, Condiments, Snacks, Other",
  "quantity": <number>,
  "unit": "appropriate unit: pcs, g, kg, L, ml, loaf, pack, box, can, bottle, bag, bunch, etc.",
  "selected": false,
  "expiryDays": <number of days from today until this item typically expires when stored properly at home>
}
For expiryDays, use realistic estimates based on the specific item name — not just the category. Examples:
- Fresh bread / loaf: 7
- Sliced sandwich bread (packaged): 10
- Whole milk: 7
- UHT/long-life milk: 90
- Fresh chicken breast: 2
- Ground beef: 2
- Cheddar cheese (block): 30
- Yogurt: 14
- Fresh spinach: 5
- Broccoli: 5
- Apples: 14
- Bananas: 5
- Orange juice (fresh): 7
- Orange juice (carton, pasteurized): 14
- Eggs: 21
- Butter: 30
- Frozen pizza: 90
- Ketchup: 180
- Potato chips: 30
- Crackers: 60
Infer reasonable quantities and units from the receipt or default to 1 pcs.
Respond ONLY with the JSON array, nothing else.`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120_000); // 2 minutes

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2000,
        messages: [
          { role: 'system', content: prompt },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: `data:${mimeType};base64,${imageBase64}` },
              },
              {
                type: 'text',
                text: 'Please scan this grocery receipt and extract all items as JSON.',
              },
            ],
          },
        ],
      }),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const rawText = data.choices?.[0]?.message?.content ?? '';
    const cleaned = rawText.replace(/```json|```/g, '').trim();
    const parsed: ScannedItem[] = JSON.parse(cleaned);
    return parsed.map(item => ({
      ...item,
      selected: false,
      expiryDays: typeof item.expiryDays === 'number' && item.expiryDays > 0
        ? item.expiryDays
        : (CATEGORY_EXPIRY_DAYS[item.category] ?? 7),
    }));
  };

  const sendToAI = async (base64: string, mimeType: string, preview: string) => {
    setPreviewUrl(preview);
    setMode('scanning');
    setError(null);
    try {
      const items = await scanReceiptWithAI(base64, mimeType);
      setScannedItems(items);
      setMode('results');
    } catch (err) {
      console.error('Receipt scan error:', err);
      setError(err instanceof Error ? `Failed to scan: ${err.message}` : 'Failed to scan receipt. Please try again.');
      setMode('choose');
      setPreviewUrl(null);
    }
  };

  // Capture frame from live webcam
  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    const base64 = dataUrl.split(',')[1];

    stopCamera();
    sendToAI(base64, 'image/jpeg', dataUrl);
  };

  // Handle file upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !file.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }

    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });

    const preview = URL.createObjectURL(file);
    sendToAI(base64, file.type, preview);
  };

  const toggleItemSelection = (index: number) => {
    setScannedItems(prev => prev.map((item, i) => i === index ? { ...item, selected: !item.selected } : item));
  };

  const selectAll = () => setScannedItems(prev => prev.map(item => ({ ...item, selected: true })));
  const deselectAll = () => setScannedItems(prev => prev.map(item => ({ ...item, selected: false })));

  const handleAddSelected = () => {
    const selectedItems = scannedItems.filter(item => item.selected);
    if (selectedItems.length === 0) { setError('Please select at least one item.'); return; }

    onAddItems(selectedItems.map(item => {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + item.expiryDays);
      return {
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
        expiryDate: expiry.toISOString().split('T')[0],
      };
    }));
    onClose();
  };

  const handleReset = () => {
    stopCamera();
    setMode('choose');
    setScannedItems([]);
    setPreviewUrl(null);
    setError(null);
    setCameraError(null);
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  const selectedCount = scannedItems.filter(item => item.selected).length;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <input ref={uploadInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      <canvas ref={canvasRef} className="hidden" />

      <div className="bg-white dark:bg-gray-800 w-full sm:max-w-2xl sm:rounded-lg rounded-t-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between z-10">
          <h2 className="text-gray-900 dark:text-white">Scan Receipt</h2>
          <button onClick={handleClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-4">

          {/* ── CHOOSE MODE ── */}
          {mode === 'choose' && (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  <strong>How it works:</strong> Point your camera at a grocery receipt or upload a photo.
                  OpenRouter will read and extract all items automatically.
                </p>
              </div>

              {cameraError && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex gap-3 items-start">
                  <ZapOff className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 dark:text-red-300">{cameraError}</p>
                </div>
              )}

              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={startCamera}
                  className="p-8 bg-[#007057]/10 dark:bg-[#007057]/20 border-2 border-[#007057]/30 dark:border-[#007057]/40 rounded-lg hover:bg-[#007057]/20 dark:hover:bg-[#007057]/30 transition-colors"
                >
                  <Camera className="w-12 h-12 text-[#007057] mx-auto mb-3" />
                  <p className="text-gray-900 dark:text-white mb-1">Use Camera</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Live webcam viewfinder</p>
                </button>

                <button
                  onClick={() => uploadInputRef.current?.click()}
                  className="p-8 bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                >
                  <Upload className="w-12 h-12 text-green-600 dark:text-green-400 mx-auto mb-3" />
                  <p className="text-gray-900 dark:text-white mb-1">Upload Image</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Choose from your files</p>
                </button>
              </div>
            </div>
          )}

          {/* ── LIVE CAMERA ── */}
          {mode === 'camera' && (
            <div className="space-y-4">
              <div className="relative rounded-xl overflow-hidden bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full max-h-[50vh] object-contain"
                />
                {/* Receipt alignment overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div
                    className="border-2 border-white/70 rounded-lg w-4/5 h-3/4"
                    style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)' }}
                  />
                </div>
                <p className="absolute bottom-3 left-0 right-0 text-center text-white/80 text-xs">
                  Align the receipt inside the frame
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleReset}
                  className="flex-1 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCapture}
                  className="flex-[2] py-3 bg-[#007057] hover:bg-[#005a45] text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <Camera className="w-5 h-5" />
                  Capture Receipt
                </button>
              </div>
            </div>
          )}

          {/* ── SCANNING / LOADING ── */}
          {mode === 'scanning' && (
            <div className="space-y-4">
              {previewUrl && (
                <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                  <img src={previewUrl} alt="Receipt preview" className="w-full max-h-48 object-contain bg-gray-50 dark:bg-gray-900" />
                </div>
              )}
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-[#007057] mb-4" />
                <p className="text-gray-600 dark:text-gray-400 font-medium">Scanning receipt...</p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">OpenRouter is reading your receipt</p>
              </div>
            </div>
          )}

          {/* ── RESULTS ── */}
          {mode === 'results' && (
            <div className="space-y-4">
              {previewUrl && (
                <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                  <img src={previewUrl} alt="Scanned receipt" className="w-full max-h-32 object-contain bg-gray-50 dark:bg-gray-900" />
                </div>
              )}

              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <p className="text-sm text-green-900 dark:text-green-100">
                  ✓ Found {scannedItems.length} item{scannedItems.length !== 1 ? 's' : ''}! Select what you want to add to your fridge.
                </p>
              </div>

              <div className="flex gap-2">
                <button onClick={selectAll} className="flex-1 py-2 px-4 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/40 transition-colors text-sm">
                  Select All
                </button>
                <button onClick={deselectAll} className="flex-1 py-2 px-4 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm">
                  Deselect All
                </button>
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
              )}

              <div className="space-y-2 max-h-80 overflow-y-auto">
                {scannedItems.map((item, index) => (
                  <div
                    key={index}
                    onClick={() => toggleItemSelection(index)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      item.selected
                        ? 'bg-[#007057]/10 dark:bg-[#007057]/20 border-[#007057]'
                        : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${item.selected ? 'bg-[#007057] border-[#007057]' : 'border-gray-300 dark:border-gray-500'}`}>
                        {item.selected && <Check className="w-4 h-4 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-900 dark:text-white font-medium">{item.name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{item.quantity} {item.unit} · {item.category}</p>
                        <p className="text-xs mt-0.5">
                          <span className={`font-medium ${item.expiryDays <= 3 ? 'text-red-500' : item.expiryDays <= 7 ? 'text-amber-500' : 'text-[#007057] dark:text-emerald-400'}`}>
                            🗓 Expires in {item.expiryDays} day{item.expiryDays !== 1 ? 's' : ''} · {(() => { const d = new Date(); d.setDate(d.getDate() + item.expiryDays); return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); })()}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button onClick={handleReset} className="flex items-center gap-2 flex-1 justify-center py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                  <RotateCcw className="w-4 h-4" />
                  Scan Again
                </button>
                <button
                  onClick={handleAddSelected}
                  disabled={selectedCount === 0}
                  className="flex-1 py-3 bg-[#007057] hover:bg-[#005a45] disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
                >
                  Add {selectedCount > 0 ? `${selectedCount} ` : ''}Selected
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
