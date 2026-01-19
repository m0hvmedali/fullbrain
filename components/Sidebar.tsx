
import React from 'react';
import { ConversationSummary } from '../types';
import { Instagram, MessageCircle, MessageSquare, Clock } from 'lucide-react';

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
      default: return null;
    }
  };

  return (
    <aside className="w-80 border-r border-[#1A1A1A] bg-[#0B0B0B] flex flex-col h-full">
      <div className="p-6 border-b border-[#1A1A1A]">
        <h1 className="text-xl font-bold tracking-tight">Conversations</h1>
        <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest font-semibold">{summaries.length} Channels Loaded</p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {summaries.map(summary => (
          <div 
            key={summary.id}
            onClick={() => onSelect(summary.id)}
            className={`p-4 cursor-pointer border-b border-[#1A1A1A] transition-all relative ${activeId === summary.id ? 'bg-indigo-900/10 border-r-2 border-r-indigo-500' : 'hover:bg-[#121212]'}`}
          >
            <div className="flex items-center gap-2 mb-1">
              {getSourceIcon(summary.source)}
              <span className="text-xs text-gray-500 uppercase font-mono">{summary.source}</span>
            </div>
            <h3 className={`font-medium truncate ${activeId === summary.id ? 'text-indigo-400' : 'text-gray-200'}`}>
              {summary.title}
            </h3>
            <div className="flex items-center justify-between mt-2 text-[10px] text-gray-500 font-mono">
              <div className="flex items-center gap-1">
                <Clock size={10} />
                {new Date(summary.lastMessageTimestamp).toLocaleDateString()}
              </div>
              <div className="px-2 py-0.5 bg-[#1A1A1A] rounded-full">
                {summary.messageCount} msgs
              </div>
            </div>
          </div>
        ))}
        {summaries.length === 0 && (
          <div className="p-10 text-center text-gray-600 italic">
            No conversations found.
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
