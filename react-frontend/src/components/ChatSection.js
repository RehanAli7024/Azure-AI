import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './ChatSection.css';

const ChatSection = ({ selectedLanguage, botId }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  // Handle sending new message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim()) {
      return;
    }
    
    const messageToSend = newMessage.trim();
    setNewMessage('');
    
    // Add user message to chat
    const userMessage = {
      id: Date.now().toString(),
      text: messageToSend,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString()
    };
    
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setIsLoading(true);
    
    try {
      // Build request payload, including bot ID if available
      const payload = {
        query: messageToSend,
        language: selectedLanguage // Send the selected language to the backend
      };
      
      // Add bot ID if provided
      if (botId) {
        payload.bot_id = botId;
      }
      
      // Send message to backend
      const response = await axios.post('http://localhost:5000/chat', payload);
      
      if (response.data.success) {
        // Get response text - handle both response formats
        const responseText = response.data.answer || response.data.response || "I don't have an answer for that.";
        
        // No need to translate on the client side anymore since we're doing it on the server
        
        // Add bot message to chat
        const botMessage = {
          id: (Date.now() + 1).toString(),
          text: responseText,
          sources: response.data.sources || [],
          sender: 'bot',
          timestamp: new Date().toLocaleTimeString(),
          botId: botId || response.data.bot_id // Keep track of which bot responded
        };
        
        setMessages(prevMessages => [...prevMessages, botMessage]);
      } else {
        // Handle error
        console.error('Error from chat endpoint:', response.data.error);
        const errorMessage = {
          id: (Date.now() + 1).toString(),
          text: selectedLanguage === 'en' 
            ? 'Sorry, I encountered an error. Please try again.' 
            : 'Sorry, I encountered an error. Please try again.',
          sender: 'bot',
          isError: true,
          timestamp: new Date().toLocaleTimeString()
        };
        
        setMessages(prevMessages => [...prevMessages, errorMessage]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add error message to chat
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        text: selectedLanguage === 'en' 
          ? 'Network error. Please check your connection and try again.' 
          : 'Network error. Please check your connection and try again.',
        sender: 'bot',
        isError: true,
        timestamp: new Date().toLocaleTimeString()
      };
      
      setMessages(prevMessages => [...prevMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Render sources for bot messages
  const renderSources = (sources) => {
    if (!sources || sources.length === 0) return null;
    
    return (
      <div className="sources-container">
        <div className="sources-title">Sources:</div>
        {sources.map((source, index) => (
          <a 
            key={index}
            href={source.url || '#'} 
            className="source-item"
            target="_blank"
            rel="noopener noreferrer"
          >
            {source.title || `Source ${index + 1}`}
          </a>
        ))}
      </div>
    );
  };

  // Chat message elements
  const chatMessages = messages.map(message => (
    <div 
      key={message.id}
      className={`message ${message.sender} ${message.isError ? 'error' : ''}`}
    >
      <div className="message-content">
        <div 
          className="message-text"
          dangerouslySetInnerHTML={{ __html: message.text }}
        />
        {message.sources && renderSources(message.sources)}
        <div className="message-timestamp">{message.timestamp}</div>
      </div>
    </div>
  ));

  // Bot typing indicator
  const typingIndicator = isLoading && (
    <div className="message bot typing">
      <div className="message-content">
        <div className="dots">
          <span className="dot"></span>
          <span className="dot"></span>
          <span className="dot"></span>
        </div>
      </div>
    </div>
  );

  // Welcome message based on language
  const getWelcomeMessage = () => {
    switch (selectedLanguage) {
      case 'es':
        return '¡Hola! ¿En qué puedo ayudarte hoy?';
      case 'fr':
        return 'Bonjour! Comment puis-je vous aider aujourd\'hui?';
      case 'de':
        return 'Hallo! Wie kann ich Ihnen heute helfen?';
      case 'it':
        return 'Ciao! Come posso aiutarti oggi?';
      case 'ja':
        return 'こんにちは！今日はどのようにお手伝いできますか？';
      case 'zh-Hans':
        return '你好！我今天能帮你什么忙？';
      case 'zh-Hant':
        return '你好！我今天能幫你什麼忙？';
      case 'ru':
        return 'Здравствуйте! Чем я могу вам помочь сегодня?';
      case 'ar':
        return 'مرحبا! كيف يمكنني مساعدتك اليوم؟';
      case 'hi':
        return 'नमस्ते! आज मैं आपकी कैसे मदद कर सकता हूँ?';
      case 'ko':
        return '안녕하세요! 오늘 어떻게 도와드릴까요?';
      case 'pt':
        return 'Olá! Como posso ajudá-lo hoje?';
      case 'nl':
        return 'Hallo! Hoe kan ik u vandaag helpen?';
      case 'tr':
        return 'Merhaba! Bugün size nasıl yardımcı olabilirim?';
      case 'pl':
        return 'Cześć! Jak mogę ci dziś pomóc?';
      case 'sv':
        return 'Hej! Hur kan jag hjälpa dig idag?';
      default:
        return 'Hello! How can I help you today?';
    }
  };

  // Welcome content for empty state
  const renderEmptyState = () => {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M40 12C24.5 12 12 24.5 12 40C12 55.5 24.5 68 40 68C55.5 68 68 55.5 68 40C68 24.5 55.5 12 40 12ZM40 20C44.4 20 48 23.6 48 28C48 32.4 44.4 36 40 36C35.6 36 32 32.4 32 28C32 23.6 35.6 20 40 20ZM40 60C33.3 60 27.3 56.8 24 51.6C24.1 45.8 35.6 42.5 40 42.5C44.4 42.5 55.9 45.8 56 51.6C52.7 56.8 46.7 60 40 60Z" fill="currentColor"/>
          </svg>
        </div>
        <h2 className="empty-state-title">{getWelcomeMessage()}</h2>
        <p className="empty-state-message">
          Welcome to SupportLingua AI, your multilingual support assistant. I can answer your questions in multiple languages, provide information from your uploaded documents, and help you find the information you need quickly.
        </p>
      </div>
    );
  };

  return (
    <div className="chat-section">
      <div className="messages-container">
        {messages.length === 0 ? renderEmptyState() : (
          <>
            {chatMessages}
            {typingIndicator}
            <div ref={messagesEndRef}></div>
          </>
        )}
      </div>
      
      <div className="message-input-container">
        <form className="message-form" onSubmit={handleSendMessage}>
          <input 
            type="text" 
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={selectedLanguage === 'en' ? 'Type your message...' : 'Type your message...'}
            className="message-input"
            disabled={isLoading}
          />
          <button 
            type="submit" 
            className="send-button" 
            disabled={!newMessage.trim() || isLoading}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2.01 21L23 12L2.01 3L2 10L17 12L2 14L2.01 21Z" fill="white"/>
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatSection;
