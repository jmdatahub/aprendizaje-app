// Simple ID generator since uuid is not installed
function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  animate?: boolean;
  status?: 'pending' | 'sent' | 'error';
}

export interface Chat {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  section?: string;
  tags?: string[];
  origin: 'aprendizaje' | 'chatPrincipal' | 'ruta' | 'repaso';
  linkedLearningId?: string;
  language?: string;
  emoji?: string;
  color?: string;
}

export interface ChatFilters {
  section?: string;
  text?: string;
  dateRange?: '24h' | 'week' | 'month' | 'all';
  type?: 'aprendizaje' | 'chatPrincipal' | 'ruta' | 'repaso';
}

const STORAGE_KEY = 'app_chats_v2';

class ChatStorageService {
  private getChats(): Chat[] {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('Error loading chats:', e);
      return [];
    }
  }

  private saveChats(chats: Chat[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
      // Dispatch storage event for cross-tab/component sync
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.error('Error saving chats:', e);
    }
  }

  getAllChats(): Chat[] {
    return this.getChats().sort((a, b) => b.updatedAt - a.updatedAt);
  }

  getChat(id: string): Chat | null {
    const chats = this.getChats();
    return chats.find(c => c.id === id) || null;
  }

  saveChat(chat: Chat): void {
    const chats = this.getChats();
    const existingIndex = chats.findIndex(c => c.id === chat.id);

    if (existingIndex >= 0) {
      chats[existingIndex] = { ...chat, updatedAt: Date.now() };
    } else {
      chats.push({ ...chat, createdAt: Date.now(), updatedAt: Date.now() });
    }

    this.saveChats(chats);
  }

  deleteChat(id: string): void {
    const chats = this.getChats();
    const newChats = chats.filter(c => c.id !== id);
    this.saveChats(newChats);
  }

  searchChats(filters: ChatFilters): Chat[] {
    let chats = this.getChats();

    if (filters.section) {
      chats = chats.filter(c => c.section === filters.section);
    }

    if (filters.type) {
      chats = chats.filter(c => c.origin === filters.type);
    }

    if (filters.text) {
      const lowerText = filters.text.toLowerCase();
      chats = chats.filter(c => 
        c.title.toLowerCase().includes(lowerText) || 
        c.messages.some(m => m.content.toLowerCase().includes(lowerText))
      );
    }

    if (filters.dateRange && filters.dateRange !== 'all') {
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;
      let limit = 0;

      switch (filters.dateRange) {
        case '24h': limit = now - oneDay; break;
        case 'week': limit = now - (oneDay * 7); break;
        case 'month': limit = now - (oneDay * 30); break;
      }

      chats = chats.filter(c => c.updatedAt >= limit);
    }

    return chats.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  createChat(partialChat: Partial<Chat>): Chat {
    const newChat: Chat = {
      id: generateId(),
      title: partialChat.title || 'Nuevo Chat',
      messages: partialChat.messages || [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      origin: partialChat.origin || 'chatPrincipal',
      section: partialChat.section,
      tags: partialChat.tags,
      linkedLearningId: partialChat.linkedLearningId,
      language: partialChat.language || 'es'
    };
    this.saveChat(newChat);
    return newChat;
  }
}

export const chatStorage = new ChatStorageService();
