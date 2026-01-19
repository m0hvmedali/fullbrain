
import React, { useState, useMemo, useCallback } from 'react';
import { 
  StandardizedMessage, 
  ConversationSummary, 
  SearchFilters 
} from './types';
import { 
  detectSource, 
  parseWhatsApp, 
  parseInstagram, 
  parseChatGPT 
} from './utils/parser';
import Sidebar from './components/Sidebar';
import ConversationTimeline from './components/ConversationTimeline';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import ImportModal from './components/ImportModal';
import SearchBar from './components/SearchBar';
import { Layout, MessageSquare, PieChart, Search as SearchIcon, FileText } from 'lucide-react';

const App: React.FC = () => {
  const [messages, setMessages] = useState<StandardizedMessage[]>([]);
  const [activeView, setActiveView] = useState<'chats' | 'analytics' | 'search'>('chats');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    keyword: '',
    sender: '',
    source: 'all',
    dateFrom: '',
    dateTo: '',
    minLength: 0
  });

  // Handle file imports
  const handleFiles = async (files: FileList) => {
    let newMessages: StandardizedMessage[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const source = await detectSource(file);
      
      try {
        let parsed: StandardizedMessage[] = [];
        if (source === 'whatsapp') parsed = await parseWhatsApp(file);
        else if (source === 'instagram') parsed = await parseInstagram(file);
        else if (source === 'chatgpt') parsed = await parseChatGPT(file);
        
        newMessages = [...newMessages, ...parsed];
      } catch (err) {
        console.error(`Failed to parse ${file.name}:`, err);
      }
    }
    setMessages(prev => [...prev, ...newMessages]);
    setIsImporting(false);
  };

  // Group messages into summaries for the sidebar
  const conversationSummaries = useMemo(() => {
    const map = new Map<string, ConversationSummary>();
    messages.forEach(m => {
      const existing = map.get(m.conversation_id);
      if (existing) {
        existing.messageCount++;
        if (m.timestamp > existing.lastMessageTimestamp) {
          existing.lastMessageTimestamp = m.timestamp;
        }
        if (!existing.participants.includes(m.sender)) {
          existing.participants.push(m.sender);
        }
      } else {
        map.set(m.conversation_id, {
          id: m.conversation_id,
          title: m.person_or_title,
          source: m.source,
          lastMessageTimestamp: m.timestamp,
          messageCount: 1,
          participants: [m.sender]
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.lastMessageTimestamp - a.lastMessageTimestamp);
  }, [messages]);

  // Filter messages for active timeline or search
  const filteredMessages = useMemo(() => {
    if (activeView === 'chats' && selectedConversationId) {
      return messages
        .filter(m => m.conversation_id === selectedConversationId)
        .sort((a, b) => a.timestamp - b.timestamp);
    }
    if (activeView === 'search') {
      return messages.filter(m => {
        const matchesKeyword = m.content.toLowerCase().includes(searchFilters.keyword.toLowerCase());
        const matchesSender = m.sender.toLowerCase().includes(searchFilters.sender.toLowerCase());
        const matchesSource = searchFilters.source === 'all' || m.source === searchFilters.source;
        const matchesLength = m.meta.message_length >= searchFilters.minLength;
        
        let matchesDate = true;
        if (searchFilters.dateFrom) matchesDate = matchesDate && m.timestamp >= new Date(searchFilters.dateFrom).getTime();
        if (searchFilters.dateTo) matchesDate = matchesDate && m.timestamp <= new Date(searchFilters.dateTo).getTime();

        return matchesKeyword && matchesSender && matchesSource && matchesLength && matchesDate;
      }).sort((a, b) => b.timestamp - a.timestamp);
    }
    return [];
  }, [messages, selectedConversationId, activeView, searchFilters]);

  return (
    <div className="flex h-screen bg-[#0B0B0B] text-[#E0E0E0] overflow-hidden">
      {/* Sidebar Navigation */}
      <div className="w-16 flex flex-col items-center py-6 border-r border-[#1A1A1A] bg-[#0D0D0D] gap-8">
        <div className="p-2 bg-indigo-600 rounded-lg cursor-pointer hover:bg-indigo-500 transition-colors">
          <Layout size={24} />
        </div>
        <nav className="flex flex-col gap-6">
          <button 
            onClick={() => setActiveView('chats')}
            className={`p-2 rounded-lg transition-colors ${activeView === 'chats' ? 'text-indigo-500 bg-indigo-500/10' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <MessageSquare size={24} />
          </button>
          <button 
            onClick={() => setActiveView('search')}
            className={`p-2 rounded-lg transition-colors ${activeView === 'search' ? 'text-indigo-500 bg-indigo-500/10' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <SearchIcon size={24} />
          </button>
          <button 
            onClick={() => setActiveView('analytics')}
            className={`p-2 rounded-lg transition-colors ${activeView === 'analytics' ? 'text-indigo-500 bg-indigo-500/10' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <PieChart size={24} />
          </button>
        </nav>
        <button 
          onClick={() => setIsImporting(true)}
          className="mt-auto p-2 text-indigo-500 hover:text-indigo-400"
        >
          <FileText size={24} />
        </button>
      </div>

      {/* Primary Sidebar - List of conversations */}
      <Sidebar 
        summaries={conversationSummaries} 
        activeId={selectedConversationId} 
        onSelect={(id) => {
          setSelectedConversationId(id);
          setActiveView('chats');
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {activeView === 'chats' && (
          <ConversationTimeline 
            messages={filteredMessages} 
            conversation={conversationSummaries.find(s => s.id === selectedConversationId)}
          />
        )}
        {activeView === 'search' && (
          <div className="flex-1 flex flex-col p-6 overflow-hidden">
            <SearchBar filters={searchFilters} setFilters={setSearchFilters} />
            <div className="flex-1 overflow-y-auto mt-6">
               <h2 className="text-xl font-bold mb-4">Results ({filteredMessages.length})</h2>
               <div className="space-y-4 pb-20">
                 {filteredMessages.map(m => (
                    <div key={m.id} className="p-4 bg-[#121212] border border-[#1A1A1A] rounded-xl hover:border-indigo-500/30 transition-all cursor-pointer" onClick={() => {
                        setSelectedConversationId(m.conversation_id);
                        setActiveView('chats');
                    }}>
                        <div className="flex justify-between text-xs text-gray-500 mb-2">
                            <span>{m.sender} via {m.source}</span>
                            <span>{new Date(m.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="text-gray-200 line-clamp-3 whitespace-pre-wrap">{m.content}</p>
                    </div>
                 ))}
               </div>
            </div>
          </div>
        )}
        {activeView === 'analytics' && (
          <AnalyticsDashboard messages={messages} />
        )}

        {!selectedConversationId && activeView === 'chats' && (
          <div className="flex-1 flex items-center justify-center text-gray-500 flex-col gap-4">
             <MessageSquare size={64} className="opacity-20" />
             <p className="text-lg">Select a conversation or import files to begin</p>
             <button 
                onClick={() => setIsImporting(true)}
                className="px-6 py-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-500"
             >
                Import Logs
             </button>
          </div>
        )}
      </main>

      {/* Modals */}
      {isImporting && (
        <ImportModal 
          onClose={() => setIsImporting(false)} 
          onImport={handleFiles} 
        />
      )}
    </div>
  );
};

export default App;
