
import React, { useState, useMemo, useEffect } from 'react';
import { StandardizedMessage, ConversationSummary, SearchFilters, PromptTemplate } from './types';
import { processFile, processRawData } from './utils/parser';
import { getAllMessages, saveMessages, clearAllMessages, getPromptTemplates } from './utils/db';
import { initGoogleDrive, openPicker, fetchFolderFiles } from './utils/googleDrive';
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
    setSyncStatus({ type: 'idle', message: 'جاري معالجة الملفات المرفوعة...' });
    try {
      const fileArray = Array.from(files);
      const parsedResults = await Promise.all(
        fileArray.map(async (file) => {
          try {
            return await processFile(file);
          } catch (err) {
            console.error(`Error parsing file ${file.name}:`, err);
            return [];
          }
        })
      );
      const newMessages = parsedResults.flat();
      if (newMessages.length > 0) {
        await updateMessageState(newMessages);
        setSyncStatus({ type: 'success', message: `تم استيراد ${newMessages.length} رسالة بنجاح.` });
      } else {
        setSyncStatus({ type: 'error', message: 'لم يتم العثور على بيانات صالحة في الملفات المختارة.' });
      }
    } catch (error) {
      console.error("Batch processing error:", error);
      setSyncStatus({ type: 'error', message: 'حدث خطأ أثناء معالجة الملفات.' });
    } finally {
      setIsSyncing(false);
      setIsImporting(false);
      setTimeout(() => setSyncStatus({ type: 'idle', message: '' }), 3000);
    }
  };

  const updateMessageState = async (newMsgs: StandardizedMessage[]) => {
    setMessages(prev => {
      const combined = [...prev, ...newMsgs];
      return Array.from(new Map(combined.map(m => [m.id, m])).values());
    });
    await saveMessages(newMsgs);
  };

  const handleGDriveSync = async () => {
    setIsSyncing(true);
    setSyncStatus({ type: 'idle', message: 'جاري الاتصال بـ Google Drive...' });
    try {
      const folderId = await openPicker();
      if (!folderId) {
        setIsSyncing(false);
        return;
      }
      setSyncStatus({ type: 'idle', message: 'جاري جلب الملفات من المجلد المختار...' });
      const driveFiles = await fetchFolderFiles(folderId);
      let allParsed: StandardizedMessage[] = [];
      for (const file of driveFiles) {
        const parsed = await processRawData(file.content, file.name);
        allParsed = [...allParsed, ...parsed];
      }
      if (allParsed.length > 0) {
        await updateMessageState(allParsed);
        setSyncStatus({ type: 'success', message: `تمت المزامنة بنجاح! تم استيراد ${allParsed.length} رسالة.` });
      } else {
        setSyncStatus({ type: 'error', message: 'لم يتم العثور على ملفات مدعومة في هذا المجلد.' });
      }
    } catch (error: any) {
      console.error("GDrive Sync Error:", error);
      setSyncStatus({ type: 'error', message: `فشلت المزامنة: ${error.message || 'خطأ غير معروف'}` });
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
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-indigo-500 font-bold animate-pulse text-sm uppercase tracking-widest">MemIntell: Initializing Memory Core...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#060606] text-[#E0E0E0] overflow-hidden" dir="rtl">
      <div className="w-20 flex flex-col items-center py-10 border-l border-white/5 bg-[#080808] z-50">
        <div className="mb-14">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20 cursor-pointer" onClick={() => setActiveView('dashboard')}>
            <Database size={24} className="text-white" />
          </div>
        </div>
        <nav className="flex flex-col gap-8 flex-1">
          <NavButton active={activeView === 'dashboard'} onClick={() => setActiveView('dashboard')} icon={<Home size={22} />} label="الرئيسية" />
          <NavButton active={activeView === 'chats'} onClick={() => setActiveView('chats')} icon={<MessageSquare size={22} />} label="المحادثات" />
          <NavButton active={activeView === 'memory-ai'} onClick={() => setActiveView('memory-ai')} icon={<BrainCircuit size={22} />} label="اسأل ذاكرتك" />
          <NavButton active={activeView === 'search'} onClick={() => setActiveView('search')} icon={<SearchIcon size={22} />} label="البحث" />
          <NavButton active={activeView === 'analytics'} onClick={() => setActiveView('analytics')} icon={<PieChart size={22} />} label="الإحصائيات" />
          <NavButton active={activeView === 'prompts'} onClick={() => setActiveView('prompts')} icon={<Sparkles size={22} />} label="القوالب الذكية" />
        </nav>
        <div className="flex flex-col gap-6 mt-auto">
          <button 
            onClick={() => setShowCommandPalette(true)}
            className="group relative flex items-center justify-center p-3.5 rounded-2xl transition-all text-gray-500 hover:bg-white/5"
          >
            <Command size={22} />
            <span className="absolute right-full mr-4 px-3 py-1.5 bg-black border border-white/10 text-[10px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl">الأوامر (Cmd+K)</span>
          </button>
          <NavButton active={false} onClick={() => setIsImporting(true)} icon={<Zap size={22} />} label="استيراد" color="text-yellow-500" />
          <NavButton active={false} onClick={() => { if(confirm('مسح كل البيانات المحفوظة؟')) { clearAllMessages(); setMessages([]); } }} icon={<Trash2 size={22} />} label="مسح" color="text-red-500" />
        </div>
      </div>

      <Sidebar summaries={conversationSummaries} activeId={selectedConversationId} onSelect={(id) => { setSelectedConversationId(id); setActiveView('chats'); }} />

      <main className="flex-1 flex flex-col relative overflow-hidden bg-[#060606]">
        {syncStatus.message && (
          <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl flex items-center gap-3 animate-fade-in shadow-2xl border ${syncStatus.type === 'error' ? 'bg-red-900/20 border-red-500/30 text-red-400' : 'bg-indigo-900/20 border-indigo-500/30 text-indigo-400'}`}>
            {isSyncing ? <Loader2 size={18} className="animate-spin" /> : syncStatus.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
            <span className="text-xs font-bold">{syncStatus.message}</span>
          </div>
        )}

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
          <div className="flex-1 flex flex-col items-center justify-center p-12 animate-fade-in text-center">
             <div className="w-20 h-20 bg-white/5 rounded-[2rem] flex items-center justify-center mb-8 border border-white/5">
                <LayoutGrid size={32} className="text-gray-700" />
             </div>
             <h2 className="text-2xl font-black text-white mb-2">اختر محادثة لاستكشافها</h2>
             <p className="text-gray-600 max-w-xs leading-relaxed">تاريخك الرقمي ينتظرك. اختر أي دردشة من القائمة اليمنى للبدء في التحليل.</p>
          </div>
        ) : null}

        {activeView === 'search' && (
          <div className="flex-1 flex flex-col p-12 overflow-hidden animate-fade-in">
            <header className="mb-10">
               <h2 className="text-4xl font-black tracking-tighter">محرك البحث العميق</h2>
               <p className="text-gray-500 mt-2">ابحث في تاريخك الرقمي عبر المصادر المختلفة.</p>
            </header>
            <SearchBar filters={searchFilters} setFilters={setSearchFilters} />
            <div className="flex-1 overflow-y-auto mt-10 custom-scrollbar space-y-5">
               {filteredMessages.length === 0 ? (
                 <div className="text-center py-20 text-gray-600 font-bold">لا توجد نتائج مطابقة لبحثك</div>
               ) : (
                 filteredMessages.map(m => (
                   <div 
                     key={m.id} 
                     onClick={() => { setSelectedConversationId(m.conversation_id); setActiveView('chats'); }}
                     className="p-8 bg-[#0A0A0A] border border-white/5 rounded-[2rem] hover:border-indigo-500/40 cursor-pointer group transition-all"
                   >
                      <div className="flex justify-between items-center mb-5">
                        <div className="flex items-center gap-4">
                          <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500/50"></span>
                          <span className="text-xs font-black text-indigo-400 uppercase tracking-widest">{m.sender}</span>
                          <span className="px-2 py-0.5 bg-white/5 text-[9px] rounded-md text-gray-500 uppercase">{m.source}</span>
                        </div>
                        <span className="text-[10px] text-gray-600 font-mono">{new Date(m.timestamp).toLocaleString('ar-EG')}</span>
                      </div>
                      <p className="text-gray-300 leading-relaxed text-base">{m.content}</p>
                   </div>
                 ))
               )}
            </div>
          </div>
        )}

        {activeView === 'analytics' && <AnalyticsDashboard messages={messages} />}
        {activeView === 'prompts' && <PromptManager />}
        {activeView === 'memory-ai' && <MemoryAI messages={messages} onSelectChat={(id) => { setSelectedConversationId(id); setActiveView('chats'); }} />}
      </main>

      {isImporting && <ImportModal onClose={() => setIsImporting(false)} onImport={handleFiles} />}

      {/* Command Palette Overlay */}
      {showCommandPalette && (
        <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] px-6 bg-black/80 backdrop-blur-md animate-fade-in" onClick={() => setShowCommandPalette(false)}>
           <div className="w-full max-w-xl bg-[#121212] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="p-8 border-b border-white/5 flex items-center gap-4 bg-[#161616]">
                 <Command size={24} className="text-indigo-500" />
                 <input 
                    autoFocus
                    placeholder="ابحث عن أمر أو ميزة..."
                    className="flex-1 bg-transparent text-xl font-bold focus:outline-none placeholder:text-gray-700"
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setShowCommandPalette(false);
                    }}
                 />
              </div>
              <div className="p-6 space-y-2">
                 <CommandItem icon={<Home size={18}/>} label="الرئيسية" shortcut="G + H" onClick={() => { setActiveView('dashboard'); setShowCommandPalette(false); }} />
                 <CommandItem icon={<BrainCircuit size={18}/>} label="اسأل الذاكرة" shortcut="G + M" onClick={() => { setActiveView('memory-ai'); setShowCommandPalette(false); }} />
                 <CommandItem icon={<SearchIcon size={18}/>} label="بحث عميق" shortcut="G + S" onClick={() => { setActiveView('search'); setShowCommandPalette(false); }} />
                 <CommandItem icon={<PieChart size={18}/>} label="الإحصائيات" shortcut="G + A" onClick={() => { setActiveView('analytics'); setShowCommandPalette(false); }} />
                 <CommandItem icon={<Sparkles size={18}/>} label="قوالب ذكية" shortcut="G + P" onClick={() => { setActiveView('prompts'); setShowCommandPalette(false); }} />
                 <div className="h-px bg-white/5 my-4"></div>
                 <CommandItem icon={<Zap size={18}/>} label="استيراد بيانات" onClick={() => { setIsImporting(true); setShowCommandPalette(false); }} color="text-yellow-500" />
                 <CommandItem icon={<Trash2 size={18}/>} label="مسح الذاكرة" onClick={() => { if(confirm('مسح؟')){ clearAllMessages(); setMessages([]); setShowCommandPalette(false); } }} color="text-red-500" />
              </div>
              <div className="p-4 bg-[#0A0A0A] text-[10px] text-gray-700 font-bold uppercase tracking-widest text-center border-t border-white/5">
                 استخدم Cmd+K لفتح هذه القائمة من أي مكان
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

const NavButton = ({ active, onClick, icon, label, color = "text-gray-500" }: any) => (
  <button 
    onClick={onClick} 
    className={`group relative flex items-center justify-center p-3.5 rounded-2xl transition-all ${active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/40' : `${color} hover:bg-white/5`}`}
  >
    {icon}
    <span className="absolute right-full mr-4 px-3 py-1.5 bg-black border border-white/10 text-[10px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl">{label}</span>
  </button>
);

const CommandItem = ({ icon, label, shortcut, onClick, color = "text-gray-400" }: any) => (
  <button 
    onClick={onClick}
    className="w-full flex items-center justify-between p-4 hover:bg-white/5 rounded-2xl transition-all group"
  >
    <div className="flex items-center gap-4">
       <span className={`${color} group-hover:scale-110 transition-transform`}>{icon}</span>
       <span className="font-bold text-gray-300 group-hover:text-white">{label}</span>
    </div>
    {shortcut && <span className="text-[9px] font-black text-gray-700 bg-white/5 px-2 py-1 rounded-md">{shortcut}</span>}
  </button>
);

export default App;
