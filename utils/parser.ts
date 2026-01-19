
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
 * معالج HTML لملفات ChatGPT وغيرها
 */
const parseHTMLContent = (html: string, fileName: string): StandardizedMessage[] => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const messages: StandardizedMessage[] = [];
  const conversationId = `html_${generateId()}`;

  // أنماط ChatGPT الشائعة في تصديرات HTML
  const messageNodes = doc.querySelectorAll('.message, [class*="message"], .chat-item');
  
  if (messageNodes.length > 0) {
    messageNodes.forEach((node, index) => {
      const authorNode = node.querySelector('.author, [class*="author"], b, strong');
      const contentNode = node.querySelector('.content, [class*="content"], .text, div:last-child');
      
      const sender = authorNode?.textContent?.trim() || "User";
      const content = contentNode?.textContent?.trim() || "";
      
      if (content) {
        messages.push({
          id: generateId(),
          source: 'chatgpt',
          conversation_id: conversationId,
          person_or_title: fileName,
          timestamp: Date.now() + index, // تقريب الطابع الزمني
          sender: sender,
          direction: sender.toLowerCase().includes('assistant') || sender.toLowerCase().includes('gpt') ? 'received' : 'sent',
          content: content,
          meta: analyzeMetrics(content)
        });
      }
    });
  } else {
    // محاولة استخراج الفقرات إذا لم توجد بنية واضحة
    const paragraphs = doc.querySelectorAll('p, div');
    paragraphs.forEach((p, index) => {
      const content = p.textContent?.trim();
      if (content && content.length > 10) {
        messages.push({
          id: generateId(),
          source: 'chatgpt',
          conversation_id: conversationId,
          person_or_title: fileName,
          timestamp: Date.now() + index,
          sender: "System/Extracted",
          direction: 'received',
          content: content,
          meta: analyzeMetrics(content)
        });
      }
    });
  }
  
  return messages;
};

/**
 * المعالج الرئيسي فائق الأداء
 */
export const processFile = async (
  file: File, 
  onProgress?: (progress: number) => void
): Promise<number> => {
  if (file.type === 'text/html' || file.name.endsWith('.html')) {
    const text = await file.text();
    const messages = parseHTMLContent(text, file.name);
    // حفظ على دفعات لتجنب تجميد الواجهة
    const BATCH_SIZE = 500;
    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const batch = messages.slice(i, i + BATCH_SIZE);
      await saveMessages(batch);
      if (onProgress) onProgress(Math.round(((i + batch.length) / messages.length) * 100));
      await new Promise(r => setTimeout(r, 0));
    }
    return messages.length;
  }

  // المعالجة التدفقية لملفات TXT/JSON الضخمة
  const CHUNK_SIZE = 1024 * 1024 * 1; // 1MB لضمان سلاسة الواجهة
  let offset = 0;
  let totalMessages = 0;
  let leftover = "";
  const decoder = new TextDecoder("utf-8");
  const conversationId = `file_${file.name}_${Date.now()}`;

  while (offset < file.size) {
    const chunk = file.slice(offset, offset + CHUNK_SIZE);
    const buffer = await chunk.arrayBuffer();
    const text = leftover + decoder.decode(buffer, { stream: true });
    
    const lines = text.split(/\r?\n/);
    leftover = lines.pop() || "";
    
    if (lines.length > 0) {
      const batchMessages: StandardizedMessage[] = lines
        .filter(l => l.trim().length > 0)
        .map(line => {
          const content = line.trim();
          return {
            id: generateId(),
            source: 'whatsapp',
            conversation_id: conversationId,
            person_or_title: file.name,
            timestamp: Date.now(),
            sender: "User",
            direction: 'received',
            content: content,
            meta: analyzeMetrics(content)
          };
        });

      await saveMessages(batchMessages);
      totalMessages += batchMessages.length;
    }

    offset += CHUNK_SIZE;
    if (onProgress) onProgress(Math.min(100, Math.round((offset / file.size) * 100)));
    
    // أهم سطر: Yielding للـ Main Thread لمنع الانهيار
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  return totalMessages;
};
