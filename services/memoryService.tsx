
import React from 'react';
import { 
  Shield, User, Heart, MessageCircle, Folder, FileText, 
  Search, Zap, Filter, ChevronDown, ChevronUp, Copy, Check, Download, Sparkles 
} from "lucide-react";
import { allData } from "../data/index";

/**
 * محرك البحث والتحليل المحلي (Logic-Based Intelligence)
 */
export const getSmartResponse = (query: string, onSelectChat?: (id: string) => void) => {
  const lowerQuery = (query || '').toLowerCase().trim();
  if (!lowerQuery) return null;

  let intelligenceDossiers: any[] = [];

  // البحث المتقدم في كافة الملفات المستوردة
  Object.entries(allData).forEach(([fileName, dataset]) => {
    if (!Array.isArray(dataset)) return;

    dataset.forEach((entry) => {
      let relevanceScore = 0;
      const subjectName = entry.name || entry.title || entry.sender || 'مجهول';

      // وزن الحقول (Relevance Weighting)
      const weights: any = { name: 10, title: 8, content: 7, message: 7, text: 6 };

      Object.entries(entry).forEach(([key, value]) => {
        if (typeof value === 'string') {
          const val = value.toLowerCase();
          if (val.includes(lowerQuery)) {
            relevanceScore += (weights[key] || 1);
            if (val === lowerQuery) relevanceScore += 10;
          }
        } else if (Array.isArray(value)) {
          value.forEach(item => {
            if (typeof item === 'string' && item.toLowerCase().includes(lowerQuery)) relevanceScore += 2;
          });
        }
      });

      if (relevanceScore > 0) {
        intelligenceDossiers.push({
          subject: subjectName,
          content: entry,
          sourceFile: `${fileName}.json`,
          relevanceScore: relevanceScore
        });
      }
    });
  });

  return intelligenceDossiers.sort((a, b) => b.relevanceScore - a.relevanceScore);
};

// دالة لتظليل النص
export const HighlightText = ({ text, highlight }: { text: any, highlight: string }) => {
  if (!text) return null;
  const str = String(text);
  if (!highlight.trim()) return <span>{str}</span>;
  
  const parts = str.split(new RegExp(`(${highlight})`, 'gi'));
  return (
    <span>
      {parts.map((part, i) => 
        part.toLowerCase() === highlight.toLowerCase() 
          ? <span key={i} className="bg-yellow-500/30 text-yellow-200 px-0.5 rounded font-bold">{part}</span> 
          : part
      )}
    </span>
  );
};
