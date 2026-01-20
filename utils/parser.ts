
import { StandardizedMessage } from '../types';
import { saveMessages } from './db';

const generateId = () => Math.random().toString(36).substring(2, 15);

const analyzeMetrics = (content: string) => ({
  message_length: content.length,
  word_count: content.split(/\s+/).length,
  has_question: content.includes('?') || content.includes('؟'),
  has_exclamation: content.includes('!'),
});

/**
 * محرك تحليل HTML الذكي - مصمم خصيصاً لمخرجات ChatGPT و AI
 * يدعم الهياكل المعقدة والرسائل الطويلة
 */
const parseHTMLContent = (html: string, fileName: string): StandardizedMessage[] => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const messages: StandardizedMessage[] = [];
  const conversationId = `html_${generateId()}`;

  // البحث عن الرسائل بناءً على سمات ChatGPT (Role-based) أو الكلاسات الشائعة
  const selectors = [
    '[data-message-author-role]', // التنسيق الحديث لـ ChatGPT
    '.chat-message', 
    '.conversation-item', 
    '.w-full.text-token-text-primary'
  ];
  
  let messageNodes: NodeListOf<Element> | any[] = [];
  for (const selector of selectors) {
    messageNodes = doc.querySelectorAll(selector);
    if (messageNodes.length > 0) break;
  }

  if (messageNodes.length > 0) {
    messageNodes.forEach((node: any, index: number) => {
      const role = node.getAttribute('data-message-author-role') || 
                   (node.innerHTML.toLowerCase().includes('assistant') ? 'assistant' : 'user');
      
      const contentNode = node.querySelector('.markdown, .prose, .text-base') || node;
      const text = contentNode.textContent?.trim() || "";
      
      if (text) {
        messages.push({
          id: generateId(),
          source: 'chatgpt',
          conversation_id: conversationId,
          person_or_title: fileName,
          timestamp: Date.now() - (messageNodes.length - index) * 60000,
          sender: role === 'assistant' ? 'Assistant (AI)' : 'User',
          direction: role === 'assistant' ? 'received' : 'sent',
          content: text,
          meta: analyzeMetrics(text)
        });
      }
    });
  } else {
    // نظام الاستخراج العميق في حال عدم وجود بنية قياسية
    const items = doc.querySelectorAll('div, p');
    let lastRole: 'sent' | 'received' = 'sent';
    
    items.forEach((item, index) => {
      const text = item.textContent?.trim();
      if (text && text.length > 5) {
        const isAI = text.toLowerCase().startsWith('chatgpt') || text.toLowerCase().startsWith('assistant');
        const isUser = text.toLowerCase().startsWith('you') || text.toLowerCase().startsWith('user');
        
        if (isAI || isUser) {
          lastRole = isAI ? 'received' : 'sent';
          return;
        }

        if (messages.length > 0 && messages[messages.length-1].direction === lastRole) {
           messages[messages.length-1].content += "\n" + text;
        } else {
          messages.push({
            id: generateId(),
            source: 'chatgpt',
            conversation_id: conversationId,
            person_or_title: fileName,
            timestamp: Date.now() - (items.length - index) * 1000,
            sender: lastRole === 'received' ? 'Assistant (AI)' : 'User',
            direction: lastRole,
            content: text,
            meta: analyzeMetrics(text)
          });
        }
      }
    });
  }
  return messages;
};

/**
 * تحليل سطر واتساب بكفاءة regex عالية
 */
const parseWhatsAppLine = (line: string) => {
  const pattern = /^\[?(\d{1,2}\/\d{1,2}\/\d{2,4},?\s\d{1,2}:\d{1,2}(?::\d{1,2})?(?:\s[AP]M)?)\]?\s(?:-\s)?([^:]+):\s(.*)$/;
  const match = line.match(pattern);
  if (match) {
    return {
      timestamp: Date.parse(match[1].replace(',', '')) || Date.now(),
      sender: match[2].trim(),
      content: match[3].trim()
    };
  }
  return null;
};

/**
 * محرك الاستيعاب الرئيسي (Ultra-High Performance Ingestion)
 * مصمم للتعامل مع ملفات تحتوي على 60,000+ رسالة
 */
export const processFile = async (
  file: File, 
  onProgress?: (progress: number) => void
): Promise<number> => {
  const CHUNK_SIZE = 1024 * 1024 * 4; // 4MB chunks
  let offset = 0;
  let totalSaved = 0;
  const conversationId = `file_${file.name}_${generateId()}`;

  if (file.name.endsWith('.html')) {
    const content = await file.text();
    const messages = parseHTMLContent(content, file.name);
    
    const BATCH_SIZE = 500;
    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const batch = messages.slice(i, i + BATCH_SIZE);
      await saveMessages(batch);
      totalSaved += batch.length;
      if (onProgress) onProgress(Math.round(((i + batch.length) / messages.length) * 100));
      await new Promise(r => setTimeout(r, 0));
    }
    return totalSaved;
  }

  // معالجة الملفات النصية الضخمة (واتساب) بنظام التدفق
  let leftover = "";
  let currentMsg: StandardizedMessage | null = null;
  const decoder = new TextDecoder();
  const BATCH_THRESHOLD = 1000;
  let currentBatch: StandardizedMessage[] = [];

  while (offset < file.size) {
    const chunk = file.slice(offset, offset + CHUNK_SIZE);
    const buffer = await chunk.arrayBuffer();
    const text = leftover + decoder.decode(buffer, { stream: true });
    
    const lines = text.split(/\r?\n/);
    leftover = lines.pop() || "";
    
    for (const line of lines) {
      if (!line.trim()) continue;

      const parsed = parseWhatsAppLine(line);
      if (parsed) {
        if (currentMsg) {
          currentBatch.push(currentMsg);
          if (currentBatch.length >= BATCH_THRESHOLD) {
            await saveMessages(currentBatch);
            totalSaved += currentBatch.length;
            currentBatch = [];
          }
        }
        currentMsg = {
          id: generateId(),
          source: 'whatsapp',
          conversation_id: conversationId,
          person_or_title: file.name,
          timestamp: parsed.timestamp,
          sender: parsed.sender,
          direction: 'received',
          content: parsed.content,
          meta: analyzeMetrics(parsed.content)
        };
      } else if (currentMsg) {
        currentMsg.content += "\n" + line;
        currentMsg.meta = analyzeMetrics(currentMsg.content);
      }
    }

    offset += CHUNK_SIZE;
    if (onProgress) onProgress(Math.min(99, Math.round((offset / file.size) * 100)));
    await new Promise(r => setTimeout(r, 5)); // تقليل الضغط على المعالج
  }

  // تفريغ الباقي
  if (currentMsg) currentBatch.push(currentMsg);
  if (currentBatch.length > 0) {
    await saveMessages(currentBatch);
    totalSaved += currentBatch.length;
  }

  if (onProgress) onProgress(100);
  return totalSaved;
};
