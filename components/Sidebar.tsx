
import React, { useState, useMemo } from 'react';
import { ConversationSummary } from '../types';
import { Instagram, MessageCircle, MessageSquare, Hash, Search } from 'lucide-react';

interface SidebarProps {
  summaries: ConversationSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
  isMobile?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ summaries, activeId, onSelect, isMobile }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSummaries = useMemo(() => {
    return summaries.filter(s => 
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.source.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [summaries, searchQuery]);

  const getSourceIcon = (source: string) => {
    switch(source) {
      case 'instagram': return <Instagram size={12} className="text-pink-500" />;
      case 'whatsapp': return <MessageCircle size={12} className="text-green-500" />;
      case 'chatgpt': return <MessageSquare size={12} className="text-teal-500" />;
      default: return <Hash size={12} className="text-gray-500" />;
    }
  };

  if (isMobile) {
    return (
      <div className="flex flex-col h-full">
        <div className="relative mb-4 px-2">
          <Search className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-600" size={14} />
          <input 
            type="text"
            placeholder="بحث..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#060606] border border-[#1A1A1A] rounded-xl py-3 pr-10 pl-3 text-xs focus:outline-none focus:border-indigo-500/50"
          />
        </div>
        <div className="space-y-1">
          {filteredSummaries.map(summary => (
            <div 
              key={summary.id}
              onClick={() => onSelect(summary.id)}
              className={`p-4 cursor-pointer rounded-xl transition-all border ${activeId === summary.id ? 'bg-indigo-600/10 border-indigo-500/20' : 'bg-[#0D0D0D] border-white/5'}`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">{getSourceIcon(summary.source)}</div>
                <span className="text-[8px] text-gray-700">{new Date(summary.lastMessageTimestamp).toLocaleDateString()}</span>
              </div>
              <h3 className={`font-bold truncate text-[12px] ${activeId === summary.id ? 'text-indigo-400' : 'text-gray-300'}`}>
                {summary.title}
              </h3>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <aside className="w-64 border-l border-[#1A1A1A] bg-[#0B0B0B] flex flex-col h-full shrink-0 z-20" dir="rtl">
      <div className="p-5 border-b border-[#1A1A1A] bg-[#0D0D0D]">
        <h1 className="text-sm font-black text-white mb-3">سجلات الذاكرة</h1>
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600" size={12} />
          <input 
            type="text"
            placeholder="بحث في السجلات..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#060606] border border-[#1A1A1A] rounded-lg py-2 pr-8 pl-3 text-[11px] focus:outline-none focus:border-indigo-500/50 transition-all placeholder:text-gray-700"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {filteredSummaries.map(summary => (
          <div 
            key={summary.id}
            onClick={() => onSelect(summary.id)}
            className={`p-4 cursor-pointer border-b border-[#1A1A1A] transition-all relative group ${activeId === summary.id ? 'bg-indigo-600/10 border-l-2 border-l-indigo-500' : 'hover:bg-[#121212]'}`}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                {getSourceIcon(summary.source)}
                <span className="text-[8px] text-gray-600 font-black uppercase tracking-tighter">{summary.source}</span>
              </div>
              <span className="text-[8px] text-gray-700">{new Date(summary.lastMessageTimestamp).toLocaleDateString()}</span>
            </div>
            <h3 className={`font-bold truncate text-[12px] ${activeId === summary.id ? 'text-indigo-400' : 'text-gray-300'}`}>
              {summary.title}
            </h3>
            <div className="flex items-center gap-1 mt-1 text-[9px] text-gray-600">
               <Hash size={8} /> <span>{summary.messageCount} قطعة ذاكرة</span>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};

export default Sidebar;
