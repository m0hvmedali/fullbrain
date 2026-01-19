
import React, { useMemo, useState } from 'react';
import { StandardizedMessage, ConversationSummary } from '../types';
import { ExternalLink, Calendar, Copy, Check, Info, TrendingUp, ArrowDown } from 'lucide-react';

interface TimelineProps {
  messages: StandardizedMessage[];
  conversation?: ConversationSummary;
  allMessages: StandardizedMessage[];
}

const ConversationTimeline: React.FC<TimelineProps> = ({ messages, conversation }) => {
  const [copied, setCopied] = useState(false);
  const [showStats, setShowStats] = useState(false);

  const groupedByDay = useMemo(() => {
    const groups: { date: string, msgs: StandardizedMessage[] }[] = [];
    messages.forEach(m => {
      const dateStr = new Date(m.timestamp).toLocaleDateString('ar-EG', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
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

  const stats = useMemo(() => {
    const totalWords = messages.reduce((acc, m) => acc + m.meta.word_count, 0);
    const questions = messages.filter(m => m.meta.has_question).length;
    const longMsgs = messages.filter(m => m.content.length > 200).length;
    return { totalWords, questions, longMsgs };
  }, [messages]);

  const generateReport = () => {
    if (!conversation || messages.length === 0) return;
    const report = `=== تقرير Memory Intelligence ===\nالموضوع: ${conversation.title}\nإجمالي الرسائل: ${messages.length}\nإجمالي الكلمات: ${stats.totalWords}\nالفترة: ${new Date(messages[0].timestamp).toLocaleDateString()} - ${new Date(messages[messages.length-1].timestamp).toLocaleDateString()}\n\n-- السياق المختصر --\n${messages.slice(-20).map(m => `[${m.sender}]: ${m.content}`).join('\n')}`;
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#060606]" dir="rtl">
      <header className="p-8 border-b border-[#111] flex items-center justify-between sticky top-0 bg-[#060606]/90 backdrop-blur-xl z-20">
        <div>
          <div className="flex items-center gap-3 mb-1">
             <h2 className="text-xl font-black">{conversation?.title}</h2>
             <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 text-[9px] font-black uppercase tracking-widest rounded-md border border-indigo-500/20">{conversation?.source}</span>
          </div>
          <div className="flex gap-4 text-[10px] text-gray-500 font-bold uppercase">
             <span className="flex items-center gap-1"><Info size={12}/> {messages.length} رسالة</span>
             <span className="flex items-center gap-1"><TrendingUp size={12}/> {stats.totalWords} كلمة</span>
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowStats(!showStats)}
            className="p-2.5 bg-[#0D0D0D] border border-[#1A1A1A] rounded-xl hover:bg-[#151515] transition-colors"
          >
            <TrendingUp size={18} className={showStats ? "text-indigo-500" : "text-gray-500"} />
          </button>
          <button 
            onClick={generateReport}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#0D0D0D] hover:bg-[#151515] border border-[#222] rounded-xl text-xs transition-all font-bold"
          >
            {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
            نسخ التقرير
          </button>
          <button 
            onClick={() => window.open('https://chatgpt.com', '_blank')}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs transition-all font-bold shadow-lg shadow-indigo-600/20"
          >
            <ExternalLink size={14} /> تحليل ChatGPT
          </button>
        </div>
      </header>

      {showStats && (
        <div className="bg-[#090909] border-b border-[#111] p-6 grid grid-cols-3 gap-6 animate-in slide-in-from-top duration-300">
           <div className="p-4 bg-[#0D0D0D] border border-[#151515] rounded-2xl">
              <p className="text-[10px] text-gray-500 uppercase font-black mb-1">الأسئلة المطروحة</p>
              <p className="text-2xl font-black text-indigo-400">{stats.questions}</p>
           </div>
           <div className="p-4 bg-[#0D0D0D] border border-[#151515] rounded-2xl">
              <p className="text-[10px] text-gray-500 uppercase font-black mb-1">رسائل طويلة (+200)</p>
              <p className="text-2xl font-black text-purple-400">{stats.longMsgs}</p>
           </div>
           <div className="p-4 bg-[#0D0D0D] border border-[#151515] rounded-2xl">
              <p className="text-[10px] text-gray-500 uppercase font-black mb-1">كثافة الكلمات</p>
              <p className="text-2xl font-black text-green-400">{(stats.totalWords / messages.length).toFixed(1)}</p>
           </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-8 py-10 space-y-16 custom-scrollbar">
        {groupedByDay.map(group => (
          <div key={group.date} className="space-y-8">
            <div className="flex items-center gap-6">
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#111]"></div>
              <div className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest bg-[#0D0D0D] px-6 py-2 rounded-full border border-[#111]">
                <Calendar size={12} /> {group.date}
              </div>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[#111]"></div>
            </div>

            <div className="space-y-6 max-w-4xl mx-auto">
              {group.msgs.map(m => (
                <div key={m.id} className="flex flex-col group">
                  <div className="flex items-center gap-3 mb-2 px-1">
                    <span className="text-[11px] font-black text-indigo-400 tracking-tight">{m.sender}</span>
                    <span className="text-[9px] text-gray-700 font-mono">{new Date(m.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className={`p-5 bg-[#0D0D0D] border border-[#151515] rounded-3xl rounded-tr-none group-hover:border-indigo-500/20 transition-all ${m.meta.message_length > 500 ? 'border-l-4 border-l-purple-500/40' : ''}`}>
                    <p className="text-gray-200 whitespace-pre-wrap leading-relaxed text-[15px]">{m.content}</p>
                    <div className="mt-4 flex gap-4 text-[9px] text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity font-black uppercase tracking-tighter">
                       <span>{m.meta.word_count} كلمة</span>
                       {m.meta.has_question && <span className="text-indigo-500">سؤال مكتشف</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ConversationTimeline;
