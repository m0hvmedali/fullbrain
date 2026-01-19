
import React from 'react';
import { ConversationSummary } from '../types';
import { Instagram, MessageCircle, MessageSquare, Clock, Hash } from 'lucide-react';

interface SidebarProps {
  summaries: ConversationSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ summaries, activeId, onSelect }) => {
  const getSourceIcon = (source: string) => {
    switch(source) {
      case 'instagram': return <Instagram size={14} className="text-pink-500" />;
      case 'whatsapp': return <MessageCircle size={14} className="text-green-500" />;
      case 'chatgpt': return <MessageSquare size={14} className="text-teal-500" />;
      default: return <Hash size={14} className="text-gray-500" />;
    }
  };

  return (
    <aside className="w-80 border-l border-[#1A1A1A] bg-[#0B0B0B] flex flex-col h-full shadow-2xl z-20">
      <div className="p-8 border-b border-[#1A1A1A] bg-[#0D0D0D]">
        <h1 className="text-xl font-black tracking-tight text-white mb-1">المحادثات</h1>
        <div className="flex items-center gap-2">
           <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
           <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">ذاكرة نشطة: {summaries.length}</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {summaries.map(summary => (
          <div 
            key={summary.id}
            onClick={() => onSelect(summary.id)}
            className={`p-5 cursor-pointer border-b border-[#1A1A1A] transition-all relative group ${activeId === summary.id ? 'bg-indigo-600/5 border-l-4 border-l-indigo-500' : 'hover:bg-[#121212]'}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1 bg-[#1A1A1A] rounded-md">{getSourceIcon(summary.source)}</div>
              <span className="text-[9px] text-gray-500 font-bold uppercase tracking-tighter">{summary.source}</span>
            </div>
            <h3 className={`font-semibold truncate text-sm ${activeId === summary.id ? 'text-indigo-400' : 'text-gray-300 group-hover:text-white'}`}>
              {summary.title}
            </h3>
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-1 text-[10px] text-gray-600">
                <Clock size={10} />
                <span>{new Date(summary.lastMessageTimestamp).toLocaleDateString('ar-EG')}</span>
              </div>
              <div className="px-2 py-0.5 bg-[#1A1A1A] text-gray-400 rounded-md text-[9px] font-bold">
                {summary.messageCount} رسالة
              </div>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};

export default Sidebar;
