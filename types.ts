
export type MessageSource = 'whatsapp' | 'instagram' | 'chatgpt';
export type MessageDirection = 'sent' | 'received' | 'system';

export interface MessageMeta {
  message_length: number;
  has_question: boolean;
  has_exclamation: boolean;
  word_count: number;
}

export interface StandardizedMessage {
  id: string;
  source: MessageSource;
  conversation_id: string;
  person_or_title: string;
  timestamp: number;
  sender: string;
  direction: MessageDirection;
  content: string;
  meta: MessageMeta;
}

export interface ConversationSummary {
  id: string;
  title: string;
  source: MessageSource;
  lastMessageTimestamp: number;
  messageCount: number;
  participants: string[];
}

export interface SearchFilters {
  keyword: string;
  sender: string;
  source: MessageSource | 'all';
  dateFrom: string;
  dateTo: string;
  minLength: number;
}

export interface PromptTemplate {
  id: string;
  title: string;
  content: string;
  category: string;
  createdAt: number;
}
