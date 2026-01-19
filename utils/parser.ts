
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
 * معالج الملفات الضخمة: يقرأ النص تدريجياً لتوفير الذاكرة
 */
export const processLargeText = async (
  text: string, 
  fileName: string, 
  onProgress?: (progress: number) => void
): Promise<number> => {
  const lines = text.split('\n');
  const totalLines = lines.length;
  const batchSize = 1000;
  let processedCount = 0;

  for (let i = 0; i < lines.length; i += batchSize) {
    const batch = lines.slice(i, i + batchSize);
    const batchMessages: StandardizedMessage[] = [];

    batch.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      batchMessages.push({
        id: generateId(),
        source: 'whatsapp',
        conversation_id: `file_${fileName}`,
        person_or_title: fileName,
        timestamp: Date.now() - (totalLines - (i + index)) * 1000,
        sender: "سجل",
        direction: 'received',
        content: trimmed,
        meta: analyzeMetrics(trimmed)
      });
    });

    if (batchMessages.length > 0) {
      await saveMessages(batchMessages);
      processedCount += batchMessages.length;
    }

    if (onProgress) {
      onProgress(Math.round(((i + batchSize) / totalLines) * 100));
    }
    
    // تحرير الخيط الرئيسي (Main Thread) لضمان عدم تجميد الواجهة
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  return processedCount;
};

/**
 * قراءة الملفات الضخمة جداً (100MB+) باستخدام القطع (Chunks)
 */
export const processFile = async (file: File, onProgress?: (p: number) => void): Promise<number> => {
    const chunkSize = 5 * 1024 * 1024; // 5MB per chunk
    let offset = 0;
    let totalMessages = 0;
    let leftover = "";

    while (offset < file.size) {
        const chunk = file.slice(offset, offset + chunkSize);
        const text = leftover + (await chunk.text());
        const lines = text.split('\n');
        
        // الاحتفاظ بالسطر الأخير غير المكتمل للمعالجة مع القطعة التالية
        leftover = lines.pop() || "";
        
        const batchMessages: StandardizedMessage[] = lines
            .filter(l => l.trim())
            .map(line => ({
                id: generateId(),
                source: 'whatsapp',
                conversation_id: `file_${file.name}`,
                person_or_title: file.name,
                timestamp: Date.now(),
                sender: "سجل",
                direction: 'received',
                content: line.trim(),
                meta: analyzeMetrics(line)
            }));

        if (batchMessages.length > 0) {
            await saveMessages(batchMessages);
            totalMessages += batchMessages.length;
        }

        offset += chunkSize;
        if (onProgress) onProgress(Math.round((offset / file.size) * 100));
        await new Promise(resolve => setTimeout(resolve, 0));
    }

    // معالجة السطر الأخير إذا وجد
    if (leftover.trim()) {
        await saveMessages([{
            id: generateId(),
            source: 'whatsapp',
            conversation_id: `file_${file.name}`,
            person_or_title: file.name,
            timestamp: Date.now(),
            sender: "سجل",
            direction: 'received',
            content: leftover.trim(),
            meta: analyzeMetrics(leftover)
        }]);
        totalMessages++;
    }

    return totalMessages;
};

export const processRawData = async (data: string, fileName: string): Promise<StandardizedMessage[]> => {
    const lines = data.split('\n').slice(0, 1000);
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
