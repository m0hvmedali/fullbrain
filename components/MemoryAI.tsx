
import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, BrainCircuit, Loader2, Sparkles, MessageSquare, ExternalLink, 
  Info, Mic, MicOff, History, Globe, ShieldCheck, Copy, Check, 
  User, Heart, MessageCircle, FileText, Folder, Headphones, AlertTriangle, Search
} from 'lucide-react';
import { getAI, AI_MODELS } from '../utils/ai';
import { getSmartResponse, HighlightText } from '../services/memoryService';

interface MemoryAIProps {
  onSelectChat: (id: string) => void;
}

const MemoryAI: React.FC<MemoryAIProps> = ({ onSelectChat }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[] | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsProcessing(true);
    setAiInsight(null);
    
    // 1. البحث المحلي الفوري (Logic Engine)
    const localResults = getSmartResponse(query);
    setResults(localResults);

    // 2. التحليل الذكي (AI Insight)
    try {
      const ai = getAI();
      const topContext = localResults?.slice(0, 5).map(r => JSON.stringify(r.content)).join('\n');
      
      const response = await ai.models.generateContent({
        model: AI_MODELS.text,
        contents: `بناءً على نتائج البحث المحلية التالية عن "${query}":\n${topContext}\n\nقدم ملخصاً استخباراتياً ذكياً ومختصراً جداً باللغة العربية.`,
        config: { temperature: 0.3 }
      });
      setAiInsight(response.text || null);
    } catch (err) {
      console.error("AI Error:", err);
    } finally {
      setIsProcessing(false);
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#060606] h-full overflow-hidden" dir="rtl">
      {/* Header */}
      <header className="px-6 py-4 border-b border-white/5 bg-[#080808]/90 backdrop-blur-md flex justify-between items-center z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600/10 rounded-xl flex items-center justify-center border border-indigo-500/20">
            <BrainCircuit className="text-indigo-500" size={20} />
          </div>
          <div>
            <h2 className="text-sm font-black text-white">رادار الذاكرة الاستخباراتي</h2>
            <p className="text-[9px] text-gray-600 uppercase tracking-widest font-black">نظام تحليل البيانات المحلية</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-black text-gray-600">
           <ShieldCheck size={14} className="text-green-900" /> معالجة محلية 100%
        </div>
      </header>

      {/* Results Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar max-w-4xl mx-auto w-full">
        {!results && !isProcessing && (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in opacity-40">
            <Sparkles size={48} className="text-indigo-900 mb-6" />
            <h3 className="text-xl font-black text-gray-500">ادخل مصطلح البحث للتحقيق</h3>
            <p className="text-xs text-gray-700 mt-2">سيتم البحث في كافة السجلات المحلية (الأشخاص، المشاعر، المحادثات)</p>
          </div>
        )}

        {aiInsight && (
          <div className="p-6 bg-indigo-600/5 border border-indigo-500/20 rounded-[2rem] animate-fade-in relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Sparkles size={40} className="text-indigo-500" />
            </div>
            <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Sparkles size={12} /> رؤية المحرك الذكي
            </h4>
            <p className="text-gray-200 leading-relaxed text-sm font-medium">{aiInsight}</p>
          </div>
        )}

        {results && results.map((res, i) => (
          <div key={i} className="animate-fade-in">
             <ResultCard res={res} query={query} onSelectChat={onSelectChat} />
          </div>
        ))}

        {isProcessing && (
          <div className="flex items-center justify-center gap-3 py-10 opacity-50">
            <Loader2 className="animate-spin text-indigo-500" size={20} />
            <span className="text-xs font-black text-indigo-400">جاري استنطاق الذاكرة...</span>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="p-6 border-t border-white/5 bg-[#080808]/95 shrink-0">
        <form onSubmit={handleAsk} className="max-w-3xl mx-auto relative">
          <input 
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن شخص، شعور، أو كلمة في المحادثات..."
            className="w-full bg-[#0D0D0D] border border-white/10 rounded-2xl py-4 px-6 pr-14 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/30 transition-all placeholder:text-gray-800"
          />
          {/* Added missing Search component here, imported from lucide-react */}
          <button type="submit" className="absolute left-2.5 top-1/2 -translate-y-1/2 w-10 h-10 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20 transition-all">
            <Search size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};

const ResultCard = ({ res, query, onSelectChat }: any) => {
  const content = res.content;
  const isPerson = content.relationship_to_user || content.traits;
  const isEmotion = content.family && content.english_name;
  const isMessage = content.sender && (content.text || content.message);

  return (
    <div className={`p-5 rounded-3xl border transition-all hover:scale-[1.01] ${
      isPerson ? 'bg-purple-900/5 border-purple-500/20 hover:border-purple-500/40' :
      isEmotion ? 'bg-pink-900/5 border-pink-500/20 hover:border-pink-500/40' :
      'bg-[#0D0D0D] border-white/5 hover:border-indigo-500/30'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            isPerson ? 'bg-purple-600/20 text-purple-400' :
            isEmotion ? 'bg-pink-600/20 text-pink-400' : 'bg-indigo-600/20 text-indigo-400'
          }`}>
            {isPerson ? <User size={16} /> : isEmotion ? <Heart size={16} /> : <MessageCircle size={16} />}
          </div>
          <div>
            <h4 className="text-sm font-black text-white">
              <HighlightText text={res.subject} highlight={query} />
            </h4>
            <span className="text-[9px] text-gray-600 uppercase font-black tracking-widest">{res.sourceFile}</span>
          </div>
        </div>
        <div className="text-[9px] font-black text-gray-800">صلة: {res.relevanceScore}</div>
      </div>

      <div className="text-xs text-gray-400 leading-relaxed mb-4">
        {isPerson && (
          <div className="space-y-2">
            <p className="text-purple-300 font-bold">{content.relationship_to_user}</p>
            <div className="flex flex-wrap gap-1.5">
              {content.traits?.map((t: any, i: number) => (
                <span key={i} className="px-2 py-0.5 bg-purple-500/10 border border-purple-500/20 rounded text-[9px] text-purple-400">{t}</span>
              ))}
            </div>
            {content.background && <p className="mt-2 text-gray-500 italic"><HighlightText text={content.background} highlight={query} /></p>}
          </div>
        )}

        {isEmotion && (
          <div className="space-y-2">
            <p className="text-pink-300 font-bold">{content.family} - {content.type}</p>
            <p className="text-gray-500"><HighlightText text={content.definition} highlight={query} /></p>
            <div className="flex flex-wrap gap-1">
              {content.branches?.map((b: any, i: number) => (
                <span key={i} className="px-2 py-0.5 bg-pink-500/5 rounded text-[8px] text-pink-500">{b}</span>
              ))}
            </div>
          </div>
        )}

        {isMessage && (
          <div className="space-y-1">
            <div className="flex justify-between items-center mb-1">
               <span className="text-indigo-400 font-black">{content.sender}</span>
               <span className="text-[9px] text-gray-700">{content.time}</span>
            </div>
            <p className="bg-black/30 p-3 rounded-xl border border-white/5 text-gray-300 leading-relaxed">
              <HighlightText text={content.text || content.message} highlight={query} />
            </p>
          </div>
        )}

        {!isPerson && !isEmotion && !isMessage && (
          <pre className="text-[10px] font-mono text-gray-600 bg-black/40 p-3 rounded-xl overflow-x-auto">
            {JSON.stringify(content, null, 2)}
          </pre>
        )}
      </div>

      <div className="flex gap-2 justify-end pt-2 border-t border-white/5">
        <button onClick={() => navigator.clipboard.writeText(JSON.stringify(content))} className="p-2 hover:bg-white/5 rounded-lg text-gray-700 hover:text-white transition-all" title="نسخ البيانات">
          <Copy size={12} />
        </button>
        {isMessage && content.conversation_id && (
          <button onClick={() => onSelectChat(content.conversation_id)} className="flex items-center gap-1.5 px-3 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-[9px] font-black text-gray-500 hover:text-indigo-400 transition-all">
             <ExternalLink size={10} /> عرض السياق
          </button>
        )}
      </div>
    </div>
  );
};

export default MemoryAI;
