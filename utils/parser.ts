
import { StandardizedMessage, MessageSource, MessageDirection } from '../types';

const generateId = () => Math.random().toString(36).substring(2, 15);

// وظيفة فك تشفير نصوص Instagram العربية (UTF-8 encoded as ISO-8859-1)
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

export const parseWhatsApp = (text: string, fileName: string): StandardizedMessage[] => {
  const messages: StandardizedMessage[] = [];
  const lines = text.split('\n');
  const msgRegex = /^(\d{1,2}\/\d{1,2}\/\d{2,4}),\s(\d{1,2}:\d{2}\s?[AP]M)\s-\s([^:]+):\s(.*)$/i;
  let currentMsg: StandardizedMessage | null = null;

  lines.forEach(line => {
    const match = line.match(msgRegex);
    if (match) {
      const [_, date, time, sender, content] = match;
      if (content.includes('<Media omitted>') || content.includes('encrypted')) return;
      currentMsg = {
        id: generateId(),
        source: 'whatsapp',
        conversation_id: `wa_${fileName}`,
        person_or_title: sender.trim(),
        timestamp: new Date(`${date} ${time}`).getTime() || Date.now(),
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
  return messages;
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
  return messages;
};

export const parseChatGPT = (html: string, fileName: string): StandardizedMessage[] => {
  const messages: StandardizedMessage[] = [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  // محاولة العثور على هيكل المحادثة في ملفات HTML المصدرة
  const messageElements = doc.querySelectorAll('.message, [class*="message"]');
  
  messageElements.forEach((el, idx) => {
    const role = el.textContent?.toLowerCase().includes('user') ? 'user' : 'assistant';
    const content = el.querySelector('.content, [class*="content"]')?.textContent || el.textContent || '';
    
    if (content.trim()) {
      messages.push({
        id: generateId(),
        source: 'chatgpt',
        conversation_id: `gpt_${fileName}`,
        person_or_title: fileName.replace('.html', ''),
        timestamp: Date.now() - (messageElements.length - idx) * 1000,
        sender: role === 'user' ? 'User' : 'ChatGPT',
        direction: role === 'user' ? 'sent' : 'received',
        content: content.trim(),
        meta: analyzeMetrics(content)
      });
    }
  });
  
  return messages;
};

export const processRawData = async (data: string, fileName: string): Promise<StandardizedMessage[]> => {
  const name = fileName.toLowerCase();
  try {
    if (name.endsWith('.json')) {
      const json = JSON.parse(data);
      return parseInstagram(json, fileName);
    }
    if (name.endsWith('.html') || name.endsWith('.htm')) {
      return parseChatGPT(data, fileName);
    }
    if (name.endsWith('.txt')) {
      return parseWhatsApp(data, fileName);
    }
  } catch (e) {
    console.error("Error parsing file:", fileName, e);
  }
  return [];
};

export const processFile = async (file: File): Promise<StandardizedMessage[]> => {
  const text = await file.text();
  return processRawData(text, file.name);
};
