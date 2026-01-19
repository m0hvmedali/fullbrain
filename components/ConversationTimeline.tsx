
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { StandardizedMessage, ConversationSummary, PromptTemplate } from '../types';
// Added MessageSquare to the imports from lucide-react
import { Calendar, Copy, Check, Sparkles, X, Loader2, BookOpen, User, Bot, Clock, TrendingUp, MessageSquare } from 'lucide-react';
import { getPromptTemplates, getMessagesByConversation } from '../utils/db';
import { getAI, summarizeConversation, AI_MODELS } from '../utils/ai';

interface TimelineProps {
  conversationId: string | null;
  conversation?: ConversationSummary;
}

const ConversationTimeline: React.FC<TimelineProps> = ({ conversationId, conversation }) => {
  const [messages, setMessages] = useState<StandardizedMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showPromptPicker, setShowPromptPicker] = useState(false);
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // جلب الرسائل من DB عند تغير المحادثة
  useEffect(() => {
    if (conversationId) {
      setIsLoading(true);
      setMessages([]);
      setSummary(null);
      getMessagesByConversation(conversationId).then(msgs => {
        setMessages(msgs);
        setIsLoading(false);
        containerRef.current?.scrollTo(0, 0);
      });
    }
  }, [conversationId]);

  useEffect(() => {
    getPromptTemplates().then(setTemplates);
  }, []);

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

  if (!conversationId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-20 opacity-30 text-center">
         <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mb-6">
            <MessageSquare size={40} className="text-gray-600" />
         </div>
         <h2 className="text-2xl font-black">اختر محادثة للاستعراض</h2>
         <p className="text-sm mt-2 font-medium">سيتم جلب البيانات فوراً من مستودع الذاكرة المحلي.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#060606] overflow-hidden" dir="rtl">
      <header className="px-4 md:px-10 py-4 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[#060606]/95 backdrop-blur-xl z-20">
        <div className="flex items-center gap-3 md:gap-6 min-w-0">
          <div className="w-9 h-9 md:w-12 md:h-12 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 shrink-0">
             {conversation?.source === 'whatsapp' ? <User className="text-green-500" size={18} /> : <Bot className="text-indigo-500" size={18} />}
          </div>
          <div className="min-w-0">
            <h2 className="text-sm md:text-xl font-black text-white truncate">{conversation?.title || "تحميل..."}</h2>
            <div className="flex gap-2 text-[8px] md:text-[10px] text-gray-500 font-black uppercase tracking-widest">
               <span>{conversation?.source}</span>
               <span>•</span>
               <span className="text-indigo-400">{messages.length} سجل</span>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button onClick={handleSummarize} disabled={isSummarizing || isLoading} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all">
            {isSummarizing ? <Loader2 size={16} className="animate-spin" /> : <BookOpen size={16} />}
          </button>
          <button onClick={() => setShowPromptPicker(true)} disabled={isLoading} className="p-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white shadow-lg shadow-indigo-600/20 transition-all">
            <Sparkles size={16} />
          </button>
        </div>
      </header>

      <div ref={containerRef} className="flex-1 overflow-y-auto px-4 md:px-10 py-6 space-y-8 custom-scrollbar scroll-smooth">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-50">
             <Loader2 size={32} className="animate-spin text-indigo-500" />
             <p className="text-[10px] font-black uppercase tracking-[0.2em]">جاري استرجاع السجلات...</p>
          </div>
        ) : (
          <>
            {summary && (
              <div className="p-6 bg-indigo-900/10 border border-indigo-500/20 rounded-3xl relative animate-fade-in shadow-xl">
                <h4 className="text-[9px] font-black text-indigo-400 uppercase mb-3 flex items-center gap-2 tracking-[0.2em]">
                  <Sparkles size={10} /> الرؤية الذكية (AI Summary)
                </h4>
                <p className="text-gray-200 text-xs md:text-base leading-loose italic">"{summary}"</p>
                <button onClick={() => setSummary(null)} className="absolute top-4 left-4 text-gray-600 hover:text-white"><X size={14}/></button>
              </div>
            )}

            {groupedByDay.map(group => (
              <div key={group.date} className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-white/5"></div>
                  <div className="text-[8px] font-black text-gray-600 uppercase tracking-[0.3em] bg-[#0D0D0D] px-4 py-1.5 rounded-full border border-white/5 shadow-inner">
                    {group.date}
                  </div>
                  <div className="h-px flex-1 bg-white/5"></div>
                </div>

                <div className="space-y-4">
                  {group.msgs.map(m => (
                    <div key={m.id} className={`flex flex-col group animate-fade-in ${m.direction === 'sent' ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-center gap-2 mb-1.5 px-1">
                        <span className="text-[9px] font-black text-indigo-400 uppercase tracking-tighter">{m.sender}</span>
                        <span className="text-[8px] text-gray-700 font-bold">{new Date(m.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className={`p-4 md:p-6 rounded-[2rem] max-w-[90%] md:max-w-[70%] border transition-all hover:border-white/10 ${
                        m.direction === 'sent' 
                        ? 'bg-indigo-600/10 border-indigo-500/20 text-indigo-100 rounded-tr-none' 
                        : 'bg-[#0D0D0D] border-white/5 text-gray-200 rounded-tl-none'
                      }`}>
                        <p className="text-xs md:text-[15px] leading-relaxed whitespace-pre-wrap font-medium">{m.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {showPromptPicker && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6 animate-fade-in" onClick={() => setShowPromptPicker(false)}>
          <div className="w-full max-sm bg-[#0F0F0F] rounded-[3rem] border border-white/10 p-8 shadow-2xl shadow-indigo-600/5" onClick={e => e.stopPropagation()}>
             <h3 className="font-black text-indigo-400 mb-8 uppercase tracking-[0.2em] flex items-center gap-3">
               <Sparkles size={18} /> قوالب التحليل الذكي
             </h3>
             <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
                {templates.map(t => (
                  <button key={t.id} className="w-full text-right p-5 bg-white/5 hover:bg-indigo-600/20 rounded-2xl border border-white/5 hover:border-indigo-500/30 transition-all group">
                    <p className="font-black text-xs text-white group-hover:text-indigo-400">{t.title}</p>
                    <p className="text-[9px] text-gray-600 mt-1 line-clamp-1">{t.category}</p>
                  </button>
                ))}
                {templates.length === 0 && (
                  <div className="text-center py-10 opacity-30">
                    <BookOpen size={32} className="mx-auto mb-2" />
                    <p className="text-[10px] font-black uppercase">لا توجد قوالب محفوظة</p>
                  </div>
                )}
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConversationTimeline;
