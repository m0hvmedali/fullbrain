
/**
 * محرك البيانات الذكي (Auto-Discovery Data Engine)
 * يقوم بمسح مجلد data تلقائياً ودمج المحتويات في الذاكرة الثابتة
 */

// استيراد جميع الملفات المدعومة تلقائياً من المجلد
const jsonFiles = import.meta.glob('./*.json', { eager: true });
const textFiles = import.meta.glob(['./*.txt', './*.html'], { eager: true, query: '?raw' });

export const getAllUnifiedMessages = () => {
  const unified: any[] = [];

  // 1. معالجة ملفات JSON تلقائياً
  Object.entries(jsonFiles).forEach(([path, content]: [string, any]) => {
    const fileName = path.split('/').pop() || path;
    const data = content.default || content;
    
    if (Array.isArray(data)) {
      data.forEach(entry => {
        const messageContent = entry.text || entry.message || entry.content;
        if (messageContent) {
          unified.push({
            ...entry,
            sourceFile: fileName,
            id: entry.id || `static_${fileName}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: entry.timestamp || Date.now(),
            source: entry.source || 'static-json',
            content: messageContent,
            direction: entry.direction || (entry.sender?.toLowerCase().includes('assistant') ? 'received' : 'sent'),
            conversation_id: entry.conversation_id || `static_${fileName}`
          });
        }
      });
    }
  });

  // 2. معالجة ملفات TXT و HTML تلقائياً (التي يتم وضعها يدوياً في المجلد)
  Object.entries(textFiles).forEach(([path, content]: [string, any]) => {
    const fileName = path.split('/').pop() || path;
    const rawText = content.default || content;
    const conversationId = `static_raw_${fileName}`;

    if (fileName.endsWith('.html')) {
      // تحليل مبسط لملفات HTML الثابتة
      const parser = new DOMParser();
      const doc = parser.parseFromString(rawText, 'text/html');
      const text = doc.body.textContent || "";
      if (text.trim()) {
        unified.push({
          id: `static_${fileName}`,
          content: text.trim().substring(0, 2000), // نأخذ عينة إذا كان ملفاً ضخماً
          sender: "System/Archive",
          timestamp: Date.now(),
          source: 'static-html',
          sourceFile: fileName,
          direction: 'received',
          conversation_id: conversationId
        });
      }
    } else {
      // ملفات نصية عادية
      const lines = rawText.split('\n').slice(0, 1000); // دعم أول 1000 سطر للسرعة
      lines.forEach((line: string, i: number) => {
        if (line.trim().length > 5) {
          unified.push({
            id: `static_${fileName}_${i}`,
            content: line.trim(),
            sender: "Archive",
            timestamp: Date.now() - i * 1000,
            source: 'static-txt',
            sourceFile: fileName,
            direction: 'received',
            conversation_id: conversationId
          });
        }
      });
    }
  });

  return unified;
};
