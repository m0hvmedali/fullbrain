
/**
 * هذا الملف هو المصدر الوحيد للبيانات في النظام.
 * سيقوم باستيراد ملفات JSON الموجودة في نفس المجلد باستخدام مسارات نسبية صحيحة.
 */

import characters from "./characters.json";
import messages from "./messages.json";
import emotions_details from "./emotions_details.json";
import jimmy from "./jimmy.json";
import esraa from "./esraa.json";
import hend from "./hend.json";
import rahoma from "./rahoma.json";

export const allData: Record<string, any[]> = {
  characters,
  messages,
  emotions_details,
  jimmy,
  esraa,
  hend,
  rahoma
};

export const getAllUnifiedMessages = () => {
  const unified: any[] = [];
  Object.entries(allData).forEach(([fileName, dataset]) => {
    if (Array.isArray(dataset)) {
      dataset.forEach(entry => {
        const content = entry.text || entry.message || entry.content;
        if (entry.sender && content) {
          unified.push({
            ...entry,
            sourceFile: fileName,
            id: entry.id || Math.random().toString(36).substring(2, 9)
          });
        }
      });
    }
  });
  return unified;
};
