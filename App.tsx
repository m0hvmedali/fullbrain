
import React, { useState, useMemo, useEffect } from 'react';
import { StandardizedMessage, ConversationSummary, SearchFilters } from './types';
import { processFile, processRawData } from './utils/parser';
import { getAllMessages, saveMessages, clearAllMessages } from './utils/db';
import Sidebar from './components/Sidebar';
import ConversationTimeline from './components/ConversationTimeline';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import ImportModal from './components/ImportModal';
import SearchBar from './components/SearchBar';
import { 
  Database, MessageSquare, PieChart, Search as SearchIcon, 
  FileText, Trash2, Cloud, Globe, RefreshCcw, LayoutGrid, 
  Zap, Settings, Calendar, ArrowRight, Activity
} from 'lucide-react';

const App: React.FC = () => {
  const [messages, setMessages] = useState<StandardizedMessage[]>([]);
  const [activeView, setActiveView] = useState<'chats' | 'analytics' | 'search' | 'sync'>('chats');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    keyword: '', sender: '', source: 'all', dateFrom: '', dateTo: '', minLength: 0
  });

  useEffect(() => {
    const loadMemory = async () => {
      try {
        const saved = await getAllMessages();
        setMessages(saved || []);
      } catch (err) {
        console.error("Failed to load IndexedDB data:", err);
      } finally {
        setIsLoaded(true);
      }
    };
    loadMemory();
  }, []);

  const handleFiles = async (files: FileList) => {
    let newMessages: StandardizedMessage[] = [];
    for (let i = 0; i < files.length; i++) {
      const parsed = await processFile(files[i]);
      newMessages = [...newMessages, ...parsed];
    }
    const updated = Array.from(new Map([...messages, ...newMessages].map(m => [m.id, m])).values());
    setMessages(updated);
    await saveMessages(newMessages);
    setIsImporting(false);
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

  const activityHeatmap = useMemo(() => {
    const last30Days = Array.from({length: 30}, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    const counts: Record<string, number> = {};
    messages.forEach(m => {
      const d = new Date(m.timestamp).toISOString().split('T')[0];
      if (last30Days.includes(d)) {
        counts[d] = (counts[d] || 0) + 1;
      }
    });

    const max = Math.max(...Object.values(counts), 1);
    return last30Days.map(date => ({
      date,
      intensity: (counts[date] || 0) / max
    }));
  }, [messages]);

  if (!isLoaded) {
    return <div className="h-screen w-screen bg-[#060606] flex items-center justify-center text-indigo-500 font-bold">جاري تحميل الذاكرة...</div>;
  }

  return (
    <div className="flex h-screen bg-[#060606] text-[#E0E0E0] overflow-hidden selection:bg-indigo-500/30" dir="rtl">
      {/* Navigation Rail */}
      <div className="w-18 flex flex-col items-center py-8 border-l border-white/5 bg-[#080808] z-50">
        <div className="mb-12">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
            <Database size={24} className="text-white" />
          </div>
        </div>
        
        <nav className="flex flex-col gap-8 flex-1">
          <NavButton active={activeView === 'chats'} onClick={() => setActiveView('chats')} icon={<MessageSquare size={22} />} label="المحادثات" />
          <NavButton active={activeView === 'search'} onClick={() => setActiveView('search')} icon={<SearchIcon size={22} />} label="البحث" />
          <NavButton active={activeView === 'analytics'} onClick={() => setActiveView('analytics')} icon={<PieChart size={22} />} label="الإحصائيات" />
        </nav>

        <div className="flex flex-col gap-6 mt-auto">
          <NavButton active={false} onClick={() => setIsImporting(true)} icon={<Zap size={22} />} label="استيراد" color="text-yellow-500" />
          <NavButton active={false} onClick={() => { if(confirm('هل أنت متأكد من مسح الذاكرة؟')) { clearAllMessages(); setMessages([]); } }} icon={<Trash2 size={22} />} label="مسح" color="text-red-500" />
        </div>
      </div>

      <Sidebar summaries={conversationSummaries} activeId={selectedConversationId} onSelect={setSelectedConversationId} />

      <main className="flex-1 flex flex-col relative overflow-hidden bg-[#060606]">
        {activeView === 'chats' && selectedConversationId ? (
          <ConversationTimeline 
            messages={filteredMessages} 
            conversation={conversationSummaries.find(s => s.id === selectedConversationId)} 
            allMessages={messages}
          />
        ) : activeView === 'chats' ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 animate-fade-in">
             <div className="mb-8 p-10 bg-[#0A0A0A] border border-white/5 rounded-[3rem] text-center max-w-lg shadow-2xl">
                <div className="w-20 h-20 bg-indigo-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-indigo-500/20">
                  <LayoutGrid size={32} className="text-indigo-500" />
                </div>
                <h2 className="text-3xl font-black mb-4">نظام استخبارات الذاكرة</h2>
                <p className="text-gray-500 text-sm leading-relaxed mb-8">
                  قم برفع ملفات WhatsApp أو Instagram أو ChatGPT لتبدأ فهرسة ذاكرتك الرقمية. جميع البيانات تُعالج محلياً 100%.
                </p>
                
                <div className="mb-10">
                  <p className="text-[10px] text-gray-500 uppercase font-black mb-3 tracking-widest flex items-center justify-center gap-2">
                    <Activity size={12}/> خريطة النشاط (آخر 30 يوم)
                  </p>
                  <div className="flex gap-1.5 justify-center">
                    {activityHeatmap.map((day, i) => (
                      <div 
                        key={i} 
                        className="w-3 h-3 rounded-sm transition-all hover:scale-125" 
                        style={{ backgroundColor: day.intensity > 0 ? `rgba(99, 102, 241, ${0.2 + day.intensity * 0.8})` : '#1a1a1a' }}
                        title={day.date}
                      />
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => setIsImporting(true)} className="flex items-center justify-center gap-3 px-6 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-bold transition-all shadow-xl shadow-indigo-600/20">
                    <Zap size={18} /> استيراد يدوي
                  </button>
                  <button onClick={() => setActiveView('search')} className="flex items-center justify-center gap-3 px-6 py-4 bg-[#141414] border border-white/5 hover:bg-[#1a1a1a] rounded-2xl font-bold transition-all">
                    <SearchIcon size={18} /> بحث عميق
                  </button>
                </div>
             </div>
          </div>
        ) : null}

        {activeView === 'search' && (
          <div className="flex-1 flex flex-col p-12 overflow-hidden animate-fade-in">
            <header className="mb-8">
               <h2 className="text-4xl font-black tracking-tighter">محرك البحث</h2>
               <p className="text-gray-500 mt-2">ابحث في آلاف الرسائل بلمح البصر.</p>
            </header>
            <SearchBar filters={searchFilters} setFilters={setSearchFilters} />
            <div className="flex-1 overflow-y-auto mt-10 custom-scrollbar space-y-4">
               {filteredMessages.map(m => (
                 <div 
                   key={m.id} 
                   onClick={() => { setSelectedConversationId(m.conversation_id); setActiveView('chats'); }}
                   className="p-6 bg-[#0A0A0A] border border-white/5 rounded-3xl hover:border-indigo-500/40 cursor-pointer group transition-all"
                 >
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                        <span className="text-xs font-black text-indigo-400 uppercase tracking-widest">{m.sender}</span>
                      </div>
                      <span className="text-[10px] text-gray-600 font-mono">{new Date(m.timestamp).toLocaleString('ar-EG')}</span>
                    </div>
                    <p className="text-gray-300 leading-relaxed text-sm">{m.content}</p>
                 </div>
               ))}
            </div>
          </div>
        )}

        {activeView === 'analytics' && <AnalyticsDashboard messages={messages} />}
      </main>

      {isImporting && <ImportModal onClose={() => setIsImporting(false)} onImport={handleFiles} />}
    </div>
  );
};

const NavButton = ({ active, onClick, icon, label, color = "text-gray-500" }: any) => (
  <button 
    onClick={onClick} 
    className={`group relative flex items-center justify-center p-3 rounded-2xl transition-all ${active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/40' : `${color} hover:bg-white/5`}`}
    title={label}
  >
    {icon}
    {!active && <span className="absolute right-full mr-4 px-3 py-1 bg-black border border-white/10 text-[10px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">{label}</span>}
  </button>
);

export default App;
