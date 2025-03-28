import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, Paperclip, Smile } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: string;
  reactions?: string[];
  attachments?: { name: string; url: string }[];
  isError?: boolean;
}

interface ChatSectionProps {
  selectedLanguage: string;
  botId?: string;
}

const ChatSection: React.FC<ChatSectionProps> = ({ selectedLanguage, botId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt']
    },
    onDrop: (acceptedFiles) => {
      setAttachments([...attachments, ...acceptedFiles]);
    }
  });

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const addReaction = (messageId: string, reaction: string) => {
    setMessages(messages.map(message => {
      if (message.id === messageId) {
        return {
          ...message,
          reactions: [...(message.reactions || []), reaction]
        };
      }
      return message;
    }));
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() && attachments.length === 0) return;
    
    const messageId = Date.now().toString();
    const newUserMessage: Message = {
      id: messageId,
      text: newMessage.trim(),
      sender: 'user',
      timestamp: new Date().toLocaleTimeString(),
      attachments: attachments.map(file => ({
        name: file.name,
        url: URL.createObjectURL(file)
      }))
    };
    
    setMessages(prev => [...prev, newUserMessage]);
    setNewMessage('');
    setAttachments([]);
    setIsLoading(true);

    try {
      // Simulated API call - replace with actual implementation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: 'This is a simulated response. Replace with actual API integration.',
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString()
      };
      
      setMessages(prev => [...prev, botResponse]);
    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'An error occurred. Please try again.',
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString(),
        isError: true
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(message => (
          <div
            key={message.id}
            className={`chat-bubble ${message.sender} ${message.isError ? 'error' : ''}`}
          >
            <div className="flex flex-col">
              <div className="message-content">
                <p>{message.text}</p>
                {message.attachments?.map((attachment, index) => (
                  <div key={index} className="mt-2">
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline"
                    >
                      📎 {attachment.name}
                    </a>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between mt-1 text-xs text-gray-500">
                <span>{message.timestamp}</span>
                {message.reactions && message.reactions.length > 0 && (
                  <div className="flex space-x-1">
                    {message.reactions.map((reaction, index) => (
                      <span key={index} className="reaction">{reaction}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 p-4">
        <form onSubmit={handleSendMessage} className="flex items-end space-x-2">
          <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <div className="flex items-end p-2">
              <div {...getRootProps()} className="mr-2">
                <input {...getInputProps()} />
                <button
                  type="button"
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Paperclip className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 resize-none bg-transparent border-0 focus:ring-0 p-2 h-10 max-h-40"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
              />
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Smile className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            {attachments.length > 0 && (
              <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
                <div className="flex flex-wrap gap-2">
                  {attachments.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center bg-gray-100 dark:bg-gray-700 rounded px-2 py-1"
                    >
                      <span className="text-sm truncate max-w-xs">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => setAttachments(attachments.filter((_, i) => i !== index))}
                        className="ml-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={!newMessage.trim() && attachments.length === 0}
            className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatSection;