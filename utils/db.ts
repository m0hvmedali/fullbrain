
import { StandardizedMessage } from '../types';

const DB_NAME = 'MemoryIntelligenceDB';
const STORE_NAME = 'messages';
const DB_VERSION = 1;

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveMessages = async (messages: StandardizedMessage[]): Promise<void> => {
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  messages.forEach(msg => store.put(msg));
  return new Promise((resolve, reject) => {
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
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).clear();
  return new Promise((resolve) => {
    tx.oncomplete = () => resolve();
  });
};
