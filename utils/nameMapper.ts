
import { GoogleGenAI } from "@google/genai";

const LOCAL_NAME_DICTIONARY: Record<string, string[]> = {
  "محمد": ["mohamed", "mohammad", "mhd", "mohammed", "mohamad", "muhammad"],
  "أحمد": ["ahmed", "ahmad", "ahmet"],
  "ملك": ["malak", "melo", "malaak"],
  "سارة": ["sara", "sarah"],
  "علي": ["ali", "aly"],
  "ياسين": ["yassin", "yaseen", "yasin"],
  "ليلى": ["laila", "layla", "leila"],
  "ChatGPT": ["assistant", "gpt", "ai", "bot"]
};

const getApiKey = () => {
  try {
    return (globalThis as any).process?.env?.API_KEY;
  } catch {
    return null;
  }
};

/**
 * Checks if two sender names likely refer to the same person using local matching and AI.
 */
export const isSamePerson = async (name1: string, name2: string): Promise<boolean> => {
  const n1 = name1.toLowerCase().trim();
  const n2 = name2.toLowerCase().trim();

  if (n1 === n2) return true;

  // 1. Local Dictionary Match
  for (const [canonical, aliases] of Object.entries(LOCAL_NAME_DICTIONARY)) {
    const all = [canonical.toLowerCase(), ...aliases.map(a => a.toLowerCase())];
    if (all.includes(n1) && all.includes(n2)) return true;
  }

  // 2. AI Identity Matching
  const apiKey = getApiKey();
  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Determine if these two names refer to the same person. Name 1: "${name1}", Name 2: "${name2}". Output strictly JSON: {"match": boolean}`,
        config: { 
          responseMimeType: "application/json",
          temperature: 0.1 
        }
      });
      const result = JSON.parse(response.text || '{"match": false}');
      return result.match === true;
    } catch (e) {
      console.warn("Name Mapping AI failed, using fallback.");
    }
  }

  // 3. Substring/Fuzzy Fallback
  return n1.includes(n2) || n2.includes(n1);
};
