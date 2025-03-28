import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { chatApi, botApi, documentApi } from '../services/api';
import { Bot, Document, ChatMessage, ChatResponse, TranslationResponse } from '../types/api';

interface ApiState {
  bots: Bot[];
  documents: Document[];
  selectedBot: Bot | null;
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  language: string;
}

interface ApiActions {
  setBots: (bots: Bot[]) => void;
  setDocuments: (documents: Document[]) => void;
  setSelectedBot: (bot: Bot | null) => void;
  setMessages: (messages: ChatMessage[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setLanguage: (language: string) => void;
}

interface ApiContextType extends ApiState, ApiActions {
  fetchBots: () => Promise<void>;
  fetchDocuments: () => Promise<void>;
  sendMessage: (message: string) => Promise<void>;
  translateMessage: (text: string, fromLanguage: string, toLanguage: string) => Promise<TranslationResponse>;
  createBot: (botData: any) => Promise<Bot>;
  updateBot: (botId: string, botData: any) => Promise<Bot>;
  deleteBot: (botId: string) => Promise<void>;
  addDocumentToBot: (botId: string, documentId: string) => Promise<void>;
  removeDocumentFromBot: (botId: string, documentId: string) => Promise<void>;
  uploadDocument: (file: File) => Promise<Document>;
  deleteDocument: (documentId: string) => Promise<void>;
}

const initialState: ApiState = {
  bots: [],
  documents: [],
  selectedBot: null,
  messages: [],
  loading: false,
  error: null,
  language: 'en',
};

const ApiContext = createContext<ApiContextType | undefined>(undefined);

export const ApiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<ApiState>(initialState);

  const setBots = (bots: Bot[]) => setState(prev => ({ ...prev, bots }));
  const setDocuments = (documents: Document[]) => setState(prev => ({ ...prev, documents }));
  const setSelectedBot = (bot: Bot | null) => setState(prev => ({ ...prev, selectedBot: bot }));
  const setMessages = (messages: ChatMessage[]) => setState(prev => ({ ...prev, messages }));
  const setLoading = (loading: boolean) => setState(prev => ({ ...prev, loading }));
  const setError = (error: string | null) => setState(prev => ({ ...prev, error }));
  const setLanguage = (language: string) => setState(prev => ({ ...prev, language }));

  const fetchBots = async () => {
    try {
      setLoading(true);
      const bots = await botApi.getBots();
      setBots(bots);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch bots');
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const documents = await documentApi.getDocuments();
      setDocuments(documents);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (message: string) => {
    try {
      setLoading(true);
      const response = await chatApi.sendMessage(message, state.selectedBot?.id, state.language);
      
      if (response.success) {
        const newMessage: ChatMessage = {
          id: Date.now().toString(),
          text: message,
          sender: 'user',
          timestamp: new Date().toLocaleTimeString(),
        };

        const botMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          text: response.answer,
          sender: 'bot',
          timestamp: new Date().toLocaleTimeString(),
          botId: state.selectedBot?.id,
          sources: response.sources,
        };

        setMessages(prev => [...prev, newMessage, botMessage]);
      } else {
        setError(response.error || 'Failed to send message');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const translateMessage = async (text: string, fromLanguage: string, toLanguage: string) => {
    try {
      setLoading(true);
      const response = await chatApi.translate(text, fromLanguage, toLanguage);
      return response;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to translate message');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <ApiContext.Provider
      value={{
        ...state,
        ...{
          setBots,
          setDocuments,
          setSelectedBot,
          setMessages,
          setLoading,
          setError,
          setLanguage,
          fetchBots,
          fetchDocuments,
          sendMessage,
          translateMessage,
          createBot: botApi.createBot,
          updateBot: botApi.updateBot,
          deleteBot: botApi.deleteBot,
          addDocumentToBot: botApi.addDocumentToBot,
          removeDocumentFromBot: botApi.removeDocumentFromBot,
          uploadDocument: documentApi.uploadDocument,
          deleteDocument: documentApi.deleteDocument,
        },
      }}
    >
      {children}
    </ApiContext.Provider>
  );
};

export const useApi = () => {
  const context = useContext(ApiContext);
  if (context === undefined) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  return context;
};
