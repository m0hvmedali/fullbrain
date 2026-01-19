
import React, { useState, useRef } from 'react';
import { 
  BrainCircuit, Sparkles, MessageSquare, ExternalLink, 
  ShieldCheck, Copy, User, Heart, MessageCircle, Search, 
  Cpu, Hash, Info
} from 'lucide-react';
import { getSmartResponse, HighlightText } from '../services/memoryService';

interface MemoryAIProps {
  onSelectChat: (id: string) => void;
}

const MemoryAI: React.FC<MemoryAIProps> = ({ onSelectChat }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const resultsEndRef = useRef<HTMLDivElement>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    
    // البحث المنطقي الفوري (Pure Logic Engine)
    // لا يوجد استدعاء لـ Gemini هنا لضمان السرعة والخصوصية
    setTimeout(() => {
      const localResults = getSmartResponse(query);
      setResults(localResults);
      setIsSearching(false);
      resultsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50); // تأخير بسيط للإيحاء بالمعالجة
  };

  return (
    <div className="flex-1 flex flex-col bg-[#060606] h-full overflow-hidden font-sans" dir="rtl">
      {/* Header - نظام استخبارات محلي */}
      <header className="px-6 py-5 border-b border-white/5 bg-[#080808]/95 backdrop-blur-xl flex justify-between items-center z-10 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 bg-indigo-600/10 rounded-2xl flex items-center justify-center border border-indigo-500/20 shadow-inner">
            <Cpu className="text-indigo-500" size={22} />
          </div>
          <div>
            <h2 className="text-base font-black text-white tracking-tight">مخ البحث الاستخباراتي</h2>
            <p className="text-[10px] text-gray-600 uppercase tracking-[0.2em] font-black">Local Logic-Based Search Engine</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-4">
           <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/5 border border-green-500/10 rounded-full">
              <ShieldCheck size={12} className="text-green-600" />
              <span className="text-[10px] font-black text-green-700 uppercase">Offline Processing</span>
           </div>
        </div>
      </header>

      {/* Results Explorer Area */}
      <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-6 custom-scrollbar max-w-5xl mx-auto w-full">
        {!results && !isSearching && (
          <div className="flex flex-col items-center justify-center py-32 text-center animate-fade-in opacity-40">
            <div className="w-24 h-24 bg-white/5 rounded-[2.5rem] flex items-center justify-center mb-8 border border-white/5">
               <Search size={40} className="text-gray-700" />
            </div>
            <h3 className="text-2xl font-black text-gray-600">نظام البحث المنطقي</h3>
            <p className="text-sm text-gray-700 mt-3 max-w-sm font-medium">ابدأ بالبحث عن أي اسم، كلمة، أو شعور. سيقوم المحرك بفحص كافة ملفات JSON المحلية فوراً.</p>
          </div>
        )}

        {results && (
          <div className="mb-8 flex items-center justify-between border-b border-white/5 pb-4">
             <div className="flex items-center gap-3">
                <Hash size={16} className="text-indigo-500" />
                <span className="text-sm font-black text-gray-400">تم العثور على {results.length} تطابق منطقي</span>
             </div>
             <div className="text-[10px] font-black text-gray-700 uppercase tracking-widest">فرز حسب قوة الصلة</div>
          </div>
        )}

        {results && results.map((res, i) => (
          <div key={i} className="animate-fade-in">
             <ResultCard res={res} query={query} onSelectChat={onSelectChat} />
          </div>
        ))}

        {isSearching && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-50">
            <div className="w-12 h-12 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">جاري المسح المنطقي لقاعدة البيانات...</span>
          </div>
        )}
        <div ref={resultsEndRef} />
      </div>

      {/* Search Input Bar */}
      <div className="p-8 border-t border-white/5 bg-[#080808]/98 shrink-0">
        <form onSubmit={handleSearch} className="max-w-4xl mx-auto relative group">
          <input 
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ادخل الكلمات المفتاحية للبحث (مثال: محمد، غضب، اجتماع...)"
            className="w-full bg-[#0D0D0D] border border-white/10 rounded-[2rem] py-5 px-8 pr-16 text-lg font-bold focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/30 transition-all placeholder:text-gray-800"
          />
          <div className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-700 group-focus-within:text-indigo-500 transition-colors">
            <Search size={24} />
          </div>
          <button 
            type="submit" 
            className="absolute left-3 top-1/2 -translate-y-1/2 px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[1.5rem] font-black text-xs shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
          >
            تفعيل البحث
          </button>
        </form>
        <div className="max-w-4xl mx-auto mt-4 flex justify-center gap-6 opacity-30">
           <div className="flex items-center gap-2 text-[10px] font-black text-gray-500">
              <Cpu size={12} /> معالجة فورية
           </div>
           <div className="flex items-center gap-2 text-[10px] font-black text-gray-500">
              <ShieldCheck size={12} /> حماية الخصوصية
           </div>
           <div className="flex items-center gap-2 text-[10px] font-black text-gray-500">
              <Info size={12} /> نتائج مطابقة
           </div>
        </div>
      </div>
    </div>
  );
};

const ResultCard = ({ res, query, onSelectChat }: any) => {
  const content = res.content;
  const isPerson = content.relationship_to_user || content.traits;
  const isEmotion = content.family && content.english_name;
  const isMessage = (content.sender && (content.text || content.message)) || content.content;

  return (
    <div className={`p-6 md:p-8 rounded-[2.5rem] border transition-all hover:border-white/10 shadow-xl group mb-4 ${
      isPerson ? 'bg-purple-900/5 border-purple-500/10' :
      isEmotion ? 'bg-pink-900/5 border-pink-500/10' :
      'bg-[#0D0D0D] border-white/5'
    }`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            isPerson ? 'bg-purple-600/20 text-purple-400' :
            isEmotion ? 'bg-pink-600/20 text-pink-400' : 'bg-indigo-600/20 text-indigo-400'
          }`}>
            {isPerson ? <User size={20} /> : isEmotion ? <Heart size={20} /> : <MessageCircle size={20} />}
          </div>
          <div>
            <h4 className="text-lg font-black text-white group-hover:text-indigo-400 transition-colors">
              <HighlightText text={res.subject} highlight={query} />
            </h4>
            <div className="flex items-center gap-2 mt-1">
               <span className="text-[10px] text-gray-700 uppercase font-black tracking-widest">{res.sourceFile}</span>
               <span className="w-1 h-1 bg-gray-800 rounded-full"></span>
               <span className="text-[10px] font-black text-indigo-500/50">قوة التطابق: {res.relevanceScore}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="text-sm text-gray-400 leading-relaxed mb-6 bg-black/20 p-6 rounded-3xl border border-white/5">
        {isPerson && (
          <div className="space-y-4">
            <p className="text-purple-300 font-black text-base">{content.relationship_to_user}</p>
            <div className="flex flex-wrap gap-2">
              {content.traits?.map((t: any, i: number) => (
                <span key={i} className="px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-lg text-[10px] font-bold text-purple-400">{t}</span>
              ))}
            </div>
            {content.background && <p className="mt-4 text-gray-400 italic leading-loose"><HighlightText text={content.background} highlight={query} /></p>}
          </div>
        )}

        {isEmotion && (
          <div className="space-y-4">
            <p className="text-pink-300 font-black text-base">{content.family} - {content.type}</p>
            <p className="text-gray-400 leading-loose"><HighlightText text={content.definition} highlight={query} /></p>
            <div className="flex flex-wrap gap-2">
              {content.branches?.map((b: any, i: number) => (
                <span key={i} className="px-3 py-1 bg-pink-500/5 border border-pink-500/10 rounded-lg text-[10px] font-bold text-pink-500">{b}</span>
              ))}
            </div>
          </div>
        )}

        {isMessage && (
          <div className="space-y-3">
            <div className="flex justify-between items-center mb-2">
               <span className="text-indigo-400 font-black text-base">{content.sender}</span>
               <span className="text-[10px] text-gray-700 font-mono">{content.timestamp ? new Date(content.timestamp).toLocaleString('ar-EG') : (content.time || '')}</span>
            </div>
            <p className="text-gray-200 text-base leading-relaxed whitespace-pre-wrap">
              <HighlightText text={content.text || content.message || content.content} highlight={query} />
            </p>
          </div>
        )}

        {!isPerson && !isEmotion && !isMessage && (
          <pre className="text-[11px] font-mono text-gray-600 overflow-x-auto">
            {JSON.stringify(content, null, 2)}
          </pre>
        )}
      </div>

      <div className="flex gap-3 justify-end">
        <button 
          onClick={() => {
            navigator.clipboard.writeText(content.text || content.message || content.content || JSON.stringify(content));
          }} 
          className="flex items-center gap-2 px-5 py-2 hover:bg-white/5 rounded-xl text-[11px] font-black text-gray-600 hover:text-white transition-all border border-transparent hover:border-white/5"
        >
          <Copy size={14} /> نسخ المحتوى
        </button>
        {content.conversation_id && (
          <button 
            onClick={() => onSelectChat(content.conversation_id)} 
            className="flex items-center gap-2 px-6 py-2 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-500 hover:text-white rounded-xl text-[11px] font-black transition-all border border-indigo-500/20"
          >
             <ExternalLink size={14} /> فتح في السجلات
          </button>
        )}
      </div>
    </div>
  );
};

export default MemoryAI;
