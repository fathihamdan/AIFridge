import { Moon, Sun, Bell, Trash2, HelpCircle, Info, LogOut, User } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { useAuth } from './AuthProvider';

export function SettingsScreen() {
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-gray-900 dark:text-white mb-2">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your preferences
        </p>
      </div>

      <div className="space-y-4">
        {/* Account */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-gray-900 dark:text-white">Account</h2>
          </div>
          <div className="p-4 space-y-1">
            <div className="flex items-center gap-3 p-3">
              <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <div className="flex-1">
                <p className="text-gray-900 dark:text-white">{user?.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {user?.email}
                </p>
              </div>
            </div>
            <button 
              onClick={signOut}
              className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors text-left"
            >
              <LogOut className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <div className="flex-1">
                <p className="text-gray-900 dark:text-white">Sign Out</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Log out of your account
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Appearance */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-gray-900 dark:text-white">Appearance</h2>
          </div>
          <div className="p-4">
            <button
              onClick={toggleTheme}
              className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3">
                {theme === 'light' ? (
                  <Sun className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                ) : (
                  <Moon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                )}
                <div className="text-left">
                  <p className="text-gray-900 dark:text-white">Dark Mode</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {theme === 'dark' ? 'On' : 'Off'}
                  </p>
                </div>
              </div>
              <div
                className={`w-12 h-6 rounded-full transition-colors ${
                  theme === 'dark' ? 'bg-[#007057]' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full mt-0.5 transition-transform ${
                    theme === 'dark' ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                ></div>
              </div>
            </button>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-gray-900 dark:text-white">Notifications</h2>
          </div>
          <div className="p-4 space-y-1">
            <button className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors text-left">
              <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <div className="flex-1">
                <p className="text-gray-900 dark:text-white">Expiry Reminders</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Get notified before items expire
                </p>
              </div>
            </button>
            <button className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors text-left">
              <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <div className="flex-1">
                <p className="text-gray-900 dark:text-white">Recipe Suggestions</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Daily recipe recommendations
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Data Management */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-gray-900 dark:text-white">Data Management</h2>
          </div>
          <div className="p-4 space-y-1">
            <button className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors text-left">
              <Trash2 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <div className="flex-1">
                <p className="text-gray-900 dark:text-white">Clear All Data</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Remove all items from fridge and lists
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* About */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-gray-900 dark:text-white">About</h2>
          </div>
          <div className="p-4 space-y-1">
            <button className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors text-left">
              <HelpCircle className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <div className="flex-1">
                <p className="text-gray-900 dark:text-white">Help & Support</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Get help using the app
                </p>
              </div>
            </button>
            <button className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors text-left">
              <Info className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <div className="flex-1">
                <p className="text-gray-900 dark:text-white">App Version</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  1.0.0
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}