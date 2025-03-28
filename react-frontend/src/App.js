import React, { useState } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ChatSection from './components/ChatSection';
import Footer from './components/Footer';
import BotList from './components/BotList';
import BotDetails from './components/BotDetails';
import BotCreationForm from './components/BotCreationForm';
import './App.css';

function App() {
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [showBotCreationForm, setShowBotCreationForm] = useState(false);
  const [selectedBot, setSelectedBot] = useState(null);
  const [view, setView] = useState('botList'); // 'botList', 'botDetails', 'chat'
  const [documents, setDocuments] = useState([]);
  
  // Handle language selection from header
  const handleLanguageSelect = (language) => {
    setSelectedLanguage(language);
  };
  
  // Handle document upload
  const handleDocumentUploaded = (document) => {
    setDocuments(prevDocuments => [...prevDocuments, document]);
  };
  
  // Handle bot selection
  const handleSelectBot = (bot) => {
    setSelectedBot(bot);
    setView('botDetails');
  };
  
  // Handle bot creation
  const handleCreateBot = () => {
    setShowBotCreationForm(true);
  };
  
  // Handle new bot created
  const handleBotCreated = (newBot) => {
    setSelectedBot(newBot);
    setView('botDetails');
    setShowBotCreationForm(false);
  };
  
  // Handle bot updates
  const handleBotUpdated = (updatedBot) => {
    setSelectedBot(updatedBot);
  };
  
  // Handle back button from bot details
  const handleBackToBotList = () => {
    setView('botList');
  };
  
  // Handle starting a chat with the selected bot
  const handleStartChat = () => {
    setView('chat');
  };

  return (
    <div className="app-container">
      <Header 
        onLanguageSelect={handleLanguageSelect} 
        selectedLanguage={selectedLanguage}
      />
      
      <main className="main-content">
        {view === 'botList' && (
          <BotList 
            onSelectBot={handleSelectBot}
            onCreateBot={handleCreateBot}
          />
        )}
        
        {view === 'botDetails' && selectedBot && (
          <BotDetails 
            bot={selectedBot}
            onBotUpdated={handleBotUpdated}
            onBack={handleBackToBotList}
            onStartChat={() => handleStartChat()}
          />
        )}
        
        {view === 'chat' && (
          <div className="chat-container">
            <div className="chat-header">
              <button className="back-button" onClick={() => setView('botDetails')}>
                &larr; Back to Bot Details
              </button>
              <h2>Chatting with: {selectedBot?.name}</h2>
            </div>
            
            <div className="chat-layout">
              <Sidebar 
                onDocumentUploaded={handleDocumentUploaded}
                documents={documents}
                selectedLanguage={selectedLanguage}
                currentBotId={selectedBot?.id}
              />
              <ChatSection 
                selectedLanguage={selectedLanguage}
                botId={selectedBot?.id}
              />
            </div>
          </div>
        )}
      </main>
      
      <Footer />
      
      {showBotCreationForm && (
        <BotCreationForm
          onClose={() => setShowBotCreationForm(false)}
          onBotCreated={handleBotCreated}
        />
      )}
    </div>
  );
}

export default App;
