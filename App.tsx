
import React, { useState, useMemo, useEffect } from 'react';
import { StandardizedMessage, ConversationSummary, SearchFilters } from './types';
import { processFile, processLargeText } from './utils/parser';
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
  Trash2, Zap, Cloud, BrainCircuit, Home, Loader2, AlertCircle
} from 'lucide-react';

const App: React.FC = () => {
  const [messages, setMessages] = useState<StandardizedMessage[]>([]);
  const [activeView, setActiveView] = useState<'dashboard' | 'chats' | 'analytics' | 'search' | 'prompts' | 'memory-ai'>('dashboard');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStatus, setSyncStatus] = useState({ type: 'idle', message: '' });

  useEffect(() => {
    loadMemory();
    initGoogleDrive(); 
  }, []);

  const loadMemory = async () => {
    try {
      const saved = await getAllMessages();
      // تحسين الأداء: تحميل آخر 5,000 رسالة فقط للعرض السريع في البداية
      setMessages(saved.slice(-5000));
    } catch (err) { console.error(err); }
    finally { setIsReady(true); }
  };

  const handleFiles = async (files: FileList) => {
    setIsImporting(false);
    setSyncStatus({ type: 'idle', message: 'جاري استيراد الذاكرة...' });
    
    try {
      for (const file of Array.from(files)) {
        await processFile(file, (p) => setSyncProgress(p));
      }
      await loadMemory();
      setSyncStatus({ type: 'success', message: 'تم الحفظ في الذاكرة بنجاح.' });
    } catch (error) {
      setSyncStatus({ type: 'error', message: 'حدث خطأ أثناء المعالجة.' });
    } finally {
      setSyncProgress(0);
      setTimeout(() => setSyncStatus({ type: 'idle', message: '' }), 4000);
    }
  };

  const handleGDriveSync = async () => {
    setSyncStatus({ type: 'idle', message: 'جاري الاتصال بـ Google Drive...' });
    try {
      const selection = await openPicker();
      if (!selection) return setSyncStatus({ type: 'idle', message: '' });

      setSyncStatus({ type: 'idle', message: `جاري سحب ${selection.name}...` });
      
      if (selection.isFolder) {
        const driveFiles = await fetchFolderFiles(selection.id);
        for (let i = 0; i < driveFiles.length; i++) {
          const content = await fetchFileContent(driveFiles[i].id, driveFiles[i].mimeType);
          await processLargeText(content, driveFiles[i].name, (p) => {
             setSyncProgress(Math.round(((i + (p/100)) / driveFiles.length) * 100));
          });
        }
      } else {
        const content = await fetchFileContent(selection.id, selection.mimeType);
        await processLargeText(content, selection.name, (p) => setSyncProgress(p));
      }

      await loadMemory();
      setSyncStatus({ type: 'success', message: 'اكتملت المزامنة السحابية.' });
    } catch (error: any) {
      console.error(error);
      setSyncStatus({ type: 'error', message: error.message || 'فشلت المزامنة.' });
    } finally {
      setSyncProgress(0);
      setTimeout(() => setSyncStatus({ type: 'idle', message: '' }), 6000);
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

  return (
    <div className="flex h-screen w-screen bg-[#060606] text-[#E0E0E0] overflow-hidden" dir="rtl">
      <div className="w-14 flex flex-col items-center py-6 border-l border-white/5 bg-[#080808] z-50 shrink-0">
        <div className="mb-8">
          <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center cursor-pointer shadow-lg" onClick={() => setActiveView('dashboard')}>
            <Database size={18} className="text-white" />
          </div>
        </div>
        <nav className="flex flex-col gap-5 flex-1">
          <NavButton active={activeView === 'dashboard'} onClick={() => setActiveView('dashboard')} icon={<Home size={18} />} label="الرئيسية" />
          <NavButton active={activeView === 'chats'} onClick={() => setActiveView('chats')} icon={<MessageSquare size={18} />} label="المحادثات" />
          <NavButton active={activeView === 'memory-ai'} onClick={() => setActiveView('memory-ai')} icon={<BrainCircuit size={18} />} label="الذاكرة الذكية" />
          <NavButton active={activeView === 'analytics'} onClick={() => setActiveView('analytics')} icon={<PieChart size={18} />} label="الإحصائيات" />
        </nav>
        <div className="flex flex-col gap-4 mt-auto">
          <NavButton active={false} onClick={() => setIsImporting(true)} icon={<Zap size={18} />} label="استيراد" color="text-yellow-500" />
          <NavButton active={false} onClick={() => { if(confirm('هل تريد مسح قاعدة البيانات المحلية؟')) { clearAllMessages(); setMessages([]); } }} icon={<Trash2 size={18} />} label="مسح" color="text-red-500" />
        </div>
      </div>

      <Sidebar summaries={conversationSummaries} activeId={selectedConversationId} onSelect={(id) => { setSelectedConversationId(id); setActiveView('chats'); }} />

      <main className="flex-1 flex flex-col relative overflow-hidden h-full">
        {syncStatus.message && (
          <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-5 py-3 rounded-2xl flex flex-col gap-2 animate-fade-in shadow-2xl border bg-[#0A0A0A] border-white/10 ${syncStatus.type === 'error' ? 'text-red-400' : 'text-indigo-400'}`}>
            <div className="flex items-center gap-3">
              {syncProgress > 0 ? <Loader2 size={14} className="animate-spin" /> : syncStatus.type === 'error' ? <AlertCircle size={14} /> : null}
              <span className="text-[11px] font-black">{syncStatus.message} {syncProgress > 0 ? `${syncProgress}%` : ''}</span>
            </div>
            {syncProgress > 0 && (
              <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${syncProgress}%` }}></div>
              </div>
            )}
          </div>
        )}

        <div className="flex-1 overflow-hidden h-full">
            {activeView === 'dashboard' && <Dashboard messages={messages} onImport={() => setIsImporting(true)} onGDrive={handleGDriveSync} isSyncing={syncProgress > 0} />}
            {activeView === 'chats' && <ConversationTimeline messages={messages.filter(m => m.conversation_id === selectedConversationId)} conversation={conversationSummaries.find(s => s.id === selectedConversationId)} allMessages={messages} />}
            {activeView === 'analytics' && <AnalyticsDashboard messages={messages} />}
            {activeView === 'memory-ai' && <MemoryAI messages={messages} onSelectChat={(id) => { setSelectedConversationId(id); setActiveView('chats'); }} />}
            {activeView === 'prompts' && <PromptManager />}
            {activeView === 'search' && <div className="p-10 text-center text-gray-600">خدمة البحث قيد التحديث...</div>}
        </div>
      </main>

      {isImporting && <ImportModal onClose={() => setIsImporting(false)} onImport={handleFiles} />}
    </div>
  );
};

const NavButton = ({ active, onClick, icon, label, color = "text-gray-500" }: any) => (
  <button onClick={onClick} className={`group relative flex items-center justify-center p-2.5 rounded-lg transition-all ${active ? 'bg-indigo-600 text-white shadow-lg' : `${color} hover:bg-white/5`}`}>
    {icon}
    <span className="absolute right-full mr-2 px-2 py-1 bg-black border border-white/10 text-[9px] font-bold rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">{label}</span>
  </button>
);

export default App;
