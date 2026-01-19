
import { StandardizedMessage, MessageSource, MessageDirection } from '../types';

const generateId = () => Math.random().toString(36).substring(2, 15);

const analyzeMeta = (content: string) => ({
  message_length: content.length,
  word_count: content.split(/\s+/).filter(w => w.length > 0).length,
  has_question: content.includes('?'),
  has_exclamation: content.includes('!'),
});

// Detect Source
export const detectSource = async (file: File): Promise<MessageSource | null> => {
  const text = await file.slice(0, 1000).text();
  
  // WhatsApp: Usually starts with a date pattern like [22/05/2023, 14:30:15] or 22/05/23, 14:30 - 
  const waRegex = /^(\[?\d{1,2}[\/\.]\d{1,2}[\/\.]\d{2,4})|(\d{1,2}[\/\.]\d{1,2}[\/\.]\d{2,4},\s\d{1,2}:\d{2})/;
  if (waRegex.test(text)) return 'whatsapp';

  try {
    const json = JSON.parse(text);
    // ChatGPT: Array of conversation objects with "title" and "mapping"
    if (Array.isArray(json) && json[0]?.mapping && json[0]?.title) return 'chatgpt';
    // Instagram: Object with "messages" array and "participants"
    if (json.messages && Array.isArray(json.messages)) return 'instagram';
  } catch (e) {
    // If partial JSON failed, it might still be a JSON file but larger
    if (file.name.endsWith('.json')) {
        // We'll perform a more thorough check in the actual parser
    }
  }

  if (file.name.includes('message_') && file.name.endsWith('.json')) return 'instagram';
  if (file.name === 'conversations.json') return 'chatgpt';

  return null;
};

// WhatsApp Parser
export const parseWhatsApp = async (file: File): Promise<StandardizedMessage[]> => {
  const text = await file.text();
  const lines = text.split('\n');
  const messages: StandardizedMessage[] = [];
  
  // Standard formats: 
  // [15/01/2023, 21:05:32] Sender Name: Message
  // 15/01/2023, 21:05 - Sender Name: Message
  const regex = /^\[?(\d{1,2}[\/\.]\d{1,2}[\/\.]\d{2,4}),?\s(\d{1,2}:\d{2}(?::\d{2})?(?:\s?[AaPp][Mm])?)\]?\s-?\s?([^:]+):\s(.*)$/;
  
  let currentMsg: StandardizedMessage | null = null;

  for (const line of lines) {
    const match = line.match(regex);
    if (match) {
      const [_, dateStr, timeStr, sender, content] = match;
      if (content.includes('<Media omitted>')) continue;

      // Basic Date Parsing (Note: can be complex due to locale)
      const parts = dateStr.split(/[\/\.]/);
      let d = new Date();
      if (parts.length === 3) {
          const day = parseInt(parts[0]);
          const month = parseInt(parts[1]) - 1;
          const year = parts[2].length === 2 ? 2000 + parseInt(parts[2]) : parseInt(parts[2]);
          d = new Date(year, month, day);
      }
      
      const id = generateId();
      currentMsg = {
        id,
        source: 'whatsapp',
        conversation_id: file.name,
        person_or_title: sender,
        timestamp: d.getTime(), // simplistic, full time parsing skipped for brevity
        sender,
        direction: 'received', // Placeholder, logic needed to detect "me"
        content: content.trim(),
        meta: analyzeMeta(content),
      };
      messages.push(currentMsg);
    } else if (currentMsg && line.trim()) {
      // Append to previous message (multiline)
      currentMsg.content += '\n' + line.trim();
      currentMsg.meta = analyzeMeta(currentMsg.content);
    }
  }
  return messages;
};

// Instagram Parser
export const parseInstagram = async (file: File): Promise<StandardizedMessage[]> => {
  const text = await file.text();
  const data = JSON.parse(text);
  const messages: StandardizedMessage[] = [];
  const conversation_id = data.thread_path || file.name;

  if (data.messages && Array.isArray(data.messages)) {
    data.messages.forEach((m: any) => {
      if (!m.content) return;
      messages.push({
        id: generateId(),
        source: 'instagram',
        conversation_id,
        person_or_title: data.participants?.[0]?.name || 'Instagram Chat',
        timestamp: m.timestamp_ms,
        sender: m.sender_name,
        direction: 'received',
        content: m.content,
        meta: analyzeMeta(m.content),
      });
    });
  }
  return messages.sort((a, b) => a.timestamp - b.timestamp);
};

// ChatGPT Parser
export const parseChatGPT = async (file: File): Promise<StandardizedMessage[]> => {
  const text = await file.text();
  const data = JSON.parse(text);
  const messages: StandardizedMessage[] = [];

  if (Array.isArray(data)) {
    data.forEach((conv: any) => {
      const convId = conv.id || generateId();
      const title = conv.title || 'Untitled Chat';
      
      Object.values(conv.mapping || {}).forEach((node: any) => {
        const msg = node.message;
        if (msg && msg.content && msg.content.parts) {
          const content = msg.content.parts.join('\n').trim();
          if (!content) return;

          messages.push({
            id: msg.id || generateId(),
            source: 'chatgpt',
            conversation_id: convId,
            person_or_title: title,
            timestamp: msg.create_time * 1000,
            sender: msg.author.role,
            direction: msg.author.role === 'user' ? 'sent' : 'received',
            content,
            meta: analyzeMeta(content),
          });
        }
      });
    });
  }
  return messages.sort((a, b) => a.timestamp - b.timestamp);
};
