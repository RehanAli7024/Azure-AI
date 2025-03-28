import axios from 'axios';

// API configuration
const API_BASE_URL = 'http://localhost:5000';

// Create axios instance with default configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor
api.interceptors.request.use(
  (config) => {
    // Add any common headers or modifications here
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      // Handle specific error codes if needed
      if (error.response.status === 401) {
        // Handle unauthorized access
        console.error('Unauthorized access');
      } else if (error.response.status === 404) {
        // Handle not found
        console.error('Resource not found');
      }
    }
    return Promise.reject(error);
  }
);

// Chat API
export const chatApi = {
  sendMessage: async (message: string, botId?: string, language: string = 'en') => {
    try {
      const response = await api.post('/chat', {
        query: message,
        bot_id: botId,
        language: language
      });
      return response.data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  },

  translate: async (text: string, fromLanguage: string = 'en', toLanguage: string = 'en') => {
    try {
      const response = await api.post('/translate', {
        text,
        from_language: fromLanguage,
        to_language: toLanguage
      });
      return response.data;
    } catch (error) {
      console.error('Error translating text:', error);
      throw error;
    }
  }
};

// Bot Management API
export const botApi = {
  getBots: async () => {
    try {
      const response = await api.get('/api/bots');
      return response.data;
    } catch (error) {
      console.error('Error fetching bots:', error);
      throw error;
    }
  },

  createBot: async (botData: any) => {
    try {
      const response = await api.post('/api/bots', botData);
      return response.data;
    } catch (error) {
      console.error('Error creating bot:', error);
      throw error;
    }
  },

  updateBot: async (botId: string, botData: any) => {
    try {
      const response = await api.put(`/api/bots/${botId}`, botData);
      return response.data;
    } catch (error) {
      console.error('Error updating bot:', error);
      throw error;
    }
  },

  deleteBot: async (botId: string) => {
    try {
      const response = await api.delete(`/api/bots/${botId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting bot:', error);
      throw error;
    }
  },

  addDocumentToBot: async (botId: string, documentId: string) => {
    try {
      const response = await api.post(`/api/bots/${botId}/documents`, { documentId });
      return response.data;
    } catch (error) {
      console.error('Error adding document to bot:', error);
      throw error;
    }
  },

  removeDocumentFromBot: async (botId: string, documentId: string) => {
    try {
      const response = await api.delete(`/api/bots/${botId}/documents/${documentId}`);
      return response.data;
    } catch (error) {
      console.error('Error removing document from bot:', error);
      throw error;
    }
  }
};

// Document Management API
export const documentApi = {
  uploadDocument: async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.post('/api/documents', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error uploading document:', error);
      throw error;
    }
  },

  getDocuments: async () => {
    try {
      const response = await api.get('/api/documents');
      return response.data;
    } catch (error) {
      console.error('Error fetching documents:', error);
      throw error;
    }
  },

  deleteDocument: async (documentId: string) => {
    try {
      const response = await api.delete(`/api/documents/${documentId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  }
};

export default api;
