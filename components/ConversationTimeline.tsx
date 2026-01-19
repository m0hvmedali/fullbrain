
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { StandardizedMessage, ConversationSummary, PromptTemplate } from '../types';
import { Calendar, Copy, Check, Sparkles, X, Loader2, BookOpen, User, Bot, Clock, TrendingUp } from 'lucide-react';
import { getPromptTemplates } from '../utils/db';
import { getAI, summarizeConversation, AI_MODELS } from '../utils/ai';

interface TimelineProps {
  messages: StandardizedMessage[];
  conversation?: ConversationSummary;
  allMessages: StandardizedMessage[];
}

const ConversationTimeline: React.FC<TimelineProps> = ({ messages, conversation }) => {
  const [showPromptPicker, setShowPromptPicker] = useState(false);
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getPromptTemplates().then(setTemplates);
    setSummary(null);
    containerRef.current?.scrollTo(0, 0);
  }, [conversation?.id]);

  const groupedByDay = useMemo(() => {
    const groups: { date: string, msgs: StandardizedMessage[] }[] = [];
    messages.forEach(m => {
      const dateStr = new Date(m.timestamp).toLocaleDateString('ar-EG', {
        weekday: 'short', month: 'short', day: 'numeric'
      });
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.date === dateStr) {
        lastGroup.msgs.push(m);
      } else {
        groups.push({ date: dateStr, msgs: [m] });
      }
    });
    return groups;
  }, [messages]);

  const handleSummarize = async () => {
    setIsSummarizing(true);
    const res = await summarizeConversation(messages);
    setSummary(res);
    setIsSummarizing(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#060606] overflow-hidden" dir="rtl">
      <header className="px-4 md:px-10 py-4 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[#060606]/95 backdrop-blur-xl z-20">
        <div className="flex items-center gap-3 md:gap-6 min-w-0">
          <div className="w-9 h-9 md:w-12 md:h-12 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 shrink-0">
             {conversation?.source === 'whatsapp' ? <User className="text-green-500" size={18} /> : <Bot className="text-indigo-500" size={18} />}
          </div>
          <div className="min-w-0">
            <h2 className="text-sm md:text-xl font-black text-white truncate">{conversation?.title || "حدد محادثة"}</h2>
            <div className="flex gap-2 text-[8px] md:text-[10px] text-gray-500 font-bold uppercase">
               <span>{conversation?.source}</span>
               <span>•</span>
               <span>{messages.length} سجل</span>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button onClick={handleSummarize} disabled={isSummarizing || !conversation} className="p-2 bg-white/5 rounded-lg text-gray-400 hover:text-white">
            {isSummarizing ? <Loader2 size={16} className="animate-spin" /> : <BookOpen size={16} />}
          </button>
          <button onClick={() => setShowPromptPicker(true)} disabled={!conversation} className="p-2 bg-indigo-600 rounded-lg text-white">
            <Sparkles size={16} />
          </button>
        </div>
      </header>

      <div ref={containerRef} className="flex-1 overflow-y-auto px-4 md:px-10 py-6 space-y-8 custom-scrollbar scroll-smooth">
        {summary && (
          <div className="p-5 bg-indigo-900/10 border border-indigo-500/20 rounded-2xl relative animate-fade-in">
            <h4 className="text-[9px] font-black text-indigo-400 uppercase mb-2 flex items-center gap-2">
              <Sparkles size={10} /> الرؤية الذكية
            </h4>
            <p className="text-gray-200 text-xs md:text-base leading-relaxed">{summary}</p>
            <button onClick={() => setSummary(null)} className="absolute top-3 left-3 text-gray-600"><X size={14}/></button>
          </div>
        )}

        {groupedByDay.map(group => (
          <div key={group.date} className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-white/5"></div>
              <div className="text-[8px] font-black text-gray-600 uppercase tracking-widest bg-[#0D0D0D] px-3 py-1 rounded-full border border-white/5">
                {group.date}
              </div>
              <div className="h-px flex-1 bg-white/5"></div>
            </div>

            <div className="space-y-3">
              {group.msgs.map(m => (
                <div key={m.id} className="flex flex-col group animate-fade-in">
                  <div className="flex items-center gap-2 mb-1 px-1">
                    <span className="text-[9px] font-black text-indigo-400">{m.sender}</span>
                    <span className="text-[8px] text-gray-700">{new Date(m.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="p-3 md:p-5 bg-[#0D0D0D] border border-white/5 rounded-xl rounded-tr-none">
                    <p className="text-gray-200 text-xs md:text-base leading-relaxed whitespace-pre-wrap">{m.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {showPromptPicker && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4" onClick={() => setShowPromptPicker(false)}>
          <div className="w-full max-w-sm bg-[#0F0F0F] rounded-[2rem] border border-white/10 p-6" onClick={e => e.stopPropagation()}>
             <h3 className="font-black text-indigo-400 mb-6">قوالب التحليل</h3>
             <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar">
                {templates.map(t => (
                  <button key={t.id} className="w-full text-right p-4 bg-white/5 rounded-xl border border-white/5">
                    <p className="font-bold text-xs text-white">{t.title}</p>
                  </button>
                ))}
                {templates.length === 0 && <p className="text-center py-6 text-gray-600 text-[10px]">لا توجد قوالب.</p>}
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConversationTimeline;
