
import { StandardizedMessage, PromptTemplate, ConversationSummary } from '../types';

const DB_NAME = 'MemoryIntelligenceDB';
const STORE_NAME = 'messages';
const PROMPT_STORE = 'prompt_templates';
const SUMMARY_STORE = 'summaries';
const DB_VERSION = 4;

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
        store.createIndex('content', 'content', { unique: false });
      }
      if (!db.objectStoreNames.contains(PROMPT_STORE)) {
        db.createObjectStore(PROMPT_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(SUMMARY_STORE)) {
        db.createObjectStore(SUMMARY_STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/**
 * حفظ الرسائل بكفاءة عالية مع تحديث الملخصات
 * تم تحسين المنطق ليكون متسلسلاً (Sequential) داخل المعاملة لضمان دقة البيانات
 */
export const saveMessages = async (messages: StandardizedMessage[]): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME, SUMMARY_STORE], 'readwrite');
    const msgStore = tx.objectStore(STORE_NAME);
    const sumStore = tx.objectStore(SUMMARY_STORE);

    // معالجة الرسائل
    for (const m of messages) {
      msgStore.put(m);
    }

    // تجميع تحديثات الملخصات
    const batchUpdates = new Map<string, any>();
    messages.forEach(m => {
      const cId = m.conversation_id;
      if (!batchUpdates.has(cId)) {
        batchUpdates.set(cId, {
          id: cId,
          title: m.person_or_title || m.sender || "محادثة",
          source: m.source,
          lastMessageTimestamp: m.timestamp,
          messageCount: 0,
          participants: new Set<string>()
        });
      }
      const update = batchUpdates.get(cId);
      update.messageCount++;
      if (m.timestamp > update.lastMessageTimestamp) update.lastMessageTimestamp = m.timestamp;
      if (m.sender) update.participants.add(m.sender);
    });

    // تحديث الملخصات في قاعدة البيانات بشكل متزامن داخل المعاملة
    let processed = 0;
    const updateNextSummary = () => {
      const entries = Array.from(batchUpdates.entries());
      if (processed >= entries.length) return;

      const [id, newStats] = entries[processed];
      const getReq = sumStore.get(id);
      
      getReq.onsuccess = () => {
        const existing = getReq.result;
        if (existing) {
          existing.messageCount += newStats.messageCount;
          if (newStats.lastMessageTimestamp > existing.lastMessageTimestamp) {
            existing.lastMessageTimestamp = newStats.lastMessageTimestamp;
          }
          newStats.participants.forEach((p: string) => {
            if (!existing.participants.includes(p)) existing.participants.push(p);
          });
          sumStore.put(existing);
        } else {
          sumStore.put({
            ...newStats,
            participants: Array.from(newStats.participants)
          });
        }
        processed++;
        updateNextSummary();
      };
    };

    updateNextSummary();

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

/**
 * البحث في الرسائل المخزنة محلياً باستخدام Cursors لتحقيق أقصى أداء
 */
export const searchMessagesInDB = async (query: string): Promise<StandardizedMessage[]> => {
  const db = await initDB();
  const lowerQuery = query.toLowerCase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const results: StandardizedMessage[] = [];
    const request = store.openCursor();

    request.onsuccess = (event: any) => {
      const cursor = event.target.result;
      if (cursor) {
        const msg = cursor.value as StandardizedMessage;
        if (msg.content.toLowerCase().includes(lowerQuery) || msg.sender.toLowerCase().includes(lowerQuery)) {
          results.push(msg);
        }
        // نكتفي بـ 200 نتيجة لضمان سرعة الاستجابة في البحث
        if (results.length < 200) {
          cursor.continue();
        } else {
          resolve(results);
        }
      } else {
        resolve(results);
      }
    };
    request.onerror = () => reject(request.error);
  });
};

export const getSummaries = async (): Promise<ConversationSummary[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SUMMARY_STORE, 'readonly');
    const store = tx.objectStore(SUMMARY_STORE);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result as ConversationSummary[]);
    request.onerror = () => reject(request.error);
  });
};

export const getMessagesByConversation = async (conversationId: string): Promise<StandardizedMessage[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('conversation_id');
    const request = index.getAll(IDBKeyRange.only(conversationId));

    request.onsuccess = () => {
      const results = request.result as StandardizedMessage[];
      resolve(results.sort((a, b) => a.timestamp - b.timestamp));
    };
    request.onerror = () => reject(request.error);
  });
};

export const clearAllMessages = async (): Promise<void> => {
  const db = await initDB();
  const tx = db.transaction([STORE_NAME, PROMPT_STORE, SUMMARY_STORE], 'readwrite');
  tx.objectStore(STORE_NAME).clear();
  tx.objectStore(PROMPT_STORE).clear();
  tx.objectStore(SUMMARY_STORE).clear();
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
