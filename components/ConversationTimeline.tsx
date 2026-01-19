
import React, { useMemo, useRef } from 'react';
import { StandardizedMessage, ConversationSummary } from '../types';
import { Download, ExternalLink, Calendar } from 'lucide-react';

interface TimelineProps {
  messages: StandardizedMessage[];
  conversation?: ConversationSummary;
}

const ConversationTimeline: React.FC<TimelineProps> = ({ messages, conversation }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const groupedByDay = useMemo(() => {
    const groups: { date: string, msgs: StandardizedMessage[] }[] = [];
    messages.forEach(m => {
      const dateStr = new Date(m.timestamp).toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
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

  const generateReport = () => {
    if (!conversation) return;
    
    const stats = {
      total: messages.length,
      words: messages.reduce((acc, m) => acc + m.meta.word_count, 0),
      duration: messages.length > 0 ? (messages[messages.length-1].timestamp - messages[0].timestamp) : 0,
      participants: Array.from(new Set(messages.map(m => m.sender)))
    };

    const report = `
MEMORY INTELLIGENCE SYSTEM - FINAL ANALYSIS REPORT
--------------------------------------------------
Title: ${conversation.title}
Source: ${conversation.source}
Participants: ${stats.participants.join(', ')}
Total Messages: ${stats.total}
Total Word Count: ${stats.words}
Active Span: ${Math.ceil(stats.duration / (1000 * 60 * 60 * 24))} days

CHRONOLOGICAL SUMMARY:
${messages.slice(0, 50).map(m => `[${new Date(m.timestamp).toLocaleString()}] ${m.sender}: ${m.content.slice(0, 100)}...`).join('\n')}
${messages.length > 50 ? '... [Content Truncated for Report Preview]' : ''}

INSTRUCTIONS FOR AI:
Analyze the communication patterns, power dynamics, and sentiment progression in the text above. 
Provide a psychological profile of the interaction and highlight key turning points.
    `.trim();

    navigator.clipboard.writeText(report);
    alert('Full report copied to clipboard. You can now paste it into ChatGPT.');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0B0B0B]">
      {/* Header */}
      <header className="p-6 border-b border-[#1A1A1A] flex items-center justify-between sticky top-0 bg-[#0B0B0B]/80 backdrop-blur-md z-10">
        <div>
          <h2 className="text-xl font-bold">{conversation?.title || 'Chat History'}</h2>
          <p className="text-xs text-gray-500 font-mono mt-1 uppercase">{conversation?.source} &bull; {messages.length} messages</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={generateReport}
            className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] hover:bg-[#252525] border border-[#333] rounded-lg text-sm transition-all"
          >
            <Download size={16} />
            Final Report
          </button>
          <button 
            onClick={() => window.open('https://chatgpt.com', '_blank')}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm transition-all"
          >
            <ExternalLink size={16} />
            Open ChatGPT
          </button>
        </div>
      </header>

      {/* Messages Scroll Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-10 space-y-12">
        {groupedByDay.map(group => (
          <div key={group.date} className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[#1A1A1A]"></div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-[#121212] px-3 py-1 rounded-full border border-[#1A1A1A]">
                <Calendar size={12} />
                {group.date}
              </div>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#1A1A1A]"></div>
            </div>

            <div className="space-y-4">
              {group.msgs.map(m => (
                <div key={m.id} className="flex flex-col group max-w-4xl mx-auto">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-xs font-bold text-indigo-400 opacity-80">{m.sender}</span>
                    <span className="text-[10px] text-gray-600 font-mono">{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="p-4 bg-[#121212] border border-[#1A1A1A] rounded-2xl rounded-tl-none group-hover:border-[#333] transition-all shadow-sm">
                    <p className="text-[#D1D1D1] whitespace-pre-wrap leading-relaxed text-sm">{m.content}</p>
                    <div className="mt-3 flex gap-3 text-[9px] text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity uppercase font-bold tracking-tighter">
                       <span>{m.meta.word_count} words</span>
                       <span>{m.meta.message_length} chars</span>
                       {m.meta.has_question && <span className="text-indigo-500">Inquiry</span>}
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
