import { useState, useRef, useEffect } from 'react';
import { ChefHat, Clock, Users, Heart, Send, Bot } from 'lucide-react';
import { FridgeItem } from '../App';

interface RecipesScreenProps {
  fridgeItems: FridgeItem[];
  onUpdateFridgeItems: (items: FridgeItem[]) => void;
}

interface Recipe {
  id: string;
  name: string;
  image: string;
  time: number;
  servings: number;
  ingredients: string[];
  instructions: string[];
  matchPercentage: number;
}

// A chat message is either a plain text reply, a recipe list, or the user's message
type MessageContent =
  | { type: 'text'; text: string }
  | { type: 'recipes'; recipes: Recipe[]; text?: string };

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: MessageContent;
}

// What we send to the API — plain text only
interface ApiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export function RecipesScreen({ fridgeItems, onUpdateFridgeItems }: RecipesScreenProps) {
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [apiHistory, setApiHistory] = useState<ApiMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    const saved = localStorage.getItem('favoriteRecipes');
    if (saved) setFavorites(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('favoriteRecipes', JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (recipeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev =>
      prev.includes(recipeId) ? prev.filter(id => id !== recipeId) : [...prev, recipeId]
    );
  };

  const buildSystemPrompt = () => {
    const fridgeContext = fridgeItems.length > 0
      ? fridgeItems.map(item => {
          const daysLeft = Math.ceil(
            (new Date(item.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          );
          return `- ${item.name} (${item.quantity} ${item.unit}, expires in ${daysLeft} days)`;
        }).join('\n')
      : '(fridge is empty)';

    return `You are Z.ai, a friendly and knowledgeable kitchen assistant. You can answer any food-related question — cooking tips, ingredient substitutions, nutrition, meal planning, kitchen techniques, and more.

The user's fridge contains:
${fridgeContext}

IMPORTANT RESPONSE RULES:
- For general questions (tips, substitutions, nutrition, techniques, etc.): reply in plain conversational text. Be helpful, friendly, and concise.
- For recipe requests (any time the user asks for recipe ideas, what to cook, meal suggestions, or specific dishes): respond ONLY with a JSON block in this exact format, no other text before or after:

\`\`\`json
{
  "text": "A short friendly intro sentence (optional)",
  "recipes": [
    {
      "id": "unique_string",
      "name": "Recipe Name",
      "image": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400",
      "time": 30,
      "servings": 2,
      "matchPercentage": 85,
      "ingredients": ["ingredient1", "ingredient2"],
      "instructions": ["Step 1...", "Step 2..."]
    }
  ]
}
\`\`\`

Give 3-4 recipes when requested. Prioritize ingredients expiring soon. Keep ingredients lowercase.
If the fridge is empty and recipes are requested, suggest common easy recipes anyway.`;
  };

  const callZai = async (userText: string, history: ApiMessage[]): Promise<string> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120_000);

    const response = await fetch('/zai/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Authorization': 'Bearer sk-8590c38c5b109737b57a0e9d8ed3ac4bdaf4765e8f47df21',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'ilmu-glm-5.1',
        max_tokens: 2000,
        messages: [
          { role: 'system', content: buildSystemPrompt() },
          ...history,
          { role: 'user', content: userText },
        ],
      }),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Z.ai API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content ?? '';
  };

  const parseResponse = (raw: string): MessageContent => {
    // Look for a JSON block (with or without ```json fences)
    const jsonMatch = raw.match(/```json\s*([\s\S]*?)```/) || raw.match(/(\{[\s\S]*"recipes"[\s\S]*\})/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1].trim());
        if (parsed.recipes && Array.isArray(parsed.recipes)) {
          const recipes: Recipe[] = parsed.recipes.map((r: Recipe, i: number) => {
            return {
              ...r,
              id: r.id ?? String(Date.now() + i),
              matchPercentage: r.matchPercentage ?? 50,
              image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop',
            };
          });
          return { type: 'recipes', recipes, text: parsed.text };
        }
      } catch {
        // fall through to text
      }
    }
    return { type: 'text', text: raw.trim() };
  };

  const handleSend = async (quickText?: string) => {
    const text = quickText ?? inputValue.trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: { type: 'text', text },
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const raw = await callZai(text, apiHistory);
      const content = parseResponse(raw);

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content,
      };

      // Keep API history as plain text (summarise recipe responses)
      const assistantApiText =
        content.type === 'recipes'
          ? `I suggested these recipes: ${content.recipes.map(r => r.name).join(', ')}.`
          : content.text;

      setMessages(prev => [...prev, assistantMsg]);
      setApiHistory(prev => [
        ...prev,
        { role: 'user', content: text },
        { role: 'assistant', content: assistantApiText },
      ]);
    } catch (err) {
      const errMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: {
          type: 'text',
          text: `Sorry, I ran into an issue: ${err instanceof Error ? err.message : 'Please try again.'}`,
        },
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCookRecipe = (recipe: Recipe) => {
    const updatedFridgeItems = fridgeItems.map(item => {
      const used = recipe.ingredients.find(ing =>
        item.name.toLowerCase().includes(ing) || ing.includes(item.name.toLowerCase())
      );
      if (used) {
        const newQty = item.quantity - 1;
        return newQty <= 0 ? null : { ...item, quantity: newQty };
      }
      return item;
    }).filter((item): item is FridgeItem => item !== null);

    onUpdateFridgeItems(updatedFridgeItems);
    setShowConfirmation(true);
    setTimeout(() => {
      setShowConfirmation(false);
      setSelectedRecipe(null);
    }, 2000);
  };

  const suggestions = [
    'Suggest recipes based on my fridge',
    'What can I cook for dinner tonight?',
    'Use ingredients that are expiring soon',
    'Show me quick 15-minute meals',
  ];

  const RecipeCard = ({ recipe }: { recipe: Recipe }) => (
    <div
      onClick={() => setSelectedRecipe(recipe)}
      className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700 cursor-pointer hover:shadow-md transition-shadow"
    >
      <div className="relative">
        <img src={recipe.image} alt={recipe.name} className="w-full h-40 object-cover" onError={(e) => { (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop`; }} />
        <button
          onClick={(e) => toggleFavorite(recipe.id, e)}
          className="absolute top-3 right-3 w-8 h-8 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-md"
        >
          <Heart
            className={`w-4 h-4 ${favorites.includes(recipe.id) ? 'fill-red-500 text-red-500' : 'text-gray-400'}`}
          />
        </button>
        <span className={`absolute top-3 left-3 px-2 py-1 rounded-full text-xs font-medium ${
          recipe.matchPercentage >= 80
            ? 'bg-green-100 text-green-700'
            : recipe.matchPercentage >= 50
            ? 'bg-yellow-100 text-yellow-700'
            : 'bg-gray-100 text-gray-700'
        }`}>
          {recipe.matchPercentage}% match
        </span>
      </div>
      <div className="p-3">
        <h4 className="text-gray-900 dark:text-white font-medium mb-2">{recipe.name}</h4>
        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{recipe.time}m</span>
          <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{recipe.servings} servings</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* Welcome state */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 pb-8">
            <div className="w-16 h-16 bg-[#007057]/10 dark:bg-[#007057]/20 rounded-full flex items-center justify-center mb-4">
              <Bot className="w-8 h-8 text-[#007057]" />
            </div>
            <h1 className="text-2xl text-gray-900 dark:text-white mb-2">Hi, I'm Z.ai</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-sm">
              Ask me anything — recipes, cooking tips, substitutions, nutrition, or what to do with expiring ingredients.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
              {suggestions.map(s => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:border-[#007057] hover:text-[#007057] transition-colors text-left"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Conversation */}
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 bg-[#007057] rounded-full flex items-center justify-center flex-shrink-0 mr-2 mt-1">
                <Bot className="w-4 h-4 text-white" />
              </div>
            )}

            <div className={`max-w-[85%] ${msg.role === 'user' ? 'max-w-[75%]' : 'flex-1'}`}>
              {/* User bubble */}
              {msg.role === 'user' && msg.content.type === 'text' && (
                <div className="bg-[#007057] text-white px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm">
                  {msg.content.text}
                </div>
              )}

              {/* Assistant text reply */}
              {msg.role === 'assistant' && msg.content.type === 'text' && (
                <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 px-4 py-2.5 rounded-2xl rounded-tl-sm text-sm text-gray-800 dark:text-gray-200 shadow-sm whitespace-pre-wrap">
                  {msg.content.text}
                </div>
              )}

              {/* Assistant recipe response */}
              {msg.role === 'assistant' && msg.content.type === 'recipes' && (
                <div className="space-y-3">
                  {msg.content.text && (
                    <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 px-4 py-2.5 rounded-2xl rounded-tl-sm text-sm text-gray-800 dark:text-gray-200 shadow-sm">
                      {msg.content.text}
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {msg.content.recipes.map(recipe => (
                      <RecipeCard key={recipe.id} recipe={recipe} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="w-7 h-7 bg-[#007057] rounded-full flex items-center justify-center flex-shrink-0 mr-2 mt-1">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm">
              <div className="flex gap-1.5 items-center h-4">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask Z.ai anything..."
            className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 border-0 rounded-full text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#007057] text-sm"
            disabled={isLoading}
          />
          <button
            onClick={() => handleSend()}
            disabled={!inputValue.trim() || isLoading}
            className="w-11 h-11 bg-[#007057] hover:bg-[#005a45] disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-full flex items-center justify-center transition-colors flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Recipe Detail Modal */}
      {selectedRecipe && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 w-full sm:max-w-2xl rounded-t-2xl sm:rounded-lg max-h-[90vh] overflow-y-auto">
            <div className="relative">
              <img src={selectedRecipe.image} alt={selectedRecipe.name} className="w-full h-64 object-cover" onError={(e) => { (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=400&fit=crop`; }} />
              <button
                onClick={() => setSelectedRecipe(null)}
                className="absolute top-4 right-4 w-10 h-10 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-lg text-xl"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-gray-900 dark:text-white">{selectedRecipe.name}</h2>
                <span className={`px-3 py-1 rounded-full text-sm ${
                  selectedRecipe.matchPercentage >= 80
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                    : selectedRecipe.matchPercentage >= 50
                    ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}>
                  {selectedRecipe.matchPercentage}% match
                </span>
              </div>

              <div className="flex items-center gap-6 mb-6 text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-2"><Clock className="w-5 h-5" /><span>{selectedRecipe.time} minutes</span></div>
                <div className="flex items-center gap-2"><Users className="w-5 h-5" /><span>{selectedRecipe.servings} servings</span></div>
              </div>

              <div className="mb-6">
                <h3 className="text-gray-900 dark:text-white mb-3">Ingredients</h3>
                <ul className="space-y-2">
                  {selectedRecipe.ingredients.map((ingredient, i) => {
                    const inFridge = fridgeItems.some(item =>
                      item.name.toLowerCase().includes(ingredient) || ingredient.includes(item.name.toLowerCase())
                    );
                    return (
                      <li key={i} className={`flex items-center gap-2 ${inFridge ? 'text-green-700 dark:text-green-300' : 'text-gray-600 dark:text-gray-400'}`}>
                        <div className={`w-2 h-2 rounded-full ${inFridge ? 'bg-green-600' : 'bg-gray-400'}`} />
                        <span className="capitalize">{ingredient}</span>
                        {inFridge && <span className="text-xs text-green-600 dark:text-green-400">(in fridge)</span>}
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="mb-6">
                <h3 className="text-gray-900 dark:text-white mb-3">Instructions</h3>
                <ol className="space-y-3">
                  {selectedRecipe.instructions.map((step, i) => (
                    <li key={i} className="flex gap-3 text-gray-600 dark:text-gray-400">
                      <span className="flex-shrink-0 w-6 h-6 bg-[#007057] text-white rounded-full flex items-center justify-center text-sm">{i + 1}</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <button
                onClick={() => setSelectedRecipe(null)}
                className="w-full mt-2 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => handleCookRecipe(selectedRecipe)}
                disabled={showConfirmation}
                className="w-full mt-3 py-3 bg-[#007057] hover:bg-[#005a45] disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <ChefHat className="w-5 h-5" />
                {showConfirmation ? 'Ingredients Deducted! ✓' : 'Cook This Recipe'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
