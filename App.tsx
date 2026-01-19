
import React, { useState, useMemo, useEffect } from 'react';
import { StandardizedMessage, ConversationSummary, SearchFilters } from './types';
import { processFile, processRawData } from './utils/parser';
import { getAllMessages, saveMessages, clearAllMessages } from './utils/db';
import { initGoogleDrive, openPicker, fetchFolderFiles, fetchFileContent } from './utils/googleDrive';
import Sidebar from './components/Sidebar';
import ConversationTimeline from './components/ConversationTimeline';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import ImportModal from './components/ImportModal';
import SearchBar from './components/SearchBar';
import PromptManager from './components/PromptManager';
import MemoryAI from './components/MemoryAI';
import Dashboard from './components/Dashboard';
import { 
  Database, MessageSquare, PieChart, Search as SearchIcon, 
  Trash2, Cloud, LayoutGrid, Zap, Activity, Info, Loader2, CheckCircle, AlertCircle, Sparkles, BrainCircuit, Home, Command
} from 'lucide-react';

const App: React.FC = () => {
  const [messages, setMessages] = useState<StandardizedMessage[]>([]);
  const [activeView, setActiveView] = useState<'dashboard' | 'chats' | 'analytics' | 'search' | 'prompts' | 'memory-ai'>('dashboard');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ type: 'success' | 'error' | 'idle', message: string }>({ type: 'idle', message: '' });
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    keyword: '', sender: '', source: 'all', dateFrom: '', dateTo: '', minLength: 0
  });

  useEffect(() => {
    const loadMemory = async () => {
      try {
        const saved = await getAllMessages();
        if (saved) setMessages(saved);
      } catch (err) {
        console.error("Database error:", err);
      } finally {
        setIsReady(true);
      }
    };
    loadMemory();
    initGoogleDrive(); 

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleFiles = async (files: FileList) => {
    if (!files || files.length === 0) {
      setIsImporting(false);
      return;
    }
    setIsSyncing(true);
    setSyncStatus({ type: 'idle', message: 'جاري استيعاب الذاكرة...' });
    
    try {
      const fileArray = Array.from(files);
      const parsedResults = await Promise.all(
        fileArray.map(async (file) => {
          try {
            return await processFile(file);
          } catch (err) {
            return [];
          }
        })
      );
      const newMessages = parsedResults.flat();
      if (newMessages.length > 0) {
        await updateMessageState(newMessages);
        setSyncStatus({ type: 'success', message: `تم إضافة ${newMessages.length} ذكرى جديدة.` });
      } else {
        setSyncStatus({ type: 'error', message: 'تعذر فهم محتوى هذه الملفات.' });
      }
    } catch (error) {
      setSyncStatus({ type: 'error', message: 'حدث خطأ أثناء المعالجة.' });
    } finally {
      setIsSyncing(false);
      setIsImporting(false);
      setTimeout(() => setSyncStatus({ type: 'idle', message: '' }), 3000);
    }
  };

  const updateMessageState = async (newMsgs: StandardizedMessage[]) => {
    setMessages(prev => {
      const uniqueMap = new Map();
      [...prev, ...newMsgs].forEach(m => uniqueMap.set(m.id, m));
      return Array.from(uniqueMap.values());
    });
    await saveMessages(newMsgs);
  };

  const handleGDriveSync = async () => {
    setIsSyncing(true);
    setSyncStatus({ type: 'idle', message: 'جاري الاتصال بالسحابة...' });
    try {
      const selection = await openPicker();
      if (!selection) {
        setIsSyncing(false);
        return;
      }

      setSyncStatus({ type: 'idle', message: `جاري سحب ${selection.name}...` });
      
      let allParsed: StandardizedMessage[] = [];
      if (selection.isFolder) {
        const driveFiles = await fetchFolderFiles(selection.id);
        for (const file of driveFiles) {
          const parsed = await processRawData(file.content, file.name);
          allParsed = [...allParsed, ...parsed];
        }
      } else {
        const content = await fetchFileContent(selection.id);
        allParsed = await processRawData(content, selection.name);
      }

      if (allParsed.length > 0) {
        await updateMessageState(allParsed);
        setSyncStatus({ type: 'success', message: `تمت المزامنة بنجاح.` });
      } else {
        setSyncStatus({ type: 'error', message: 'الملف المختار فارغ أو غير نصي.' });
      }
    } catch (error: any) {
      setSyncStatus({ type: 'error', message: 'فشلت المزامنة.' });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatus({ type: 'idle', message: '' }), 5000);
    }
  };

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

  const filteredMessages = useMemo(() => {
    if (activeView === 'chats' && selectedConversationId) {
      return messages.filter(m => m.conversation_id === selectedConversationId).sort((a, b) => a.timestamp - b.timestamp);
    }
    if (activeView === 'search') {
      return messages.filter(m => {
        const matchesKeyword = m.content.toLowerCase().includes(searchFilters.keyword.toLowerCase());
        const matchesSender = m.sender.toLowerCase().includes(searchFilters.sender.toLowerCase());
        const matchesSource = searchFilters.source === 'all' || m.source === searchFilters.source;
        return matchesKeyword && matchesSender && matchesSource;
      }).sort((a, b) => b.timestamp - a.timestamp);
    }
    return [];
  }, [messages, selectedConversationId, activeView, searchFilters]);

  if (!isReady) {
    return (
      <div className="h-screen w-screen bg-[#060606] flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-indigo-500 font-bold animate-pulse text-xs uppercase tracking-widest">MemIntell: Loading Core...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full bg-[#060606] text-[#E0E0E0] overflow-hidden" dir="rtl">
      {/* الشريط الجانبي الضيق للملاحة */}
      <div className="w-16 flex flex-col items-center py-6 border-l border-white/5 bg-[#080808] z-50 shrink-0">
        <div className="mb-8">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg cursor-pointer" onClick={() => setActiveView('dashboard')}>
            <Database size={20} className="text-white" />
          </div>
        </div>
        <nav className="flex flex-col gap-6 flex-1">
          <NavButton active={activeView === 'dashboard'} onClick={() => setActiveView('dashboard')} icon={<Home size={20} />} label="الرئيسية" />
          <NavButton active={activeView === 'chats'} onClick={() => setActiveView('chats')} icon={<MessageSquare size={20} />} label="المحادثات" />
          <NavButton active={activeView === 'memory-ai'} onClick={() => setActiveView('memory-ai')} icon={<BrainCircuit size={20} />} label="الذاكرة الذكية" />
          <NavButton active={activeView === 'search'} onClick={() => setActiveView('search')} icon={<SearchIcon size={20} />} label="البحث" />
          <NavButton active={activeView === 'analytics'} onClick={() => setActiveView('analytics')} icon={<PieChart size={20} />} label="الإحصائيات" />
          <NavButton active={activeView === 'prompts'} onClick={() => setActiveView('prompts')} icon={<Sparkles size={20} />} label="القوالب" />
        </nav>
        <div className="flex flex-col gap-4 mt-auto">
          <NavButton active={false} onClick={() => setIsImporting(true)} icon={<Zap size={20} />} label="استيراد" color="text-yellow-500" />
          <NavButton active={false} onClick={() => { if(confirm('مسح كل الذاكرة؟')) { clearAllMessages(); setMessages([]); } }} icon={<Trash2 size={20} />} label="مسح" color="text-red-500" />
        </div>
      </div>

      {/* قائمة المحادثات (تظهر فقط في عرض الدردشات أو الذاكرة) */}
      <Sidebar summaries={conversationSummaries} activeId={selectedConversationId} onSelect={(id) => { setSelectedConversationId(id); setActiveView('chats'); }} />

      {/* المحتوى الرئيسي */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-[#060606]">
        {syncStatus.message && (
          <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 rounded-xl flex items-center gap-2 animate-fade-in shadow-xl border ${syncStatus.type === 'error' ? 'bg-red-900/20 border-red-500/30 text-red-400' : 'bg-indigo-900/20 border-indigo-500/30 text-indigo-400'}`}>
            {isSyncing ? <Loader2 size={14} className="animate-spin" /> : <Info size={14} />}
            <span className="text-[11px] font-bold">{syncStatus.message}</span>
          </div>
        )}

        <div className="flex-1 overflow-hidden flex flex-col h-full">
            {activeView === 'dashboard' && (
              <Dashboard 
                messages={messages} 
                onImport={() => setIsImporting(true)} 
                onGDrive={handleGDriveSync} 
                isSyncing={isSyncing} 
              />
            )}

            {activeView === 'chats' && selectedConversationId ? (
              <ConversationTimeline 
                messages={filteredMessages} 
                conversation={conversationSummaries.find(s => s.id === selectedConversationId)} 
                allMessages={messages}
              />
            ) : activeView === 'chats' ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center h-full">
                 <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-6 border border-white/5">
                    <LayoutGrid size={24} className="text-gray-700" />
                 </div>
                 <h2 className="text-xl font-bold text-white mb-2">اختر ملف ذاكرة</h2>
                 <p className="text-gray-600 max-w-xs text-sm">استعرض تاريخك الرقمي باختيار أي سجل من القائمة اليمنى.</p>
              </div>
            ) : null}

            {activeView === 'search' && (
              <div className="flex-1 flex flex-col p-8 overflow-hidden animate-fade-in h-full">
                <header className="mb-6">
                   <h2 className="text-2xl font-black">محرك البحث</h2>
                </header>
                <SearchBar filters={searchFilters} setFilters={setSearchFilters} />
                <div className="flex-1 overflow-y-auto mt-6 custom-scrollbar space-y-4">
                   {filteredMessages.map(m => (
                     <div key={m.id} onClick={() => { setSelectedConversationId(m.conversation_id); setActiveView('chats'); }} className="p-5 bg-[#0A0A0A] border border-white/5 rounded-2xl hover:border-indigo-500/40 cursor-pointer transition-all">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{m.sender}</span>
                          <span className="text-[9px] text-gray-600 font-mono">{new Date(m.timestamp).toLocaleDateString()}</span>
                        </div>
                        <p className="text-gray-300 text-sm leading-relaxed">{m.content}</p>
                     </div>
                   ))}
                </div>
              </div>
            )}

            {activeView === 'analytics' && <AnalyticsDashboard messages={messages} />}
            {activeView === 'prompts' && <PromptManager />}
            {activeView === 'memory-ai' && <MemoryAI messages={messages} onSelectChat={(id) => { setSelectedConversationId(id); setActiveView('chats'); }} />}
        </div>
      </main>

      {isImporting && <ImportModal onClose={() => setIsImporting(false)} onImport={handleFiles} />}
    </div>
  );
};

const NavButton = ({ active, onClick, icon, label, color = "text-gray-500" }: any) => (
  <button 
    onClick={onClick} 
    className={`group relative flex items-center justify-center p-3 rounded-xl transition-all ${active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/40' : `${color} hover:bg-white/5`}`}
  >
    {icon}
    <span className="absolute right-full mr-3 px-2 py-1 bg-black border border-white/10 text-[9px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl">{label}</span>
  </button>
);

export default App;
