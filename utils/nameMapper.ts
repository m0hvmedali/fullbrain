
import { GoogleGenAI } from "@google/genai";

// قاموس محلي للأسماء البديلة (الخطة البديلة في حال عدم توفر AI)
const LOCAL_NAME_DICTIONARY: Record<string, string[]> = {
  "محمد": ["mohamed", "mohammad", "mhd", "mohammed"],
  "أحمد": ["ahmed", "ahmad"],
  "ملك": ["malak", "melo"],
  "سارة": ["sara", "sarah"],
  "علي": ["ali"],
  "ChatGPT": ["assistant", "gpt", "ai"]
};

export const isSamePerson = async (name1: string, name2: string): Promise<boolean> => {
  const n1 = name1.toLowerCase().trim();
  const n2 = name2.toLowerCase().trim();

  if (n1 === n2) return true;

  // 1. تحقق من القاموس المحلي أولاً (سرعة قصوى)
  for (const [canonical, aliases] of Object.entries(LOCAL_NAME_DICTIONARY)) {
    const all = [canonical.toLowerCase(), ...aliases.map(a => a.toLowerCase())];
    if (all.includes(n1) && all.includes(n2)) return true;
  }

  // 2. استخدام AI فقط للتأكد من التطابق اللغوي بين العربية والإنجليزية
  if (process.env.API_KEY) {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Is the name "${name1}" and the name "${name2}" likely referring to the same person? Reply with ONLY "TRUE" or "FALSE".`,
        config: { temperature: 0.1 }
      });
      return response.text?.toUpperCase().includes("TRUE") || false;
    } catch (e) {
      console.warn("AI Name Mapping failed, using string similarity logic.");
    }
  }

  // 3. منطق تشابه بسيط كحل أخير
  return n1.includes(n2) || n2.includes(n1);
};
