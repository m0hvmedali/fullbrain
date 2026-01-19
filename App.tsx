
import React, { useState, useMemo, useEffect } from 'react';
import { StandardizedMessage, ConversationSummary } from './types';
import Sidebar from './components/Sidebar';
import ConversationTimeline from './components/ConversationTimeline';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import MemoryAI from './components/MemoryAI';
import Dashboard from './components/Dashboard';
import { getAllUnifiedMessages } from './data/index';
// Added Loader2 to the imports
import { 
  Database, MessageSquare, PieChart, BrainCircuit, Home, 
  Trash2, Search as SearchIcon, Info, Loader2
} from 'lucide-react';

const App: React.FC = () => {
  const [messages, setMessages] = useState<StandardizedMessage[]>([]);
  const [activeView, setActiveView] = useState<'dashboard' | 'chats' | 'analytics' | 'memory-ai'>('dashboard');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // تحميل البيانات الثابتة من المجلد المحلي فوراً
    const staticMessages = getAllUnifiedMessages();
    // تحويل البيانات لشكل StandardizedMessage المتوافق مع التطبيق
    const formatted: StandardizedMessage[] = staticMessages.map(m => ({
      id: m.id || Math.random().toString(),
      source: m.sourceFile === 'messages' ? 'whatsapp' : (m.sourceFile as any),
      conversation_id: m.conversation_id || `file_${m.sourceFile}`,
      person_or_title: m.sender || m.sourceFile,
      timestamp: m.timestamp || Date.now(),
      sender: m.sender || "مجهول",
      direction: m.direction || 'received',
      content: m.text || m.message || m.content || "",
      meta: {
        message_length: (m.text || m.message || "").length,
        word_count: (m.text || m.message || "").split(/\s+/).length,
        has_question: (m.text || m.message || "").includes('؟'),
        has_exclamation: (m.text || m.message || "").includes('!')
      }
    }));
    setMessages(formatted);
    setIsReady(true);
  }, []);

  const conversationSummaries = useMemo(() => {
    const map = new Map<string, ConversationSummary>();
    messages.forEach(m => {
      const existing = map.get(m.conversation_id);
      if (existing) {
        existing.messageCount++;
        if (m.timestamp > existing.lastMessageTimestamp) existing.lastMessageTimestamp = m.timestamp;
      } else {
        map.set(m.conversation_id, {
          id: m.conversation_id, title: m.person_or_title, source: m.source,
          lastMessageTimestamp: m.timestamp, messageCount: 1, participants: [m.sender]
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.lastMessageTimestamp - a.lastMessageTimestamp);
  }, [messages]);

  return (
    <div className="flex h-screen w-screen bg-[#060606] text-[#E0E0E0] overflow-hidden" dir="rtl">
      {/* Mini Sidebar Nav */}
      <div className="w-14 flex flex-col items-center py-6 border-l border-white/5 bg-[#080808] z-50 shrink-0">
        <div className="mb-8">
          <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center cursor-pointer shadow-lg" onClick={() => setActiveView('dashboard')}>
            <Database size={18} className="text-white" />
          </div>
        </div>
        <nav className="flex flex-col gap-5 flex-1">
          <NavButton active={activeView === 'dashboard'} onClick={() => setActiveView('dashboard')} icon={<Home size={18} />} label="الرئيسية" />
          <NavButton active={activeView === 'chats'} onClick={() => setActiveView('chats')} icon={<MessageSquare size={18} />} label="المحادثات" />
          <NavButton active={activeView === 'memory-ai'} onClick={() => setActiveView('memory-ai')} icon={<BrainCircuit size={18} />} label="الرادار الذكي" />
          <NavButton active={activeView === 'analytics'} onClick={() => setActiveView('analytics')} icon={<PieChart size={18} />} label="الإحصائيات" />
        </nav>
        <div className="mt-auto opacity-20 hover:opacity-100 transition-opacity">
           <div className="p-3 text-gray-700" title="النظام يعمل بالبيانات المحلية الثابتة">
              <Info size={16} />
           </div>
        </div>
      </div>

      <Sidebar summaries={conversationSummaries} activeId={selectedConversationId} onSelect={(id) => { setSelectedConversationId(id); setActiveView('chats'); }} />

      <main className="flex-1 flex flex-col relative overflow-hidden h-full">
        {!isReady ? (
          <div className="flex-1 flex items-center justify-center">
             <Loader2 className="animate-spin text-indigo-500" size={32} />
          </div>
        ) : (
          <div className="flex-1 overflow-hidden h-full">
              {activeView === 'dashboard' && <Dashboard messages={messages} onImport={() => {}} onGDrive={() => {}} isSyncing={false} />}
              {activeView === 'chats' && <ConversationTimeline messages={messages.filter(m => m.conversation_id === selectedConversationId)} conversation={conversationSummaries.find(s => s.id === selectedConversationId)} allMessages={messages} />}
              {activeView === 'analytics' && <AnalyticsDashboard messages={messages} />}
              {activeView === 'memory-ai' && <MemoryAI onSelectChat={(id) => { setSelectedConversationId(id); setActiveView('chats'); }} />}
          </div>
        )}
      </main>
    </div>
  );
};

const NavButton = ({ active, onClick, icon, label }: any) => (
  <button onClick={onClick} className={`group relative flex items-center justify-center p-2.5 rounded-lg transition-all ${active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-gray-600 hover:bg-white/5'}`}>
    {icon}
    <span className="absolute right-full mr-2 px-2 py-1 bg-black border border-white/10 text-[9px] font-bold rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">{label}</span>
  </button>
);

export default App;
