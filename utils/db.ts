
import { StandardizedMessage, PromptTemplate } from '../types';

const DB_NAME = 'MemoryIntelligenceDB';
const STORE_NAME = 'messages';
const PROMPT_STORE = 'prompt_templates';
const DB_VERSION = 3; 

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onupgradeneeded = (event: any) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('conversation_id', 'conversation_id', { unique: false });
        store.createIndex('source', 'source', { unique: false });
      }
      if (!db.objectStoreNames.contains(PROMPT_STORE)) {
        db.createObjectStore(PROMPT_STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveMessages = async (messages: StandardizedMessage[]): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    
    messages.forEach(m => store.put(m));

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const getAllMessages = async (): Promise<StandardizedMessage[]> => {
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const request = store.getAll();
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const clearAllMessages = async (): Promise<void> => {
  const db = await initDB();
  const tx = db.transaction([STORE_NAME, PROMPT_STORE], 'readwrite');
  tx.objectStore(STORE_NAME).clear();
  tx.objectStore(PROMPT_STORE).clear();
  return new Promise((resolve) => {
    tx.oncomplete = () => resolve();
  });
};

export const savePromptTemplate = async (template: PromptTemplate): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PROMPT_STORE, 'readwrite');
    tx.objectStore(PROMPT_STORE).put(template);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const getPromptTemplates = async (): Promise<PromptTemplate[]> => {
  const db = await initDB();
  const tx = db.transaction(PROMPT_STORE, 'readonly');
  const request = tx.objectStore(PROMPT_STORE).getAll();
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const deletePromptTemplate = async (id: string): Promise<void> => {
  const db = await initDB();
  const tx = db.transaction(PROMPT_STORE, 'readwrite');
  tx.objectStore(PROMPT_STORE).delete(id);
  return new Promise((resolve) => {
    tx.oncomplete = () => resolve();
  });
};
