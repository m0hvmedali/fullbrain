
import { StandardizedMessage, MessageSource, MessageDirection } from '../types';

const generateId = () => Math.random().toString(36).substring(2, 15);

const decodeInstagramText = (text: string): string => {
  try {
    return decodeURIComponent(escape(text));
  } catch (e) {
    return text;
  }
};

const analyzeMetrics = (content: string) => ({
  message_length: content.length,
  word_count: content.split(/\s+/).filter(w => w.length > 0).length,
  has_question: content.includes('?') || content.includes('؟'),
  has_exclamation: content.includes('!'),
});

// المعالج العام لأي ملف نصي لا ينتمي لتنسيق محدد
const parseGenericContent = (text: string, fileName: string): StandardizedMessage[] => {
  const messages: StandardizedMessage[] = [];
  // تقسيم النص إلى قطع (Chunks) بحجم 1500 حرف لسهولة المعالجة
  const chunkSize = 1500;
  // Added explicit string[] type to prevent TypeScript from inferring 'never[]' when the match result is empty
  const chunks: string[] = text.match(new RegExp(`[\\s\\S]{1,${chunkSize}}`, 'g')) || [];

  chunks.forEach((chunk, index) => {
    messages.push({
      id: `${fileName}_${index}_${generateId()}`,
      source: 'whatsapp', // نعتبرها مادة خام للذاكرة
      conversation_id: `raw_${fileName}`,
      person_or_title: fileName,
      timestamp: Date.now() - (chunks.length - index) * 1000,
      sender: "بيانات خام",
      direction: 'received',
      content: chunk.trim(),
      meta: analyzeMetrics(chunk)
    });
  });

  return messages;
};

export const parseWhatsApp = (text: string, fileName: string): StandardizedMessage[] => {
  const messages: StandardizedMessage[] = [];
  const lines = text.split('\n');
  const standardRegex = /^(\d{1,2}[./-]\d{1,2}[./-]\d{2,4}),\s(\d{1,2}:\d{2}(?::\d{2})?\s?(?:[AP]M)?)\s-\s([^:]+):\s(.*)$/i;
  const bracketRegex = /^\[(\d{1,2}[./-]\d{1,2}[./-]\d{2,4}),\s(\d{1,2}:\d{2}(?::\d{2})?)\]\s([^:]+):\s(.*)$/i;

  let currentMsg: StandardizedMessage | null = null;

  lines.forEach(line => {
    const match = line.match(standardRegex) || line.match(bracketRegex);
    if (match) {
      const [_, date, time, sender, content] = match;
      if (content.includes('<Media omitted>') || content.includes('تم حذف الوسائط')) return;
      
      currentMsg = {
        id: generateId(),
        source: 'whatsapp',
        conversation_id: `wa_${fileName}`,
        person_or_title: sender.trim(),
        timestamp: new Date(`${date.replace(/\./g, '/')} ${time}`).getTime() || Date.now(),
        sender: sender.trim(),
        direction: 'received',
        content: content.trim(),
        meta: analyzeMetrics(content)
      };
      messages.push(currentMsg);
    } else if (currentMsg && line.trim()) {
      currentMsg.content += '\n' + line.trim();
      currentMsg.meta = analyzeMetrics(currentMsg.content);
    }
  });
  
  // إذا لم ينجح في استخراج رسائل بتنسيق واتساب، نستخدم المعالج العام
  return messages.length > 0 ? messages : parseGenericContent(text, fileName);
};

export const parseInstagram = (json: any, fileName: string): StandardizedMessage[] => {
  const messages: StandardizedMessage[] = [];
  const threadId = json.thread_path || fileName;
  const participants = json.participants?.map((p: any) => decodeInstagramText(p.name)) || [];
  
  if (json.messages) {
    json.messages.forEach((m: any) => {
      if (!m.content) return;
      const cleanContent = decodeInstagramText(m.content);
      const senderName = decodeInstagramText(m.sender_name);
      
      messages.push({
        id: generateId(),
        source: 'instagram',
        conversation_id: `ig_${threadId}`,
        person_or_title: participants.find((p: string) => p !== senderName) || 'Instagram Chat',
        timestamp: m.timestamp_ms,
        sender: senderName,
        direction: 'received',
        content: cleanContent,
        meta: analyzeMetrics(cleanContent)
      });
    });
  }
  return messages.length > 0 ? messages : parseGenericContent(JSON.stringify(json), fileName);
};

export const parseChatGPT = (html: string, fileName: string): StandardizedMessage[] => {
  const messages: StandardizedMessage[] = [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const messageElements = doc.querySelectorAll('.message, [class*="message"]');
  
  messageElements.forEach((el, idx) => {
    const role = el.textContent?.toLowerCase().includes('user') ? 'user' : 'assistant';
    const content = el.textContent || '';
    if (content.trim()) {
      messages.push({
        id: generateId(),
        source: 'chatgpt',
        conversation_id: `gpt_${fileName}`,
        person_or_title: fileName,
        timestamp: Date.now() - (messageElements.length - idx) * 1000,
        sender: role === 'user' ? 'User' : 'ChatGPT',
        direction: role === 'user' ? 'sent' : 'received',
        content: content.trim(),
        meta: analyzeMetrics(content)
      });
    }
  });
  
  return messages.length > 0 ? messages : parseGenericContent(html, fileName);
};

export const processRawData = async (data: string, fileName: string): Promise<StandardizedMessage[]> => {
  const name = fileName.toLowerCase();
  try {
    if (name.endsWith('.json')) {
      try {
        const json = JSON.parse(data);
        return parseInstagram(json, fileName);
      } catch {
        return parseGenericContent(data, fileName);
      }
    }
    if (name.endsWith('.html') || name.endsWith('.htm')) {
      return parseChatGPT(data, fileName);
    }
    // أي ملف آخر أو ملف نصي يعامل كمعالج عام إذا فشل واتساب
    return parseWhatsApp(data, fileName);
  } catch (e) {
    return parseGenericContent(data, fileName);
  }
};

export const processFile = async (file: File): Promise<StandardizedMessage[]> => {
  try {
    const text = await file.text();
    return processRawData(text, file.name);
  } catch (err) {
    console.error(`Failed to read file ${file.name}:`, err);
    return [];
  }
};
