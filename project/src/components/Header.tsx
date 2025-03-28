import React from 'react';
import { Bot, Moon, Sun } from 'lucide-react';

interface HeaderProps {
  selectedLanguage: string;
  selectedBot: any;
  onLanguageChange: (language: string) => void;
}

const Header: React.FC<HeaderProps> = ({
  selectedLanguage,
  selectedBot,
  onLanguageChange,
}) => {
  const [isDarkMode, setIsDarkMode] = React.useState(
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center space-x-4">
          {selectedBot && (
            <div className="flex items-center space-x-2">
              <Bot className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="font-medium">{selectedBot.name}</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            {isDarkMode ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;