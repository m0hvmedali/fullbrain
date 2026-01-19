
import { StandardizedMessage, MessageSource, MessageDirection } from '../types';
import { saveMessages } from './db';

const generateId = () => Math.random().toString(36).substring(2, 15);

const analyzeMetrics = (content: string) => ({
  message_length: content.length,
  word_count: content.split(/\s+/).length,
  has_question: content.includes('?') || content.includes('؟'),
  has_exclamation: content.includes('!'),
});

/**
 * معالج الملفات الضخمة: يقوم بتقسيم النص وحفظه في دفعات لتوفير الذاكرة
 */
export const processLargeText = async (
  text: string, 
  fileName: string, 
  onProgress?: (progress: number) => void
): Promise<number> => {
  const messages: StandardizedMessage[] = [];
  const lines = text.split('\n');
  const totalLines = lines.length;
  const batchSize = 1000;
  let processedCount = 0;

  for (let i = 0; i < lines.length; i += batchSize) {
    const batch = lines.slice(i, i + batchSize);
    const batchMessages: StandardizedMessage[] = [];

    batch.forEach((line, index) => {
      if (!line.trim()) return;
      batchMessages.push({
        id: generateId(),
        source: 'whatsapp', // افتراضي
        conversation_id: `file_${fileName}`,
        person_or_title: fileName,
        timestamp: Date.now() - (totalLines - (i + index)) * 1000,
        sender: "سجل ملف",
        direction: 'received',
        content: line.trim(),
        meta: analyzeMetrics(line)
      });
    });

    if (batchMessages.length > 0) {
      await saveMessages(batchMessages);
      processedCount += batchMessages.length;
    }

    if (onProgress) {
      onProgress(Math.round(((i + batchSize) / totalLines) * 100));
    }
    
    // إعطاء المتصفح فرصة للتنفس
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  return processedCount;
};

export const processRawData = async (data: string, fileName: string): Promise<StandardizedMessage[]> => {
    // هذا المعالج القديم للملفات الصغيرة، للملفات الكبيرة يفضل استخدام processLargeText
    const lines = data.split('\n').slice(0, 5000); // تحديد سقف للملفات التقليدية
    return lines.map(line => ({
        id: generateId(),
        source: 'whatsapp',
        conversation_id: `raw_${fileName}`,
        person_or_title: fileName,
        timestamp: Date.now(),
        sender: "بيانات",
        direction: 'received',
        content: line.trim(),
        meta: analyzeMetrics(line)
    }));
};

export const processFile = async (file: File, onProgress?: (p: number) => void): Promise<number> => {
    const text = await file.text();
    return await processLargeText(text, file.name, onProgress);
};
