
import React, { useState, useMemo, useEffect } from 'react';
import { StandardizedMessage, ConversationSummary } from './types';
import Sidebar from './components/Sidebar';
import ConversationTimeline from './components/ConversationTimeline';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import MemoryAI from './components/MemoryAI';
import Dashboard from './components/Dashboard';
import ImportModal from './components/ImportModal';
import { getAllUnifiedMessages } from './data/index';
import { getSummaries, clearAllMessages } from './utils/db';
import { processFile } from './utils/parser';
import { 
  Database, MessageSquare, PieChart, BrainCircuit, Home, 
  Menu, X, Info, Loader2, UploadCloud
} from 'lucide-react';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<'dashboard' | 'chats' | 'analytics' | 'memory-ai'>('dashboard');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [summaries, setSummaries] = useState<ConversationSummary[]>([]);
  
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);

  /**
   * الحل المثالي: تحميل الملخصات فقط
   * لا يتم تحميل الرسائل الفعلية إلا عند اختيار محادثة معينة
   */
  const loadSummaries = async () => {
    try {
      // جلب الملخصات المحسوبة مسبقاً من IndexedDB
      const dbSummaries = await getSummaries();
      
      // التعامل مع البيانات الثابتة (Static Data) بنفس المنطق لتوحيد العرض
      const staticMessages = getAllUnifiedMessages();
      const staticMap = new Map<string, ConversationSummary>();
      
      staticMessages.forEach(m => {
        const cId = m.conversation_id || `static_${m.sourceFile}`;
        const existing = staticMap.get(cId);
        if (existing) {
          existing.messageCount++;
          if (m.timestamp > existing.lastMessageTimestamp) existing.lastMessageTimestamp = m.timestamp;
        } else {
          staticMap.set(cId, {
            id: cId,
            title: m.sender || m.person_or_title || "محادثة",
            source: m.source || 'whatsapp',
            lastMessageTimestamp: m.timestamp || Date.now(),
            messageCount: 1,
            participants: [m.sender || "مجهول"]
          });
        }
      });

      const allSummaries = [...dbSummaries, ...Array.from(staticMap.values())];
      setSummaries(allSummaries.sort((a, b) => b.lastMessageTimestamp - a.lastMessageTimestamp));
    } catch (err) {
      console.error("Error loading summaries:", err);
    } finally {
      setIsReady(true);
    }
  };

  useEffect(() => {
    loadSummaries();
  }, []);

  const handleImportFiles = async (files: FileList) => {
    setIsImportModalOpen(false);
    setIsImporting(true);
    for (let i = 0; i < files.length; i++) {
      setImportProgress(0);
      await processFile(files[i], (p) => setImportProgress(p));
    }
    setIsImporting(false);
    loadSummaries();
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen bg-[#060606] text-[#E0E0E0] overflow-hidden" dir="rtl">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between px-5 py-4 bg-[#080808] border-b border-white/5 z-[60]">
        <div className="flex items-center gap-2" onClick={() => setActiveView('dashboard')}>
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-600/20">
            <Database size={16} className="text-white" />
          </div>
          <span className="font-black text-sm tracking-tighter">ذاكرة النظام</span>
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
          <div className="absolute top-0 right-0 w-80 h-full bg-[#0B0B0B] border-l border-white/10 shadow-2xl flex flex-col p-6">
            <div className="flex justify-between items-center mb-8">
              <span className="font-black text-indigo-400 text-lg uppercase tracking-widest">سجلات الذاكرة</span>
              <button onClick={() => setIsMobileMenuOpen(false)} className="text-gray-500 hover:text-white transition-colors"><X size={24}/></button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <Sidebar 
                summaries={summaries} 
                activeId={selectedConversationId} 
                onSelect={(id) => { setSelectedConversationId(id); setActiveView('chats'); setIsMobileMenuOpen(false); }} 
                isMobile 
              />
            </div>
          </div>
        </div>
      )}

      <div className="hidden md:block h-full">
        <Sidebar summaries={summaries} activeId={selectedConversationId} onSelect={(id) => { setSelectedConversationId(id); setActiveView('chats'); }} />
      </div>

      <main className="flex-1 flex flex-col relative overflow-hidden h-full">
        {!isReady ? (
          <div className="flex-1 flex items-center justify-center bg-[#060606]"><Loader2 className="animate-spin text-indigo-500" size={40} /></div>
        ) : (
          <div className="flex-1 overflow-hidden h-full flex flex-col">
            <div className="flex-1 overflow-hidden">
              {activeView === 'dashboard' && <Dashboard messages={[]} onImport={() => setIsImportModalOpen(true)} onGDrive={() => {}} isSyncing={false} />}
              {activeView === 'chats' && <ConversationTimeline conversationId={selectedConversationId} conversation={summaries.find(s => s.id === selectedConversationId)} />}
              {activeView === 'analytics' && <AnalyticsDashboard messages={[]} />}
              {activeView === 'memory-ai' && <MemoryAI onSelectChat={(id) => { setSelectedConversationId(id); setActiveView('chats'); }} />}
            </div>

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
        <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-[#0D0D0D] border border-white/10 p-10 rounded-[3rem] text-center shadow-[0_0_100px_rgba(79,70,229,0.1)]">
            <div className="relative w-24 h-24 mx-auto mb-8">
               <div className="absolute inset-0 bg-indigo-500/20 rounded-full animate-ping"></div>
               <div className="relative bg-indigo-600 rounded-full w-full h-full flex items-center justify-center shadow-2xl shadow-indigo-600/40">
                  <UploadCloud className="text-white" size={40} />
               </div>
            </div>
            <h3 className="font-black text-xl text-white mb-2">جاري استيعاب الذاكرة...</h3>
            <p className="text-gray-500 text-xs mb-8 font-medium">نحن نقوم بتحليل وترتيب السجلات في مستودعك المحلي.</p>
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden mb-3">
              <div className="h-full bg-indigo-600 transition-all duration-300 shadow-[0_0_10px_rgba(79,70,229,1)]" style={{ width: `${importProgress}%` }} />
            </div>
            <div className="flex justify-between text-[10px] text-gray-600 font-black uppercase tracking-widest">
               <span>{importProgress}% مكتمل</span>
               <span>برجاء عدم الإغلاق</span>
            </div>
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
