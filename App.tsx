
import React, { useState, useMemo, useEffect } from 'react';
import { StandardizedMessage, ConversationSummary } from './types';
import Sidebar from './components/Sidebar';
import ConversationTimeline from './components/ConversationTimeline';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import MemoryAI from './components/MemoryAI';
import Dashboard from './components/Dashboard';
import ImportModal from './components/ImportModal';
import { getAllUnifiedMessages } from './data/index';
import { getAllMessages, clearAllMessages } from './utils/db';
import { processFile } from './utils/parser';
import { 
  Database, MessageSquare, PieChart, BrainCircuit, Home, 
  Menu, X, Info, Loader2, UploadCloud
} from 'lucide-react';

const App: React.FC = () => {
  const [messages, setMessages] = useState<StandardizedMessage[]>([]);
  const [activeView, setActiveView] = useState<'dashboard' | 'chats' | 'analytics' | 'memory-ai'>('dashboard');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [currentImportFile, setCurrentImportFile] = useState("");

  const loadData = async () => {
    try {
      const staticMessages = getAllUnifiedMessages();
      const formattedStatic: StandardizedMessage[] = staticMessages.map(m => {
        const content = m.text || m.message || m.content || "";
        return {
          id: m.id || Math.random().toString(),
          source: m.sourceFile === 'messages' ? 'whatsapp' : (m.sourceFile as any),
          conversation_id: m.conversation_id || `file_${m.sourceFile}`,
          person_or_title: m.sender || m.sourceFile,
          timestamp: m.timestamp || Date.now(),
          sender: m.sender || "مجهول",
          direction: m.direction || 'received',
          content: content,
          meta: {
            message_length: content.length,
            word_count: content.split(/\s+/).length,
            has_question: content.includes('؟') || content.includes('?'),
            has_exclamation: content.includes('!')
          }
        };
      });

      const userMessages = await getAllMessages();
      setMessages([...formattedStatic, ...userMessages]);
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setIsReady(true);
    }
  };

  useEffect(() => {
    loadData();
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

  const handleImportFiles = async (files: FileList) => {
    setIsImportModalOpen(false);
    setIsImporting(true);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setCurrentImportFile(file.name);
      setImportProgress(0);
      await processFile(file, (p) => setImportProgress(p));
    }
    setIsImporting(false);
    setImportProgress(0);
    loadData();
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen bg-[#060606] text-[#E0E0E0] overflow-hidden" dir="rtl">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between px-5 py-4 bg-[#080808] border-b border-white/5 z-[60]">
        <div className="flex items-center gap-2" onClick={() => setActiveView('dashboard')}>
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Database size={16} className="text-white" />
          </div>
          <span className="font-black text-sm">ذاكرة النظام</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 bg-white/5 rounded-lg text-indigo-400">
          <Menu size={20} />
        </button>
      </div>

      {/* Desktop sidebar navigation */}
      <div className="hidden md:flex w-14 flex-col items-center py-6 border-l border-white/5 bg-[#080808] z-50 shrink-0">
        <div className="mb-8">
          <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center cursor-pointer shadow-lg" onClick={() => setActiveView('dashboard')}>
            <Database size={18} className="text-white" />
          </div>
        </div>
        <nav className="flex flex-col gap-5 flex-1">
          <NavButton active={activeView === 'dashboard'} onClick={() => setActiveView('dashboard')} icon={<Home size={18} />} label="الرئيسية" />
          <NavButton active={activeView === 'chats'} onClick={() => setIsMobileMenuOpen(true)} icon={<MessageSquare size={18} />} label="المحادثات" />
          <NavButton active={activeView === 'memory-ai'} onClick={() => setActiveView('memory-ai')} icon={<BrainCircuit size={18} />} label="الرادار الذكي" />
          <NavButton active={activeView === 'analytics'} onClick={() => setActiveView('analytics')} icon={<PieChart size={18} />} label="الإحصائيات" />
        </nav>
      </div>

      {/* Mobile Sidebar (Drawer) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[100] md:hidden">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="absolute top-0 right-0 w-72 h-full bg-[#0B0B0B] border-l border-white/10 shadow-2xl flex flex-col p-6">
            <div className="flex justify-between items-center mb-8">
              <span className="font-black text-indigo-400">سجلات الذاكرة</span>
              <button onClick={() => setIsMobileMenuOpen(false)} className="text-gray-500"><X size={24}/></button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <Sidebar 
                summaries={conversationSummaries} 
                activeId={selectedConversationId} 
                onSelect={(id) => { setSelectedConversationId(id); setActiveView('chats'); setIsMobileMenuOpen(false); }} 
                isMobile 
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Sidebar (Desktop Only) */}
      <div className="hidden md:block">
        <Sidebar summaries={conversationSummaries} activeId={selectedConversationId} onSelect={(id) => { setSelectedConversationId(id); setActiveView('chats'); }} />
      </div>

      <main className="flex-1 flex flex-col relative overflow-hidden h-full">
        {!isReady ? (
          <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>
        ) : (
          <div className="flex-1 overflow-hidden h-full flex flex-col">
            <div className="flex-1 overflow-hidden">
              {activeView === 'dashboard' && <Dashboard messages={messages} onImport={() => setIsImportModalOpen(true)} onGDrive={() => {}} isSyncing={false} />}
              {activeView === 'chats' && <ConversationTimeline messages={messages.filter(m => m.conversation_id === selectedConversationId)} conversation={conversationSummaries.find(s => s.id === selectedConversationId)} allMessages={messages} />}
              {activeView === 'analytics' && <AnalyticsDashboard messages={messages} />}
              {activeView === 'memory-ai' && <MemoryAI onSelectChat={(id) => { setSelectedConversationId(id); setActiveView('chats'); }} />}
            </div>

            {/* Mobile Bottom Navigation */}
            <div className="md:hidden flex items-center justify-around py-3 bg-[#080808] border-t border-white/5 shrink-0">
              <BottomTab active={activeView === 'dashboard'} onClick={() => setActiveView('dashboard')} icon={<Home size={20} />} label="الرئيسية" />
              <BottomTab active={activeView === 'memory-ai'} onClick={() => setActiveView('memory-ai')} icon={<BrainCircuit size={20} />} label="الرادار" />
              <BottomTab active={activeView === 'analytics'} onClick={() => setActiveView('analytics')} icon={<PieChart size={20} />} label="إحصائيات" />
              <BottomTab active={activeView === 'chats'} onClick={() => setIsMobileMenuOpen(true)} icon={<MessageSquare size={20} />} label="سجلات" />
            </div>
          </div>
        )}
      </main>

      {isImportModalOpen && <ImportModal onClose={() => setIsImportModalOpen(false)} onImport={handleImportFiles} />}
      {isImporting && (
        <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-[#0D0D0D] border border-white/10 p-8 rounded-[2rem] text-center">
            <UploadCloud className="text-indigo-500 mx-auto mb-4 animate-bounce" size={48} />
            <h3 className="font-black text-white mb-2">جاري استيعاب الذاكرة...</h3>
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden mb-2">
              <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${importProgress}%` }} />
            </div>
            <p className="text-[10px] text-gray-600 font-bold uppercase">{importProgress}% مكتمل</p>
          </div>
        </div>
      )}
    </div>
  );
};

const NavButton = ({ active, onClick, icon, label }: any) => (
  <button onClick={onClick} className={`group relative flex items-center justify-center p-2.5 rounded-lg transition-all ${active ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-600 hover:bg-white/5'}`}>
    {icon}
    <span className="absolute right-full mr-2 px-2 py-1 bg-black border border-white/10 text-[9px] font-bold rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">{label}</span>
  </button>
);

const BottomTab = ({ active, onClick, icon, label }: any) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1 transition-all ${active ? 'text-indigo-400' : 'text-gray-600'}`}>
    {icon}
    <span className="text-[9px] font-black uppercase tracking-tighter">{label}</span>
  </button>
);

export default App;
