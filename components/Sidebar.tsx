
import React, { useState, useMemo } from 'react';
import { ConversationSummary } from '../types';
import { Instagram, MessageCircle, MessageSquare, Clock, Hash, Search, Filter } from 'lucide-react';

interface SidebarProps {
  summaries: ConversationSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ summaries, activeId, onSelect }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSummaries = useMemo(() => {
    return summaries.filter(s => 
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.source.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [summaries, searchQuery]);

  const getSourceIcon = (source: string) => {
    switch(source) {
      case 'instagram': return <Instagram size={14} className="text-pink-500" />;
      case 'whatsapp': return <MessageCircle size={14} className="text-green-500" />;
      case 'chatgpt': return <MessageSquare size={14} className="text-teal-500" />;
      default: return <Hash size={14} className="text-gray-500" />;
    }
  };

  const getRelativeTime = (timestamp: number) => {
    const rtf = new Intl.RelativeTimeFormat('ar', { numeric: 'auto' });
    const diff = (timestamp - Date.now()) / (1000 * 60 * 60 * 24);
    
    if (Math.abs(diff) < 1) return 'اليوم';
    if (Math.abs(diff) < 2) return 'أمس';
    return new Date(timestamp).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
  };

  return (
    <aside className="w-80 border-l border-[#1A1A1A] bg-[#0B0B0B] flex flex-col h-full shadow-2xl z-20" dir="rtl">
      <div className="p-8 border-b border-[#1A1A1A] bg-[#0D0D0D]">
        <h1 className="text-xl font-black tracking-tight text-white mb-4">المحادثات</h1>
        
        <div className="relative group">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-indigo-500 transition-colors" size={14} />
          <input 
            type="text"
            placeholder="ابحث في المحادثات..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#060606] border border-[#1A1A1A] rounded-xl py-2.5 pr-10 pl-4 text-xs focus:outline-none focus:border-indigo-500/50 transition-all placeholder:text-gray-700"
          />
        </div>

        <div className="flex items-center gap-2 mt-4">
           <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
           <p className="text-[9px] text-gray-600 uppercase tracking-widest font-black">إجمالي السجلات: {summaries.length}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {filteredSummaries.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <Filter size={24} className="mx-auto text-gray-800" />
            <p className="text-xs text-gray-700 font-bold">لا توجد نتائج</p>
          </div>
        ) : (
          filteredSummaries.map(summary => (
            <div 
              key={summary.id}
              onClick={() => onSelect(summary.id)}
              className={`p-5 cursor-pointer border-b border-[#1A1A1A] transition-all relative group ${activeId === summary.id ? 'bg-indigo-600/5 border-l-4 border-l-indigo-500' : 'hover:bg-[#121212]'}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-[#1A1A1A] rounded-md">{getSourceIcon(summary.source)}</div>
                  <span className="text-[9px] text-gray-600 font-black uppercase tracking-tighter">{summary.source}</span>
                </div>
                <span className="text-[9px] text-gray-700 font-bold">{getRelativeTime(summary.lastMessageTimestamp)}</span>
              </div>
              
              <h3 className={`font-bold truncate text-[13px] ${activeId === summary.id ? 'text-indigo-400' : 'text-gray-300 group-hover:text-white'}`}>
                {summary.title}
              </h3>

              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-1 text-[10px] text-gray-600 font-medium">
                  <Hash size={10} className="text-gray-800" />
                  <span>{summary.messageCount} سجل</span>
                </div>
                <div className={`w-2 h-2 rounded-full transition-all ${activeId === summary.id ? 'bg-indigo-500 scale-125' : 'bg-transparent'}`}></div>
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
