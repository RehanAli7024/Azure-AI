import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './ChatSection.css';

const ChatSection = ({ currentLanguage }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sources, setSources] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Add initial bot message when component mounts
  useEffect(() => {
    setMessages([{
      id: 1,
      text: "Hello! I can help answer questions about your documents. What would you like to know?",
      isUser: false,
    }]);
  }, []);

  // Add welcome message when language changes
  useEffect(() => {
    const translateWelcomeMessage = async () => {
      if (currentLanguage !== 'en' && messages.length > 0) {
        try {
          // Add system message about translation
          const translationNotice = {
            id: Date.now(),
            text: `I'll now respond in ${getLanguageName(currentLanguage)}.`,
            isUser: false,
          };
          setMessages(prevMessages => [...prevMessages, translationNotice]);
        } catch (error) {
          console.error('Error translating welcome message:', error);
        }
      }
    };

    translateWelcomeMessage();
  }, [currentLanguage, messages.length]);

  // Auto-scroll to the bottom of the chat when messages update
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Get language name from language code
  const getLanguageName = (languageCode) => {
    const languages = {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'ja': 'Japanese',
      'zh-Hans': 'Chinese',
      'ru': 'Russian',
      'ar': 'Arabic',
      'hi': 'Hindi',
      'ko': 'Korean'
    };
    
    return languages[languageCode] || languageCode;
  };

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Translate text based on current language
  const translateText = async (text, targetLang, sourceLang = 'en') => {
    if (targetLang === 'en' || !text) {
      return text;
    }
    
    try {
      const response = await axios.post('http://localhost:5000/translate', {
        text,
        to_language: targetLang,
        from_language: sourceLang
      });
      
      if (response.data.success) {
        return response.data.translated_text;
      }
      
      return text;
    } catch (error) {
      console.error('Translation error:', error);
      return text;
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;
    
    // Add user message to chat
    const userMessageObj = {
      id: Date.now(),
      text: newMessage,
      isUser: true,
    };
    
    setMessages(prevMessages => [...prevMessages, userMessageObj]);
    setNewMessage('');
    setIsLoading(true);
    
    try {
      // If not English, translate the message to English
      let messageToSend = newMessage;
      if (currentLanguage !== 'en') {
        messageToSend = await translateText(newMessage, 'en', currentLanguage);
      }
      
      // Send message to backend
      const response = await axios.post('http://localhost:5000/chat', {
        query: messageToSend
      });
      
      if (response.data.success) {
        // If not English, translate the response back
        let answerToDisplay = response.data.answer;
        if (currentLanguage !== 'en') {
          answerToDisplay = await translateText(response.data.answer, currentLanguage, 'en');
        }
        
        // Add bot response
        const botMessageObj = {
          id: Date.now() + 1,
          text: answerToDisplay,
          isUser: false,
        };
        
        setMessages(prevMessages => [...prevMessages, botMessageObj]);
        
        // Update sources if available
        if (response.data.sources && response.data.sources.length > 0) {
          setSources(response.data.sources);
        } else {
          setSources([]);
        }
      } else {
        // Handle error
        const errorMessage = currentLanguage !== 'en' ? 
          await translateText('Sorry, I encountered an error. Please try again.', currentLanguage, 'en') :
          'Sorry, I encountered an error. Please try again.';
        
        const errorMessageObj = {
          id: Date.now() + 1,
          text: errorMessage,
          isUser: false,
        };
        
        setMessages(prevMessages => [...prevMessages, errorMessageObj]);
      }
    } catch (error) {
      // Handle network error
      const networkErrorMsg = currentLanguage !== 'en' ?
        await translateText('Network error. Please check your connection and try again.', currentLanguage, 'en') :
        'Network error. Please check your connection and try again.';
      
      const networkErrorObj = {
        id: Date.now() + 1,
        text: networkErrorMsg,
        isUser: false,
      };
      
      setMessages(prevMessages => [...prevMessages, networkErrorObj]);
      console.error('Chat error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-section">
      <div className="messages" id="messages">
        {messages.map(message => (
          <div key={message.id} className={`message ${message.isUser ? 'user' : 'bot'}`}>
            <div className="message-content">{message.text}</div>
          </div>
        ))}
        
        {isLoading && (
          <div className="message bot">
            <div className="message-content loading-indicator">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {sources.length > 0 && (
        <div id="sources-panel" className="sources-panel">
          <h3>Sources:</h3>
          <ul id="sources-list" className="sources-list">
            {sources.map((source, index) => (
              <li key={index} className="source-item">
                <div className="source-name">{source.file_name}</div>
                <div className="source-meta">
                  {source.page_count > 0 && <span>Pages: {source.page_count}</span>}
                  <span>Relevance: {(source.score * 100).toFixed(1)}%</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      <form id="chat-form" className="chat-input" onSubmit={handleSubmit}>
        <input 
          type="text" 
          id="message-input" 
          placeholder="Ask about your documents..." 
          autoComplete="off"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
        />
        <button type="submit" disabled={isLoading}>Send</button>
      </form>
    </div>
  );
};

export default ChatSection;
