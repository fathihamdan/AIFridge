import { useState, useRef, useEffect } from 'react';
import { X, Send, Clock, Users, ChefHat } from 'lucide-react';
import { FridgeItem } from '../App';

interface AIChatModalProps {
  onClose: () => void;
  fridgeItems: FridgeItem[];
}

interface Recipe {
  id: string;
  name: string;
  image: string;
  time: number;
  servings: number;
  ingredients: string[];
  instructions: string[];
}

interface Message {
  id: string;
  role: 'user';
  content: string;
}

export function AIChatModal({ onClose, fridgeItems }: AIChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isInitialState = messages.length === 0 && recipes.length === 0;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateRecipes = async (userMessage: string): Promise<Recipe[]> => {
    const Z_AI_API_KEY = "sk-41428632d8642a3ae56880793d677993651470ab7f173e07"; // Replace with your actual key
    
    // We send the message + the current fridge items so the AI knows what's available
    const fridgeContext = fridgeItems.map(i => `${i.name} (${i.quantity} ${i.unit})`).join(", ");

    try {
      const response = await fetch('https://api.z.ai/api/paas/v4/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Z_AI_API_KEY}`
        },
        body: JSON.stringify({
          model: "ilmu-glm-5.1", // check Z.ai docs for the specific model name
          messages: [
            {
              role: "system",
              content: `You are a helpful fridge assistant. The user has: ${fridgeContext}. 
              Return a JSON array of 3-4 recipes. Each recipe must follow this exact format: 
              { "id": "string", "name": "string", "image": "unsplash_url", "time": number, "servings": number, "ingredients": ["string"], "instructions": ["string"] }`
            },
            { role: "user", content: userMessage }
          ],
          response_format: { type: "json_object" } // Ensures Z.ai returns valid JSON
        })
      });

      const data = await response.json();
      
      // Depending on Z.ai's response structure, you might need to parse the content
      const content = JSON.parse(data.choices[0].message.content);
      return content.recipes; // Adjust based on the AI's exact JSON output
      
    } catch (error) {
      console.error("Z.ai Error:", error);
      throw error;
    }
  };

  const handleSend = async (messageText?: string) => {
    const text = messageText || inputValue.trim();
    if (!text || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const generatedRecipes = await generateRecipes(text);
      setRecipes(generatedRecipes);
    } catch (error) {
      alert('Sorry, I encountered an error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSend(suggestion);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestions = [
    'Suggest recipes based on my ingredients in my fridge',
    'Suggest recipes that use ingredients almost expired',
    'What can I cook for dinner tonight?',
    'Show me quick 15-minute recipes',
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white dark:bg-gray-800 w-full sm:max-w-2xl sm:rounded-lg rounded-t-2xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#007057] to-[#005a45] rounded-full flex items-center justify-center">
              <ChefHat className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-gray-900 dark:text-white">Z.ai Recipe Assistant</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">AI-Powered Recipes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          {isInitialState ? (
            /* Initial Empty State */
            <div className="h-full flex flex-col items-center justify-center p-8">
              <div className="w-24 h-24 bg-gradient-to-br from-[#007057] to-[#005a45] rounded-3xl flex items-center justify-center mb-6 shadow-lg">
                <span className="text-4xl font-bold text-white">Z</span>
              </div>
              <h1 className="text-3xl text-gray-900 dark:text-white mb-2">Hi, I'm Z.ai</h1>
              <p className="text-gray-600 dark:text-gray-400 text-center mb-8">
                Generate recipe suggestions with Z.ai
              </p>
            </div>
          ) : (
            /* Recipe Results */
            <div className="p-4">
              {/* User Query Display */}
              {messages.length > 0 && (
                <div className="mb-6">
                  <div className="inline-block bg-[#007057]/10 dark:bg-[#007057]/20 px-4 py-2 rounded-full">
                    <p className="text-sm text-[#007057] dark:text-[#00a07d]">
                      {messages[messages.length - 1].content}
                    </p>
                  </div>
                </div>
              )}

              {/* Loading State */}
              {isLoading && (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-[#007057] mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">Generating recipes...</p>
                </div>
              )}

              {/* Recipe Cards */}
              {!isLoading && recipes.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-gray-900 dark:text-white mb-4">
                    Here are some recipes for you:
                  </h3>
                  {recipes.map(recipe => (
                    <div
                      key={recipe.id}
                      onClick={() => setSelectedRecipe(recipe)}
                      className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                    >
                      <div className="flex gap-4">
                        <img
                          src={recipe.image}
                          alt={recipe.name}
                          className="w-32 h-32 object-cover flex-shrink-0"
                        />
                        <div className="flex-1 p-4">
                          <h4 className="text-gray-900 dark:text-white mb-2">{recipe.name}</h4>
                          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-2">
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              <span>{recipe.time} min</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              <span>{recipe.servings} servings</span>
                            </div>
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {recipe.ingredients.length} ingredients
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions (shown when in initial state or at bottom) */}
        {isInitialState && !isLoading && (
          <div className="px-4 pb-4">
            <div className="flex flex-wrap gap-2 justify-center mb-4">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-full text-sm transition-colors border border-gray-200 dark:border-gray-600"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask Z.ai for recipe suggestions..."
              className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 border-0 rounded-full text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#007057]"
              disabled={isLoading}
            />
            <button
              onClick={() => handleSend()}
              disabled={!inputValue.trim() || isLoading}
              className="w-12 h-12 bg-[#007057] hover:bg-[#005a45] disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-full flex items-center justify-center transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Recipe Detail Modal */}
      {selectedRecipe && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 w-full sm:max-w-2xl rounded-t-2xl sm:rounded-lg max-h-[90vh] overflow-y-auto">
            <div className="relative">
              <img
                src={selectedRecipe.image}
                alt={selectedRecipe.name}
                className="w-full h-64 object-cover"
              />
              <button
                onClick={() => setSelectedRecipe(null)}
                className="absolute top-4 right-4 w-10 h-10 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-lg"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              <h2 className="text-gray-900 dark:text-white mb-4">{selectedRecipe.name}</h2>

              <div className="flex items-center gap-6 mb-6 text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  <span>{selectedRecipe.time} minutes</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  <span>{selectedRecipe.servings} servings</span>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-gray-900 dark:text-white mb-3">Ingredients</h3>
                <ul className="space-y-2">
                  {selectedRecipe.ingredients.map((ingredient, index) => {
                    const hasIngredient = fridgeItems.some(item =>
                      item.name.toLowerCase().includes(ingredient) ||
                      ingredient.includes(item.name.toLowerCase())
                    );
                    return (
                      <li
                        key={index}
                        className={`flex items-center gap-2 ${
                          hasIngredient
                            ? 'text-green-700 dark:text-green-300'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        <div
                          className={`w-2 h-2 rounded-full ${
                            hasIngredient ? 'bg-green-600' : 'bg-gray-400'
                          }`}
                        ></div>
                        <span className="capitalize">{ingredient}</span>
                        {hasIngredient && (
                          <span className="text-xs text-green-600 dark:text-green-400">
                            (in fridge)
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div>
                <h3 className="text-gray-900 dark:text-white mb-3">Instructions</h3>
                <ol className="space-y-3">
                  {selectedRecipe.instructions.map((instruction, index) => (
                    <li
                      key={index}
                      className="flex gap-3 text-gray-600 dark:text-gray-400"
                    >
                      <span className="flex-shrink-0 w-6 h-6 bg-[#007057] text-white rounded-full flex items-center justify-center text-sm">
                        {index + 1}
                      </span>
                      <span>{instruction}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <button
                onClick={() => setSelectedRecipe(null)}
                className="w-full mt-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
