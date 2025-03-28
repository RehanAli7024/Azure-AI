export interface Bot {
  id: string;
  name: string;
  description: string;
  documentIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
  url: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: string;
  botId?: string;
  isError?: boolean;
  sources?: string[];
}

export interface ChatResponse {
  success: boolean;
  answer: string;
  sources: string[];
  bot_id?: string;
  error?: string;
}

export interface TranslationResponse {
  success: boolean;
  translated_text: string;
  source_language: string;
  target_language: string;
  error?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface BotConfiguration {
  name: string;
  description: string;
  documentIds?: string[];
}
