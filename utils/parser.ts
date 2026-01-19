
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
 * محاولة استخراج بيانات واتساب من سطر نصي
 * يدعم تنسيق iOS: [15/02/2024, 10:14:15 PM] Name: Message
 * ويدعم تنسيق Android: 15/02/2024, 22:14 - Name: Message
 */
const parseWhatsAppLine = (line: string) => {
  // Regex pattern for common WhatsApp export formats
  // Matches date/time, then sender, then message
  const pattern = /^\[?(\d{1,2}\/\d{1,2}\/\d{2,4},?\s\d{1,2}:\d{1,2}(?::\d{1,2})?(?:\s[AP]M)?)\]?\s(?:-\s)?([^:]+):\s(.*)$/;
  const match = line.match(pattern);

  if (match) {
    const rawDate = match[1].replace(',', '');
    // محاولة تحويل التاريخ، وفي حال الفشل نستخدم الوقت الحالي
    let timestamp = Date.parse(rawDate);
    if (isNaN(timestamp)) {
      // التعامل مع تنسيق التاريخ dd/mm/yyyy الذي قد يفشل فيه Date.parse في بعض البيئات
      const parts = rawDate.split(' ');
      const dateParts = parts[0].split('/');
      if (dateParts.length === 3) {
        const [d, m, y] = dateParts;
        const normalizedDate = `${m}/${d}/${y} ${parts.slice(1).join(' ')}`;
        timestamp = Date.parse(normalizedDate);
      }
    }

    return {
      timestamp: !isNaN(timestamp) ? timestamp : Date.now(),
      sender: match[2].trim(),
      content: match[3].trim()
    };
  }

  return null;
};

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
  const CHUNK_SIZE = 1024 * 512; // 512KB لضمان استجابة الواجهة
  let offset = 0;
  let totalMessages = 0;
  let leftover = "";
  const decoder = new TextDecoder("utf-8");
  const conversationId = `file_${file.name}_${Date.now()}`;
  
  // تتبع الرسالة الحالية للتعامل مع الرسائل متعددة الأسطر
  let currentMsg: StandardizedMessage | null = null;

  while (offset < file.size) {
    const chunk = file.slice(offset, offset + CHUNK_SIZE);
    const buffer = await chunk.arrayBuffer();
    const text = leftover + decoder.decode(buffer, { stream: true });
    
    const lines = text.split(/\r?\n/);
    leftover = lines.pop() || "";
    
    if (lines.length > 0) {
      const batchToSave: StandardizedMessage[] = [];

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        const parsed = parseWhatsAppLine(line);
        if (parsed) {
          // إذا كان لدينا رسالة سابقة، نقوم بإضافتها للدفعة قبل بدء رسالة جديدة
          if (currentMsg) {
            batchToSave.push(currentMsg);
          }

          currentMsg = {
            id: generateId(),
            source: 'whatsapp',
            conversation_id: conversationId,
            person_or_title: file.name,
            timestamp: parsed.timestamp,
            sender: parsed.sender,
            direction: 'received', // القيمة الافتراضية
            content: parsed.content,
            meta: analyzeMetrics(parsed.content)
          };
        } else if (currentMsg) {
          // إذا لم يبدأ السطر بنمط رسالة جديدة، فهو تكملة للرسالة السابقة
          currentMsg.content += "\n" + line;
          currentMsg.meta = analyzeMetrics(currentMsg.content);
        } else {
          // في حال عدم وجود رسالة حالية (بداية الملف بدون نمط واتساب)، نعتبرها رسالة بسيطة
          batchToSave.push({
            id: generateId(),
            source: 'whatsapp',
            conversation_id: conversationId,
            person_or_title: file.name,
            timestamp: Date.now(),
            sender: "User",
            direction: 'received',
            content: trimmedLine,
            meta: analyzeMetrics(trimmedLine)
          });
        }
      }

      if (batchToSave.length > 0) {
        await saveMessages(batchToSave);
        totalMessages += batchToSave.length;
      }
    }

    offset += CHUNK_SIZE;
    if (onProgress) onProgress(Math.min(99, Math.round((offset / file.size) * 100)));
    
    await new Promise(resolve => setTimeout(resolve, 5));
  }

  // حفظ آخر رسالة في الملف
  if (currentMsg) {
    await saveMessages([currentMsg]);
    totalMessages += 1;
  }

  if (onProgress) onProgress(100);
  return totalMessages;
};
