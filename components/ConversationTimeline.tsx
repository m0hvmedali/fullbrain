
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { StandardizedMessage, ConversationSummary, PromptTemplate } from '../types';
import { ExternalLink, Calendar, Copy, Check, Info, TrendingUp, Sparkles, X, Loader2, BookOpen, User, Bot, Clock } from 'lucide-react';
import { getPromptTemplates } from '../utils/db';
import { getAI, summarizeConversation, AI_MODELS } from '../utils/ai';

interface TimelineProps {
  messages: StandardizedMessage[];
  conversation?: ConversationSummary;
  allMessages: StandardizedMessage[];
}

const ConversationTimeline: React.FC<TimelineProps> = ({ messages, conversation }) => {
  const [copied, setCopied] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showPromptPicker, setShowPromptPicker] = useState(false);
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
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

  const handleSummarize = async () => {
    setIsSummarizing(true);
    const res = await summarizeConversation(messages);
    setSummary(res);
    setIsSummarizing(false);
  };

  const handleRunPrompt = async (template: PromptTemplate) => {
    setIsGenerating(true);
    setAiResult(null);
    setShowPromptPicker(false);

    try {
      const ai = getAI();
      const context = messages.slice(-60).map(m => `[${m.sender}]: ${m.content}`).join('\n');
      const finalPrompt = template.content.replace(/\{\{(context|conversation)\}\}/g, context);
      
      const response = await ai.models.generateContent({
        model: AI_MODELS.text,
        contents: finalPrompt,
        config: { temperature: 0.7 }
      });

      setAiResult(response.text || "لم يتم إرجاع أي نتيجة من الذكاء الاصطناعي.");
    } catch (error) {
      console.error("AI execution error:", error);
      setAiResult("حدث خطأ أثناء معالجة القالب. تأكد من إعداد مفتاح API بشكل صحيح.");
    } finally {
      setIsGenerating(false);
    }
  };

  const generateReport = () => {
    if (!conversation || messages.length === 0) return;
    const report = `=== تقرير الذاكرة الرقمية ===\nالموضوع: ${conversation.title}\nالمصدر: ${conversation.source}\nإجمالي الرسائل: ${messages.length}\nإجمالي الكلمات: ${stats.totalWords}\nالفترة: ${new Date(messages[0].timestamp).toLocaleDateString('ar-EG')} - ${new Date(messages[messages.length-1].timestamp).toLocaleDateString('ar-EG')}\n\n-- مقتطف من السياق --\n${messages.slice(-10).map(m => `[${m.sender}]: ${m.content}`).join('\n')}`;
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#060606] overflow-hidden" dir="rtl">
      <header className="px-10 py-8 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[#060606]/95 backdrop-blur-xl z-20 shadow-2xl">
        <div className="flex items-center gap-6">
          <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
             {conversation?.source === 'whatsapp' ? <User className="text-green-500" /> : <Bot className="text-indigo-500" />}
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
               <h2 className="text-2xl font-black text-white">{conversation?.title}</h2>
               <span className="px-2.5 py-1 bg-indigo-500/10 text-indigo-400 text-[9px] font-black uppercase tracking-widest rounded-lg border border-indigo-500/20">{conversation?.source}</span>
            </div>
            <div className="flex gap-4 text-[11px] text-gray-500 font-bold uppercase tracking-tight">
               <span className="flex items-center gap-1.5"><Clock size={12}/> آخر نشاط: {new Date(conversation?.lastMessageTimestamp || 0).toLocaleDateString('ar-EG')}</span>
               <span className="flex items-center gap-1.5 text-indigo-500/60"><TrendingUp size={12}/> {messages.length} سجل محفوظ</span>
            </div>
          </div>
        </div>
        
        <div className="flex gap-4">
          <button 
            onClick={handleSummarize}
            disabled={isSummarizing}
            className="flex items-center gap-2 px-6 py-3 bg-[#111] border border-white/5 rounded-2xl text-xs transition-all font-black hover:bg-[#151515] hover:border-indigo-500/30 disabled:opacity-50 group"
          >
            {isSummarizing ? <Loader2 size={16} className="animate-spin" /> : <BookOpen size={16} className="group-hover:text-indigo-400" />}
            ملخص ذكي
          </button>
          
          <button 
            onClick={() => setShowPromptPicker(true)}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-2xl text-xs transition-all font-black shadow-xl shadow-indigo-600/30 active:scale-95"
          >
            <Sparkles size={16} /> تحليل بالقالب
          </button>

          <button 
            onClick={generateReport}
            className="p-3 bg-[#111] hover:bg-[#151515] border border-white/5 rounded-2xl transition-all"
            title="نسخ تقرير المحادثة"
          >
            {copied ? <Check size={20} className="text-green-500" /> : <Copy size={20} className="text-gray-500" />}
          </button>
        </div>
      </header>

      <div ref={containerRef} className="flex-1 overflow-y-auto px-10 py-12 space-y-20 custom-scrollbar scroll-smooth">
        {summary && (
          <div className="max-w-4xl mx-auto animate-fade-in relative">
             <div className="p-10 bg-gradient-to-br from-indigo-900/10 to-transparent border border-indigo-500/20 rounded-[3rem] relative overflow-hidden group shadow-2xl">
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                   <BookOpen size={64} className="text-indigo-500" />
                </div>
                <div className="flex items-center gap-3 mb-6">
                   <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
                      <Sparkles size={18} className="text-white" />
                   </div>
                   <h4 className="text-xs font-black text-indigo-400 uppercase tracking-[0.2em]">الرؤية الذكية للمحادثة</h4>
                </div>
                <p className="text-gray-200 leading-loose text-xl font-medium">{summary}</p>
                <button onClick={() => setSummary(null)} className="absolute top-8 left-8 text-gray-700 hover:text-white transition-colors"><X size={20}/></button>
             </div>
          </div>
        )}

        {groupedByDay.map(group => (
          <div key={group.date} className="space-y-10">
            <div className="flex items-center gap-8">
              <div className="h-px flex-1 bg-gradient-to-l from-transparent via-white/5 to-transparent"></div>
              <div className="flex items-center gap-3 text-[11px] font-black text-gray-600 uppercase tracking-widest bg-[#0D0D0D] px-8 py-2.5 rounded-full border border-white/5 shadow-lg">
                <Calendar size={14} className="text-indigo-500" /> {group.date}
              </div>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
            </div>

            <div className="space-y-8 max-w-4xl mx-auto">
              {group.msgs.map(m => (
                <div key={m.id} className="flex flex-col group animate-fade-in">
                  <div className="flex items-center gap-4 mb-3 px-2">
                    <span className="text-xs font-black text-indigo-400 tracking-tight flex items-center gap-2">
                       <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                       {m.sender}
                    </span>
                    <span className="text-[10px] text-gray-700 font-mono font-bold">{new Date(m.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className={`p-7 bg-[#0D0D0D] border border-white/5 rounded-[2rem] rounded-tr-none group-hover:border-indigo-500/30 transition-all shadow-sm group-hover:shadow-indigo-500/5 ${m.content.length > 500 ? 'border-r-4 border-r-purple-600/40' : ''}`}>
                    <p className="text-gray-200 whitespace-pre-wrap leading-relaxed text-lg">{m.content}</p>
                    
                    <div className="mt-6 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                       <div className="flex gap-4 text-[9px] text-gray-600 font-black uppercase tracking-tighter">
                          <span className="flex items-center gap-1"><BookOpen size={10} /> {m.meta.word_count} كلمة</span>
                          {m.meta.has_question && <span className="text-indigo-500 flex items-center gap-1"><Info size={10} /> سؤال مكتشف</span>}
                       </div>
                       <button 
                         onClick={() => navigator.clipboard.writeText(m.content)}
                         className="p-1.5 bg-white/5 rounded-lg text-gray-600 hover:text-white transition-colors"
                         title="نسخ الرسالة"
                       >
                         <Copy size={12} />
                       </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Result Modal - High End Design */}
      {aiResult && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-8 animate-fade-in">
          <div className="w-full max-w-4xl bg-[#0F0F0F] border border-white/10 rounded-[3rem] flex flex-col max-h-[85vh] overflow-hidden shadow-[0_0_100px_rgba(79,70,229,0.15)]">
            <div className="p-10 border-b border-white/5 flex justify-between items-center bg-[#121212]">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-600/20 text-indigo-500 rounded-2xl"><Sparkles size={24} /></div>
                <div>
                   <h3 className="text-2xl font-black">نتائج التحليل الذكي</h3>
                   <p className="text-gray-600 text-[10px] font-black uppercase tracking-widest mt-1">بناءً على المحتوى المسترجع من الذاكرة</p>
                </div>
              </div>
              <button onClick={() => setAiResult(null)} className="p-3 bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white rounded-2xl transition-all"><X size={24}/></button>
            </div>
            <div className="p-12 overflow-y-auto custom-scrollbar flex-1 bg-[#090909]">
              <div className="prose prose-invert max-w-none text-gray-200 leading-[2.2] text-xl whitespace-pre-wrap font-medium">
                {aiResult}
              </div>
            </div>
            <div className="p-10 border-t border-white/5 bg-[#121212] flex justify-end gap-4">
              <button onClick={() => { navigator.clipboard.writeText(aiResult); }} className="px-8 py-4 bg-white/5 hover:bg-white/10 rounded-2xl font-black transition-all text-sm flex items-center gap-2">
                 <Copy size={18} /> نسخ النتيجة
              </button>
              <button onClick={() => setAiResult(null)} className="px-10 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-black transition-all shadow-xl shadow-indigo-600/20 text-sm">إغلاق التقرير</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConversationTimeline;
