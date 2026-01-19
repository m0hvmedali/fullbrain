
import { GoogleGenAI, Type } from "@google/genai";

/**
 * Standardized AI retrieval and generation utility.
 */
export const getAI = () => {
  const apiKey = (globalThis as any).process?.env?.API_KEY;
  if (!apiKey) throw new Error("API_KEY_MISSING");
  return new GoogleGenAI({ apiKey });
};

export const AI_MODELS = {
  text: 'gemini-3-flash-preview',
  pro: 'gemini-3-pro-preview',
  voice: 'gemini-2.5-flash-native-audio-preview-12-2025',
  images: 'gemini-2.5-flash-image'
};

export const summarizeConversation = async (messages: any[]) => {
  try {
    const ai = getAI();
    const context = messages.slice(-100).map(m => `[${m.sender}]: ${m.content}`).join('\n');
    const response = await ai.models.generateContent({
      model: AI_MODELS.text,
      contents: `قم بتلخيص المحادثة التالية بأسلوب ذكي ومختصر (3-4 جمل). ركز على القرارات، المواعيد، أو المواضيع الجوهرية:\n\n${context}`,
      config: { 
        temperature: 0.3,
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    return response.text;
  } catch (e) {
    console.error("Summarization error:", e);
    return "عذراً، تعذر إنشاء الملخص الذكي في هذه اللحظة.";
  }
};

export const generateSmartInsight = async (messages: any[]) => {
  try {
    const ai = getAI();
    const sample = messages.slice(-60).map(m => `[${m.sender}]: ${m.content}`).join('\n');
    const response = await ai.models.generateContent({
      model: AI_MODELS.text,
      contents: `بناءً على سجل المحادثات الأخير، قدم ملاحظة ذكية أو نصيحة استراتيجية واحدة قصيرة باللغة العربية تعكس اهتمامات المستخدم أو نمط حياته:\n\n${sample}`,
      config: { temperature: 0.8 }
    });
    return response.text;
  } catch (e) {
    console.error("Insight generation error:", e);
    return null;
  }
};
