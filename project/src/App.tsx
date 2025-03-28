import React, { useState } from 'react';
import { Bot, Globe2, Menu, X } from 'lucide-react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ChatSection from './components/ChatSection';
import BotList from './components/BotList';
import BotDetails from './components/BotDetails';
import BotCreationForm from './components/BotCreationForm';

function App() {
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [selectedBot, setSelectedBot] = useState(null);
  const [showBotCreation, setShowBotCreation] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [view, setView] = useState<'chat' | 'bots'>('chat');

  const handleBotCreated = (newBot) => {
    setSelectedBot(newBot);
    setShowBotCreation(false);
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile Menu Button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white dark:bg-gray-800 shadow-lg"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-40 w-72 transform 
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 transition-transform duration-300 ease-in-out
        bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700
      `}>
        <div className="flex flex-col h-full">
          {/* Logo Section */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <Bot className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              <h1 className="text-xl font-bold">SupportLingua AI</h1>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              className={`flex-1 p-4 text-center ${
                view === 'chat' ? 'bg-gray-100 dark:bg-gray-700' : ''
              }`}
              onClick={() => setView('chat')}
            >
              Chat
            </button>
            <button
              className={`flex-1 p-4 text-center ${
                view === 'bots' ? 'bg-gray-100 dark:bg-gray-700' : ''
              }`}
              onClick={() => setView('bots')}
            >
              Bots
            </button>
          </div>

          {/* Language Selector */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <Globe2 className="w-5 h-5 text-gray-500" />
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="flex-1 bg-transparent border border-gray-300 dark:border-gray-600 rounded-md p-2"
              >
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
                <option value="it">Italiano</option>
                <option value="ja">日本語</option>
                <option value="zh-Hans">简体中文</option>
                <option value="zh-Hant">繁體中文</option>
              </select>
            </div>
          </div>

          {/* Content Based on View */}
          <div className="flex-1 overflow-y-auto">
            {view === 'bots' ? (
              <BotList
                onSelectBot={setSelectedBot}
                onCreateBot={() => setShowBotCreation(true)}
              />
            ) : (
              <Sidebar
                selectedLanguage={selectedLanguage}
                currentBotId={selectedBot?.id}
              />
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          selectedLanguage={selectedLanguage}
          selectedBot={selectedBot}
          onLanguageChange={setSelectedLanguage}
        />
        
        <main className="flex-1 overflow-hidden bg-gray-50 dark:bg-gray-900">
          {showBotCreation ? (
            <BotCreationForm
              onClose={() => setShowBotCreation(false)}
              onBotCreated={handleBotCreated}
            />
          ) : view === 'bots' && selectedBot ? (
            <BotDetails
              bot={selectedBot}
              onBotUpdated={setSelectedBot}
              onBack={() => setSelectedBot(null)}
              onStartChat={() => setView('chat')}
            />
          ) : (
            <ChatSection
              selectedLanguage={selectedLanguage}
              botId={selectedBot?.id}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;