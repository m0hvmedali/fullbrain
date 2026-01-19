
/**
 * هذا الملف هو المصدر الوحيد للبيانات في النظام.
 * سيقوم باستيراد ملفات JSON الموجودة في نفس المجلد.
 */

// ملاحظة: قمت بإنشاء تصديرات افتراضية لتجنب أخطاء البناء إذا كانت الملفات فارغة حالياً
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

// تجميع كافة الرسائل في مصفوفة واحدة للبحث العام
export const getAllUnifiedMessages = () => {
  const unified: any[] = [];
  Object.entries(allData).forEach(([fileName, dataset]) => {
    if (Array.isArray(dataset)) {
      dataset.forEach(entry => {
        if (entry.sender && (entry.text || entry.message)) {
          unified.push({
            ...entry,
            sourceFile: fileName,
            id: Math.random().toString(36).substring(2, 9)
          });
        }
      });
    }
  });
  return unified;
};
