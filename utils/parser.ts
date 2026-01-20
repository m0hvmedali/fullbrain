
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
 * معالج متطور لملفات HTML (ChatGPT, Claude, etc.)
 */
const parseHTMLContent = (html: string, fileName: string): StandardizedMessage[] => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const messages: StandardizedMessage[] = [];
  const conversationId = `html_${generateId()}`;

  // البحث عن فقاعات الدردشة بناءً على الأنماط الشائعة في ChatGPT و Claude
  // نبحث عن العناصر التي تحتوي على أدوار (roles) أو فئات معينة (classes)
  const chatElements = doc.querySelectorAll('[data-testimonial], .chat-message, .message, [class*="ConversationItem"], [class*="ChatMessage"]');
  
  if (chatElements.length > 0) {
    chatElements.forEach((node, index) => {
      // محاولة تحديد المرسل بناءً على النص أو الفئة
      const text = node.textContent?.trim() || "";
      let sender = "User";
      
      // منطق تحديد الأدوار في ملفات HTML المستخرجة من AI
      const innerHtml = node.innerHTML.toLowerCase();
      if (innerHtml.includes('assistant') || innerHtml.includes('gpt') || innerHtml.includes('claude') || node.classList.contains('assistant')) {
        sender = "Assistant (AI)";
      }

      if (text) {
        messages.push({
          id: generateId(),
          source: 'chatgpt',
          conversation_id: conversationId,
          person_or_title: fileName,
          timestamp: Date.now() - (chatElements.length - index) * 1000,
          sender: sender,
          direction: sender.includes('AI') ? 'received' : 'sent',
          content: text,
          meta: analyzeMetrics(text)
        });
      }
    });
  } else {
    // Fallback: البحث عن أي بنية تحتوي على نصوص متتالية (مثل فقرات p أو b)
    const items = doc.querySelectorAll('p, div, span, b');
    let lastSender = "User";
    
    items.forEach((item, index) => {
      const content = item.textContent?.trim();
      if (content && content.length > 5) {
        // إذا وجدنا كلمة "ChatGPT" أو "You" كعنوان، نغير المرسل
        const isHeader = content.length < 20 && (content.toLowerCase().includes('you') || content.toLowerCase().includes('chatgpt'));
        if (isHeader) {
          lastSender = content.toLowerCase().includes('you') ? "User" : "Assistant (AI)";
          return;
        }

        messages.push({
          id: generateId(),
          source: 'chatgpt',
          conversation_id: conversationId,
          person_or_title: fileName,
          timestamp: Date.now() - (items.length - index) * 1000,
          sender: lastSender,
          direction: lastSender.includes('AI') ? 'received' : 'sent',
          content: content,
          meta: analyzeMetrics(content)
        });
      }
    });
  }
  
  return messages;
};

/**
 * معالج WhatsApp المطور لدعم الأنماط المختلفة
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
 * محرك الاستيعاب الرئيسي (Chunked Ingestion Engine)
 * يعالج الملفات الكبيرة بكفاءة عالية ويضمن عدم فقدان البيانات
 */
export const processFile = async (
  file: File, 
  onProgress?: (progress: number) => void
): Promise<number> => {
  const CHUNK_SIZE = 1024 * 1024 * 2; // 2MB لكل قطعة لضمان التوازن بين السرعة والاستجابة
  let offset = 0;
  let totalMessagesProcessed = 0;
  const conversationId = `file_${file.name}_${generateId()}`;

  // التعامل مع ملفات HTML ككتلة واحدة نظراً لصعوبة تقسيم الـ DOM
  if (file.name.endsWith('.html') || file.type === 'text/html') {
    const content = await file.text();
    const messages = parseHTMLContent(content, file.name);
    
    // حفظ الرسائل على دفعات صغيرة في قاعدة البيانات
    const DB_BATCH = 200;
    for (let i = 0; i < messages.length; i += DB_BATCH) {
      const batch = messages.slice(i, i + DB_BATCH);
      await saveMessages(batch);
      if (onProgress) onProgress(Math.round(((i + batch.length) / messages.length) * 100));
      await new Promise(r => setTimeout(r, 0)); // السماح للمتصفح بمعالجة مهام أخرى
    }
    return messages.length;
  }

  // المعالجة التدفقية لملفات TXT و JSON الكبيرة
  let leftover = "";
  let currentMsg: StandardizedMessage | null = null;
  const decoder = new TextDecoder("utf-8");

  while (offset < file.size) {
    const chunk = file.slice(offset, offset + CHUNK_SIZE);
    const buffer = await chunk.arrayBuffer();
    const text = leftover + decoder.decode(buffer, { stream: true });
    
    const lines = text.split(/\r?\n/);
    leftover = lines.pop() || ""; // السطر الأخير قد يكون مقطوعاً، نحفظه للقطعة القادمة
    
    const batchMessages: StandardizedMessage[] = [];

    for (const line of lines) {
      if (!line.trim()) continue;

      const parsed = parseWhatsAppLine(line);
      if (parsed) {
        if (currentMsg) batchMessages.push(currentMsg);
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

    if (batchMessages.length > 0) {
      await saveMessages(batchMessages);
      totalMessagesProcessed += batchMessages.length;
    }

    offset += CHUNK_SIZE;
    if (onProgress) onProgress(Math.min(99, Math.round((offset / file.size) * 100)));
    
    // تحسين الأداء: Yield main thread
    await new Promise(r => setTimeout(r, 10));
  }

  // حفظ الرسالة الأخيرة
  if (currentMsg) {
    await saveMessages([currentMsg]);
    totalMessagesProcessed++;
  }

  if (onProgress) onProgress(100);
  return totalMessagesProcessed;
};
