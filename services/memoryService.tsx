
import React from 'react';
import { 
  Shield, User, Heart, MessageCircle, Folder, FileText, 
  Search, Zap, Filter, ChevronDown, ChevronUp, Copy, Check, Download, Sparkles 
} from "lucide-react";
// Use getAllUnifiedMessages instead of the non-existent allData export
import { getAllUnifiedMessages } from "../data/index";
import { searchMessagesInDB } from "../utils/db";

/**
 * محرك البحث والتحليل المحلي (Hybrid Logic-Based Intelligence)
 * يقوم بالبحث في البيانات الثابتة وفي قاعدة البيانات المحلية IndexedDB
 */
export const searchMemory = async (query: string) => {
  const lowerQuery = (query || '').toLowerCase().trim();
  if (!lowerQuery) return [];

  let intelligenceDossiers: any[] = [];

  // 1. البحث في البيانات الثابتة (Static Data)
  // Using the unified messages engine to scan static archives
  const staticMessages = getAllUnifiedMessages();

  staticMessages.forEach((entry: any) => {
    let relevanceScore = 0;
    const subjectName = entry.name || entry.title || entry.sender || 'مجهول';

    const weights: Record<string, number> = { 
      name: 10, title: 8, content: 7, message: 7, text: 6, background: 4, definition: 5
    };

    Object.entries(entry).forEach(([key, value]) => {
      if (typeof value === 'string') {
        const val = value.toLowerCase();
        if (val.includes(lowerQuery)) {
          relevanceScore += (weights[key] || 1);
          if (val === lowerQuery) relevanceScore += 10;
        }
      }
    });

    if (relevanceScore > 0) {
      intelligenceDossiers.push({
        subject: subjectName,
        content: entry,
        sourceFile: entry.sourceFile || 'static_file',
        relevanceScore: relevanceScore
      });
    }
  });

  // 2. البحث في قاعدة البيانات المحلية (IndexedDB)
  const dbResults = await searchMessagesInDB(lowerQuery);
  dbResults.forEach(msg => {
    intelligenceDossiers.push({
      subject: msg.sender,
      content: msg,
      sourceFile: `Local Repository (${msg.source})`,
      relevanceScore: 7 // درجة ثابتة للرسائل المستوردة
    });
  });

  // ترتيب النتائج حسب درجة الصلة (الأعلى أولاً)
  return intelligenceDossiers.sort((a, b) => b.relevanceScore - a.relevanceScore);
};

/**
 * مكون بسيط لتظليل النص المطابق للاستعلام
 */
export const HighlightText = ({ text, highlight }: { text: any, highlight: string }) => {
  if (!text) return null;
  const str = String(text);
  if (!highlight.trim()) return <span>{str}</span>;
  
  try {
    const parts = str.split(new RegExp(`(${highlight.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === highlight.toLowerCase() 
            ? <span key={i} className="bg-yellow-500/30 text-yellow-200 px-0.5 rounded font-bold">{part}</span> 
            : part
        )}
      </span>
    );
  } catch (e) {
    return <span>{str}</span>;
  }
};
