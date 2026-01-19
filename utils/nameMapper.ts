
import { GoogleGenAI } from "@google/genai";

const LOCAL_NAME_DICTIONARY: Record<string, string[]> = {
  "محمد": ["mohamed", "mohammad", "mhd", "mohammed", "mohamad", "muhammad"],
  "أحمد": ["ahmed", "ahmad", "ahmet"],
  "ملك": ["malak", "melo", "malaak"],
  "سارة": ["sara", "sarah"],
  "علي": ["ali", "aly"],
  "ياسين": ["yassin", "yaseen", "yasin"],
  "ChatGPT": ["assistant", "gpt", "ai", "bot"]
};

export const isSamePerson = async (name1: string, name2: string): Promise<boolean> => {
  const n1 = name1.toLowerCase().trim();
  const n2 = name2.toLowerCase().trim();

  if (n1 === n2) return true;

  // 1. القاموس المحلي
  for (const [canonical, aliases] of Object.entries(LOCAL_NAME_DICTIONARY)) {
    const all = [canonical.toLowerCase(), ...aliases.map(a => a.toLowerCase())];
    if (all.includes(n1) && all.includes(n2)) return true;
  }

  // 2. استخدام Gemini API (فقط لمطابقة الأسماء كما هو مطلوب)
  if (process.env.API_KEY) {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Is the identity of "${name1}" and "${name2}" likely the same person in a chat context? (e.g. Arabic vs English spelling). Reply ONLY with JSON: {"match": true/false}`,
        config: { 
          responseMimeType: "application/json",
          temperature: 0.1 
        }
      });
      const result = JSON.parse(response.text || '{"match": false}');
      return result.match === true;
    } catch (e) {
      console.warn("Name AI lookup failed:", e);
    }
  }

  // 3. الحل البديل: تشابه الكلمات
  return n1.includes(n2) || n2.includes(n1);
};
