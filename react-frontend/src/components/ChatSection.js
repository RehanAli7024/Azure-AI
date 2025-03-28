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

  // Chat message elements
  const chatMessages = messages.map(message => (
    <div 
      key={message.id}
      className={`message ${message.sender} ${message.isError ? 'error' : ''}`}
    >
      <div className="message-content">
        <div className="message-text">{message.text}</div>
        <div className="message-timestamp">{message.timestamp}</div>
      </div>
    </div>
  ));

  // Bot typing indicator
  const typingIndicator = isLoading && (
    <div className="message bot typing">
      <div className="dots">
        <span className="dot"></span>
        <span className="dot"></span>
        <span className="dot"></span>
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

  // Specialized bot message
  const getBotContextMessage = () => {
    switch (selectedLanguage) {
      case 'es':
        return 'Actualmente estás chateando con un bot especializado.';
      case 'fr':
        return 'Vous discutez actuellement avec un bot spécialisé.';
      case 'de':
        return 'Sie chatten derzeit mit einem spezialisierten Bot.';
      case 'it':
        return 'Stai attualmente chattando con un bot specializzato.';
      case 'ja':
        return '現在、専門のボットとチャットしています。';
      case 'zh-Hans':
        return '您目前正在与专业机器人聊天。';
      case 'zh-Hant':
        return '您目前正在與專業機器人聊天。';
      case 'ru':
        return 'В настоящее время вы общаетесь со специализированным ботом.';
      case 'ar':
        return 'أنت تتحدث حاليًا مع روبوت متخصص.';
      case 'hi':
        return 'आप वर्तमान में एक विशेष बॉट के साथ चैट कर रहे हैं।';
      case 'ko':
        return '현재 전문 봇과 채팅하고 있습니다.';
      case 'pt':
        return 'Você está atualmente conversando com um bot especializado.';
      case 'nl':
        return 'U chat momenteel met een gespecialiseerde bot.';
      case 'tr':
        return 'Şu anda özel bir botla sohbet ediyorsunuz.';
      case 'pl':
        return 'Obecnie rozmawiasz z wyspecjalizowanym botem.';
      case 'sv':
        return 'Du chattar för närvarande med en specialiserad bot.';
      default:
        return 'You\'re currently chatting with a specialized bot.';
    }
  };

  // Empty chat message to show initially
  const emptyChatMessage = (
    <div className="welcome-message">
      <div className="bot-avatar">🤖</div>
      <div className="welcome-text">
        <p>{getWelcomeMessage()}</p>
        {botId && (
          <p className="bot-context-message">
            {getBotContextMessage()}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="chat-section">
      <div className="chat-container">
        {emptyChatMessage}
        {chatMessages}
        {typingIndicator}
        <div ref={messagesEndRef} />
      </div>
      
      <form className="message-form" onSubmit={handleSendMessage}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={
            selectedLanguage === 'en' ? 'Type your message...' : 
            selectedLanguage === 'es' ? 'Escribe tu mensaje...' :
            selectedLanguage === 'fr' ? 'Tapez votre message...' :
            selectedLanguage === 'de' ? 'Geben Sie Ihre Nachricht ein...' :
            selectedLanguage === 'it' ? 'Scrivi il tuo messaggio...' :
            selectedLanguage === 'ja' ? 'メッセージを入力...' :
            selectedLanguage === 'zh-Hans' ? '输入您的消息...' :
            selectedLanguage === 'zh-Hant' ? '輸入您的消息...' :
            selectedLanguage === 'ru' ? 'Введите ваше сообщение...' :
            selectedLanguage === 'ar' ? 'اكتب رسالتك...' :
            selectedLanguage === 'hi' ? 'अपना संदेश लिखें...' :
            selectedLanguage === 'ko' ? '메시지를 입력하세요...' :
            selectedLanguage === 'pt' ? 'Digite sua mensagem...' :
            selectedLanguage === 'nl' ? 'Typ uw bericht...' :
            selectedLanguage === 'tr' ? 'Mesajınızı yazın...' :
            selectedLanguage === 'pl' ? 'Wpisz swoją wiadomość...' :
            selectedLanguage === 'sv' ? 'Skriv ditt meddelande...' :
            'Type your message...'
          }
          disabled={isLoading}
        />
        <button type="submit" disabled={!newMessage.trim() || isLoading}>
          {selectedLanguage === 'en' ? 'Send' : 
           selectedLanguage === 'es' ? 'Enviar' :
           selectedLanguage === 'fr' ? 'Envoyer' :
           selectedLanguage === 'de' ? 'Senden' :
           selectedLanguage === 'it' ? 'Invia' :
           selectedLanguage === 'ja' ? '送信' :
           selectedLanguage === 'zh-Hans' ? '发送' :
           selectedLanguage === 'zh-Hant' ? '發送' :
           selectedLanguage === 'ru' ? 'Отправить' :
           selectedLanguage === 'ar' ? 'إرسال' :
           selectedLanguage === 'hi' ? 'भेजें' :
           selectedLanguage === 'ko' ? '보내기' :
           selectedLanguage === 'pt' ? 'Enviar' :
           selectedLanguage === 'nl' ? 'Verstuur' :
           selectedLanguage === 'tr' ? 'Gönder' :
           selectedLanguage === 'pl' ? 'Wyślij' :
           selectedLanguage === 'sv' ? 'Skicka' :
           'Send'}
        </button>
      </form>
    </div>
  );
};

export default ChatSection;
