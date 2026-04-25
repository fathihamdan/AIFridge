import { useState } from "react";
import {
  Home,
  ShoppingCart,
  ChefHat,
  Settings,
} from "lucide-react";
import { FridgeScreen } from "./components/FridgeScreen";
import { GroceryScreen } from "./components/GroceryScreen";
import { RecipesScreen } from "./components/RecipesScreen";
import { SettingsScreen } from "./components/SettingsScreen";
import { ThemeProvider } from "./components/ThemeProvider";
import {
  AuthProvider,
  useAuth,
} from "./components/AuthProvider";
import { LoginScreen } from "./components/LoginScreen";
import { SignUpScreen } from "./components/SignUpScreen";

type Screen = "fridge" | "grocery" | "recipes" | "settings";

export interface FridgeItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  expiryDate: string;
  addedDate: string;
  barcode?: string;
}

export interface GroceryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  completed: boolean;
  category: string;
}

function AppContent() {
  const { user, isLoading } = useAuth();
  const [authScreen, setAuthScreen] = useState<
    "login" | "signup"
  >("login");

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">
          Loading...
        </div>
      </div>
    );
  }

  if (!user) {
    if (authScreen === "login") {
      return (
        <LoginScreen
          onSwitchToSignUp={() => setAuthScreen("signup")}
        />
      );
    }
    return (
      <SignUpScreen
        onSwitchToLogin={() => setAuthScreen("login")}
      />
    );
  }

  return <MainApp />;
}

function MainApp() {
  const [currentScreen, setCurrentScreen] =
    useState<Screen>("fridge");
  const [fridgeItems, setFridgeItems] = useState<FridgeItem[]>([
    {
      id: "1",
      name: "Milk",
      category: "Dairy",
      quantity: 1,
      unit: "L",
      expiryDate: "2025-12-12",
      addedDate: "2025-12-08",
    },
    {
      id: "2",
      name: "Eggs",
      category: "Dairy",
      quantity: 12,
      unit: "pcs",
      expiryDate: "2025-12-15",
      addedDate: "2025-12-05",
    },
    {
      id: "3",
      name: "Chicken Breast",
      category: "Meat",
      quantity: 500,
      unit: "g",
      expiryDate: "2025-12-11",
      addedDate: "2025-12-09",
    },
    {
      id: "4",
      name: "Tomatoes",
      category: "Vegetables",
      quantity: 6,
      unit: "pcs",
      expiryDate: "2025-12-13",
      addedDate: "2025-12-07",
    },
    {
      id: "5",
      name: "Cheese",
      category: "Dairy",
      quantity: 250,
      unit: "g",
      expiryDate: "2025-12-20",
      addedDate: "2025-12-06",
    },
  ]);

  const [groceryItems, setGroceryItems] = useState<
    GroceryItem[]
  >([
    {
      id: "1",
      name: "Bread",
      quantity: 1,
      unit: "loaf",
      completed: false,
      category: "Bakery",
    },
    {
      id: "2",
      name: "Apples",
      quantity: 6,
      unit: "pcs",
      completed: false,
      category: "Fruits",
    },
  ]);

  const addToFridge = (
    item: Omit<FridgeItem, "id" | "addedDate">,
  ) => {
    const newItem: FridgeItem = {
      ...item,
      id: Date.now().toString(),
      addedDate: new Date().toISOString().split("T")[0],
    };
    setFridgeItems([...fridgeItems, newItem]);
  };

  const removeFromFridge = (id: string) => {
    setFridgeItems(
      fridgeItems.filter((item) => item.id !== id),
    );
  };

  const updateFridgeItem = (
    id: string,
    updates: Partial<FridgeItem>,
  ) => {
    setFridgeItems(
      fridgeItems.map((item) =>
        item.id === id ? { ...item, ...updates } : item,
      ),
    );
  };

  const addToGrocery = (
    item: Omit<GroceryItem, "id" | "completed">,
  ) => {
    const newItem: GroceryItem = {
      ...item,
      id: Date.now().toString(),
      completed: false,
    };
    setGroceryItems([...groceryItems, newItem]);
  };

  const removeFromGrocery = (id: string) => {
    setGroceryItems(
      groceryItems.filter((item) => item.id !== id),
    );
  };

  const toggleGroceryItem = (id: string) => {
    setGroceryItems(
      groceryItems.map((item) =>
        item.id === id
          ? { ...item, completed: !item.completed }
          : item,
      ),
    );
  };

  const completePurchase = () => {
    const completedItems = groceryItems.filter(
      (item) => item.completed,
    );

    completedItems.forEach((groceryItem) => {
      const fridgeItem: Omit<FridgeItem, "id" | "addedDate"> = {
        name: groceryItem.name,
        category: groceryItem.category,
        quantity: groceryItem.quantity,
        unit: groceryItem.unit,
        expiryDate: getDefaultExpiryDate(groceryItem.category),
        barcode: undefined,
      };
      addToFridge(fridgeItem);
    });

    setGroceryItems(
      groceryItems.filter((item) => !item.completed),
    );
    setCurrentScreen("fridge");
  };

  const getDefaultExpiryDate = (category: string): string => {
    const daysToAdd =
      {
        Dairy: 7,
        Meat: 3,
        Vegetables: 5,
        Fruits: 7,
        Bakery: 5,
        Beverages: 30,
      }[category] || 7;

    const date = new Date();
    date.setDate(date.getDate() + daysToAdd);
    return date.toISOString().split("T")[0];
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case "fridge":
        return (
          <FridgeScreen
            items={fridgeItems}
            onAddItem={addToFridge}
            onRemoveItem={removeFromFridge}
            onUpdateItem={updateFridgeItem}
          />
        );
      case "grocery":
        return (
          <GroceryScreen
            items={groceryItems}
            onAddItem={addToGrocery}
            onRemoveItem={removeFromGrocery}
            onToggleItem={toggleGroceryItem}
            onCompletePurchase={completePurchase}
          />
        );
      case "recipes":
        return (
          <RecipesScreen
            fridgeItems={fridgeItems}
            onUpdateFridgeItems={setFridgeItems}
          />
        );
      case "settings":
        return <SettingsScreen />;
      default:
        return null;
    }
  };

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto pb-16">
        {renderScreen()}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 safe-area-bottom">
        <div className="grid grid-cols-4 h-16">
          <button
            onClick={() => setCurrentScreen("fridge")}
            className={`flex flex-col items-center justify-center gap-1 ${
              currentScreen === "fridge"
                ? "text-[#007057]"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            <Home className="w-6 h-6" />
            <span className="text-xs">Fridge</span>
          </button>
          <button
            onClick={() => setCurrentScreen("grocery")}
            className={`flex flex-col items-center justify-center gap-1 ${
              currentScreen === "grocery"
                ? "text-[#007057]"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            <ShoppingCart className="w-6 h-6" />
            <span className="text-xs">Grocery</span>
          </button>
          <button
            onClick={() => setCurrentScreen("recipes")}
            className={`flex flex-col items-center justify-center gap-1 ${
              currentScreen === "recipes"
                ? "text-[#007057]"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            <ChefHat className="w-6 h-6" />
            <span className="text-xs">Recipes</span>
          </button>
          <button
            onClick={() => setCurrentScreen("settings")}
            className={`flex flex-col items-center justify-center gap-1 ${
              currentScreen === "settings"
                ? "text-[#007057]"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            <Settings className="w-6 h-6" />
            <span className="text-xs">Settings</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}