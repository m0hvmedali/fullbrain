
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
 * معالج الملفات فائق السرعة (Ultra-Fast Stream Processor)
 * يعتمد على قراءة الملف كقطع (Chunks) دون تحميله بالكامل في الذاكرة
 */
export const processFile = async (
  file: File, 
  onProgress?: (progress: number) => void
): Promise<number> => {
  const CHUNK_SIZE = 1024 * 1024 * 2; // 2MB لكل قطعة لضمان توازن السرعة والاستجابة
  let offset = 0;
  let totalMessages = 0;
  let leftover = "";
  const decoder = new TextDecoder("utf-8");

  // استخدام ترويسة ثابتة للمرسل تعتمد على اسم الملف
  const defaultSender = file.name.split('.')[0] || "سجل";

  while (offset < file.size) {
    const chunk = file.slice(offset, offset + CHUNK_SIZE);
    const buffer = await chunk.arrayBuffer();
    const text = leftover + decoder.decode(buffer, { stream: true });
    
    const lines = text.split(/\r?\n/);
    // السطر الأخير قد يكون غير مكتمل، نحتفظ به للقطعة التالية
    leftover = lines.pop() || "";
    
    if (lines.length > 0) {
      const batchMessages: StandardizedMessage[] = lines
        .filter(l => l.trim().length > 0)
        .map(line => {
          const content = line.trim();
          return {
            id: generateId(),
            source: 'whatsapp',
            conversation_id: `file_${file.name}`,
            person_or_title: file.name,
            timestamp: Date.now(),
            sender: defaultSender,
            direction: 'received',
            content: content,
            meta: analyzeMetrics(content)
          };
        });

      if (batchMessages.length > 0) {
        await saveMessages(batchMessages);
        totalMessages += batchMessages.length;
      }
    }

    offset += CHUNK_SIZE;
    if (onProgress) {
      // تحديث التقدم مع ضمان عدم تجميد الواجهة
      onProgress(Math.min(100, Math.round((offset / file.size) * 100)));
    }
    
    // إعطاء فرصة للمتصفح لتحديث الواجهة (Yielding the main thread)
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  // معالجة السطر الأخير المتبقي
  if (leftover.trim()) {
    const content = leftover.trim();
    await saveMessages([{
      id: generateId(),
      source: 'whatsapp',
      conversation_id: `file_${file.name}`,
      person_or_title: file.name,
      timestamp: Date.now(),
      sender: defaultSender,
      direction: 'received',
      content: content,
      meta: analyzeMetrics(content)
    }]);
    totalMessages++;
  }

  return totalMessages;
};

/**
 * دالة مساعدة لمعالجة النصوص الخام الكبيرة التي لا تأتي من ملف مباشرة
 */
export const processLargeText = async (
  text: string, 
  sourceName: string,
  onProgress?: (p: number) => void
): Promise<number> => {
  // تحويل النص إلى Blob لمحاكاة الملف واستخدام محرك المعالجة المتطور
  const blob = new Blob([text], { type: 'text/plain' });
  const file = new File([blob], sourceName);
  return processFile(file, onProgress);
};
