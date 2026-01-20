
import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { StandardizedMessage, ConversationSummary } from '../types';
import { Loader2, BookOpen, User, Bot, MessageSquare, ChevronDown, ArrowDown } from 'lucide-react';
import { getMessagesByConversation } from '../utils/db';
import { summarizeConversation } from '../utils/ai';

interface TimelineProps {
  conversationId: string | null;
  conversation?: ConversationSummary;
}

const ConversationTimeline: React.FC<TimelineProps> = ({ conversationId, conversation }) => {
  const [allMessages, setAllMessages] = useState<StandardizedMessage[]>([]);
  const [visibleCount, setVisibleCount] = useState(100);
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (conversationId) {
      setIsLoading(true);
      setAllMessages([]);
      setVisibleCount(100);
      setSummary(null);
      
      getMessagesByConversation(conversationId).then(msgs => {
        setAllMessages(msgs);
        setIsLoading(false);
        // التمرير للأسفل تلقائياً عند فتح محادثة
        setTimeout(() => {
          if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
          }
        }, 100);
      });
    }
  }, [conversationId]);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollTop } = containerRef.current;
    
    // إذا اقترب المستخدم من الأعلى، نحمل المزيد (هذا للمحادثات القديمة)
    // ولكن للتبسيط هنا سنستخدم زر "تحميل المزيد" أو التمرير لأسفل لزيادة العدد المرئي
    if (scrollTop < 200 && visibleCount < allMessages.length) {
       // منطق التحميل العكسي يمكن وضعه هنا
    }
  }, [allMessages.length, visibleCount]);

  const displayMessages = useMemo(() => {
    // عرض آخر N رسالة فقط للأداء
    return allMessages.slice(-visibleCount);
  }, [allMessages, visibleCount]);

  const groupedByDay = useMemo(() => {
    const groups: { date: string, msgs: StandardizedMessage[] }[] = [];
    displayMessages.forEach(m => {
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
  }, [displayMessages]);

  const loadMore = () => setVisibleCount(prev => prev + 200);

  const handleSummarize = async () => {
    setIsSummarizing(true);
    const res = await summarizeConversation(allMessages.slice(-60));
    setSummary(res);
    setIsSummarizing(false);
  };

  if (!conversationId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-10 md:p-20 opacity-30 text-center bg-[#060606]">
         <div className="w-16 h-16 md:w-24 md:h-24 bg-white/5 rounded-3xl flex items-center justify-center mb-6 border border-white/5">
            <MessageSquare size={32} className="text-gray-600" />
         </div>
         <h2 className="text-xl md:text-2xl font-black">جاهز لاستدعاء الذاكرة</h2>
         <p className="text-[10px] md:text-sm mt-2 font-medium max-w-xs">اختر سجلاً من القائمة الجانبية للغوص في التفاصيل.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#060606] overflow-hidden" dir="rtl">
      <header className="px-5 py-4 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[#060606]/95 backdrop-blur-xl z-20 shrink-0">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 shrink-0">
             {conversation?.source === 'whatsapp' ? <User className="text-green-500" size={16} /> : <Bot className="text-indigo-500" size={16} />}
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-black text-white truncate">{conversation?.title || "تحميل السجلات..."}</h2>
            <div className="flex gap-2 text-[9px] text-gray-600 font-black uppercase tracking-widest">
               <span className="text-indigo-500/50">{allMessages.length} رسالة مخزنة</span>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button onClick={handleSummarize} disabled={isSummarizing || isLoading} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 transition-all">
            {isSummarizing ? <Loader2 size={16} className="animate-spin" /> : <BookOpen size={16} />}
          </button>
        </div>
      </header>

      <div 
        ref={containerRef} 
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 md:px-12 py-8 space-y-10 custom-scrollbar scroll-smooth"
      >
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 opacity-40">
             <div className="w-10 h-10 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
             <p className="text-[10px] font-black uppercase tracking-[0.3em]">جاري استعادة 60,000+ نقطة بيانات...</p>
          </div>
        ) : (
          <>
            {allMessages.length > visibleCount && (
              <div className="flex justify-center pb-8">
                 <button onClick={loadMore} className="text-[10px] font-black text-gray-600 hover:text-indigo-400 flex items-center gap-2 uppercase tracking-widest bg-white/5 px-6 py-2.5 rounded-full border border-white/5 transition-all">
                    <ChevronDown size={14} /> تحميل سجلات أقدم
                 </button>
              </div>
            )}

            {summary && (
              <div className="p-6 bg-indigo-900/10 border border-indigo-500/20 rounded-[2rem] relative animate-fade-in shadow-xl mb-10">
                <p className="text-gray-200 text-sm md:text-base leading-loose italic">"{summary}"</p>
              </div>
            )}

            {groupedByDay.map(group => (
              <div key={group.date} className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="h-px flex-1 bg-white/5"></div>
                  <div className="text-[9px] font-black text-gray-700 uppercase tracking-[0.2em]">{group.date}</div>
                  <div className="h-px flex-1 bg-white/5"></div>
                </div>

                <div className="space-y-6">
                  {group.msgs.map(m => (
                    <div key={m.id} className={`flex flex-col animate-fade-in ${m.direction === 'sent' ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-center gap-2 mb-2 opacity-40">
                        <span className="text-[9px] font-black uppercase text-indigo-400">{m.sender}</span>
                        <span className="text-[8px] font-bold text-gray-500">{new Date(m.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className={`p-5 md:p-6 rounded-[2rem] max-w-[95%] md:max-w-[80%] border transition-all ${
                        m.direction === 'sent' 
                        ? 'bg-indigo-600/10 border-indigo-500/20 text-indigo-50 rounded-tr-none shadow-[0_10px_30px_rgba(79,70,229,0.05)]' 
                        : 'bg-[#0D0D0D] border-white/5 text-gray-300 rounded-tl-none shadow-xl'
                      }`}>
                        <p className="text-[13px] md:text-[15px] leading-relaxed whitespace-pre-wrap">{m.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            
            <div className="h-20" /> {/* Space at bottom */}
          </>
        )}
      </div>
      
      {/* Scroll to bottom button */}
      {!isLoading && allMessages.length > 0 && (
        <button 
          onClick={() => containerRef.current?.scrollTo(0, containerRef.current.scrollHeight)}
          className="fixed bottom-24 left-8 md:left-12 p-4 bg-indigo-600 text-white rounded-full shadow-2xl shadow-indigo-600/40 hover:scale-110 transition-all z-30 active:scale-95"
        >
          <ArrowDown size={20} />
        </button>
      )}
    </div>
  );
};

export default ConversationTimeline;
