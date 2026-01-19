
import React, { useState, useMemo, useEffect } from 'react';
import { StandardizedMessage, ConversationSummary, SearchFilters } from './types';
import { processFile, processRawData } from './utils/parser';
import { getAllMessages, saveMessages, clearAllMessages } from './utils/db';
import Sidebar from './components/Sidebar';
import ConversationTimeline from './components/ConversationTimeline';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import ImportModal from './components/ImportModal';
import SearchBar from './components/SearchBar';
import { Database, MessageSquare, PieChart, Search as SearchIcon, FileText, Trash2, Cloud, Globe, RefreshCcw, LayoutGrid, Zap, History } from 'lucide-react';

const App: React.FC = () => {
  const [messages, setMessages] = useState<StandardizedMessage[]>([]);
  const [activeView, setActiveView] = useState<'chats' | 'analytics' | 'search' | 'sync'>('chats');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    keyword: '', sender: '', source: 'all', dateFrom: '', dateTo: '', minLength: 0
  });

  // التحميل الأولي من الذاكرة المحلية
  useEffect(() => {
    const loadMemory = async () => {
      const saved = await getAllMessages();
      setMessages(saved);
    };
    loadMemory();
  }, []);

  // وظيفة محاكاة سحب الملفات من Google Drive
  // في بيئة حقيقية، يتم استخدام gapi.client.drive.files.list
  const syncWithGoogleDrive = async () => {
    setIsSyncing(true);
    try {
      // محاكاة تأخير الشبكة
      await new Promise(r => setTimeout(r, 2000));
      alert("يرجى ربط API Key الخاص بـ Google Drive في الإعدادات للسحب المباشر من المجلد.");
    } finally {
      setIsSyncing(false);
    }
  };

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
    let results = messages;
    if (activeView === 'chats' && selectedConversationId) {
      return results.filter(m => m.conversation_id === selectedConversationId).sort((a, b) => a.timestamp - b.timestamp);
    }
    if (activeView === 'search') {
      results = results.filter(m => {
        const matchesKeyword = m.content.toLowerCase().includes(searchFilters.keyword.toLowerCase());
        const matchesSender = m.sender.toLowerCase().includes(searchFilters.sender.toLowerCase());
        const matchesSource = searchFilters.source === 'all' || m.source === searchFilters.source;
        const matchesLength = m.content.length >= searchFilters.minLength;
        return matchesKeyword && matchesSender && matchesSource && matchesLength;
      });
      return results.sort((a, b) => b.timestamp - a.timestamp);
    }
    return [];
  }, [messages, selectedConversationId, activeView, searchFilters]);

  return (
    <div className="flex h-screen bg-[#060606] text-[#E0E0E0] overflow-hidden" dir="rtl">
      {/* Navigation Rail */}
      <div className="w-16 flex flex-col items-center py-8 border-l border-[#111] bg-[#090909] gap-10">
        <div className="p-2.5 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-600/10 cursor-pointer hover:scale-105 transition-transform">
          <Database size={22} />
        </div>
        <nav className="flex flex-col gap-8">
          <button onClick={() => setActiveView('chats')} className={`p-2 transition-all ${activeView === 'chats' ? 'text-indigo-500 scale-110' : 'text-gray-600 hover:text-gray-400'}`}>
            <MessageSquare size={22} />
          </button>
          <button onClick={() => setActiveView('search')} className={`p-2 transition-all ${activeView === 'search' ? 'text-indigo-500 scale-110' : 'text-gray-600 hover:text-gray-400'}`}>
            <SearchIcon size={22} />
          </button>
          <button onClick={() => setActiveView('analytics')} className={`p-2 transition-all ${activeView === 'analytics' ? 'text-indigo-500 scale-110' : 'text-gray-600 hover:text-gray-400'}`}>
            <PieChart size={22} />
          </button>
        </nav>
        <div className="mt-auto flex flex-col gap-8">
          <button onClick={syncWithGoogleDrive} className={`p-2 transition-all ${isSyncing ? 'text-indigo-400 animate-spin' : 'text-gray-600 hover:text-indigo-400'}`} title="مزامنة Google Drive">
            <RefreshCcw size={22} />
          </button>
          <button onClick={() => setIsImporting(true)} className="p-2 text-indigo-500 hover:scale-110 transition-transform"><FileText size={22} /></button>
          <button onClick={() => { if(confirm('مسح كل الذاكرة؟')) { clearAllMessages(); setMessages([]); } }} className="p-2 text-red-900/50 hover:text-red-500 transition-colors"><Trash2 size={22} /></button>
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
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
             <div className="w-24 h-24 bg-indigo-500/5 rounded-[2rem] border border-indigo-500/10 flex items-center justify-center mb-8">
                <LayoutGrid size={40} className="text-indigo-500/30" />
             </div>
             <h2 className="text-3xl font-black mb-4 tracking-tight">نظام استخبارات الذاكرة</h2>
             <p className="text-gray-500 max-w-md leading-relaxed">يرجى اختيار محادثة من القائمة أو رفع ملفات جديدة (WhatsApp, Instagram, ChatGPT) للبدء في تحليل الفهرس.</p>
             <div className="mt-10 flex gap-4">
               <button onClick={() => setIsImporting(true)} className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-bold transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2">
                 <Zap size={18} /> استيراد فوري
               </button>
               <button onClick={syncWithGoogleDrive} className="px-8 py-3.5 bg-[#111] border border-[#222] hover:bg-[#181818] rounded-2xl font-bold transition-all flex items-center gap-2">
                 <Cloud size={18} /> Google Drive
               </button>
             </div>
          </div>
        ) : null}

        {activeView === 'search' && (
          <div className="flex-1 flex flex-col p-10 overflow-hidden">
            <header className="mb-10">
               <h2 className="text-2xl font-black mb-2 flex items-center gap-3"><SearchIcon size={24} className="text-indigo-500" /> البحث الذكي</h2>
               <p className="text-gray-500 text-sm">ابحث في الفهرس الموحد عبر الكلمات أو الأشخاص أو طول الرسالة.</p>
            </header>
            <SearchBar filters={searchFilters} setFilters={setSearchFilters} />
            <div className="flex-1 overflow-y-auto mt-10 custom-scrollbar space-y-4">
               {filteredMessages.map(m => (
                 <div 
                   key={m.id} 
                   onClick={() => { setSelectedConversationId(m.conversation_id); setActiveView('chats'); }}
                   className="p-5 bg-[#0D0D0D] border border-[#111] rounded-2xl hover:border-indigo-500/30 cursor-pointer group transition-all"
                 >
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[10px] font-bold text-indigo-400 opacity-60 uppercase tracking-widest">{m.sender}</span>
                      <span className="text-[10px] text-gray-600 font-mono">{new Date(m.timestamp).toLocaleString('ar-EG')}</span>
                    </div>
                    <p className="text-gray-300 leading-relaxed line-clamp-2 text-sm">{m.content}</p>
                 </div>
               ))}
               {filteredMessages.length === 0 && <div className="text-center py-20 text-gray-600">لا توجد نتائج مطابقة لبحثك.</div>}
            </div>
          </div>
        )}

        {activeView === 'analytics' && <AnalyticsDashboard messages={messages} />}
      </main>

      {isImporting && <ImportModal onClose={() => setIsImporting(false)} onImport={handleFiles} />}
    </div>
  );
};

export default App;
