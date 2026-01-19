
import React, { useState, useMemo, useEffect } from 'react';
import { StandardizedMessage, ConversationSummary, SearchFilters } from './types';
import { processFile, processRawData } from './utils/parser';
import { getAllMessages, saveMessages, clearAllMessages } from './utils/db';
import { initGoogleDrive, openPicker, fetchFolderFiles } from './utils/googleDrive';
import Sidebar from './components/Sidebar';
import ConversationTimeline from './components/ConversationTimeline';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import ImportModal from './components/ImportModal';
import SearchBar from './components/SearchBar';
import { 
  Database, MessageSquare, PieChart, Search as SearchIcon, 
  Trash2, Cloud, LayoutGrid, Zap, Activity, Info, Loader2, CheckCircle, AlertCircle
} from 'lucide-react';

const App: React.FC = () => {
  const [messages, setMessages] = useState<StandardizedMessage[]>([]);
  const [activeView, setActiveView] = useState<'chats' | 'analytics' | 'search'>('chats');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
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
    initGoogleDrive(); // تهيئة GDrive عند التحميل
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
      // معالجة الملفات بالتوازي لتحسين الأداء
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
    // استخدام functional update لضمان عدم حدوث تعارض في الحالة
    setMessages(prev => {
      const combined = [...prev, ...newMsgs];
      // إزالة التكرار بناءً على الـ ID
      return Array.from(new Map(combined.map(m => [m.id, m])).values());
    });
    // حفظ في قاعدة البيانات المحلية
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

  if (!isReady) {
    return (
      <div className="h-screen w-screen bg-[#060606] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-indigo-500 font-bold animate-pulse">جاري تحضير الذاكرة الرقمية...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#060606] text-[#E0E0E0] overflow-hidden" dir="rtl">
      {/* Side Rail */}
      <div className="w-20 flex flex-col items-center py-10 border-l border-white/5 bg-[#080808] z-50">
        <div className="mb-14">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
            <Database size={24} className="text-white" />
          </div>
        </div>
        
        <nav className="flex flex-col gap-10 flex-1">
          <NavButton active={activeView === 'chats'} onClick={() => setActiveView('chats')} icon={<MessageSquare size={22} />} label="المحادثات" />
          <NavButton active={activeView === 'search'} onClick={() => setActiveView('search')} icon={<SearchIcon size={22} />} label="البحث" />
          <NavButton active={activeView === 'analytics'} onClick={() => setActiveView('analytics')} icon={<PieChart size={22} />} label="الإحصائيات" />
        </nav>

        <div className="flex flex-col gap-6 mt-auto">
          <NavButton active={false} onClick={() => setIsImporting(true)} icon={<Zap size={22} />} label="استيراد" color="text-yellow-500" />
          <NavButton active={false} onClick={() => { if(confirm('مسح كل البيانات المحفوظة؟')) { clearAllMessages(); setMessages([]); } }} icon={<Trash2 size={22} />} label="مسح" color="text-red-500" />
        </div>
      </div>

      <Sidebar summaries={conversationSummaries} activeId={selectedConversationId} onSelect={setSelectedConversationId} />

      <main className="flex-1 flex flex-col relative overflow-hidden bg-[#060606]">
        {/* Sync Feedback Overlay */}
        {syncStatus.message && (
          <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl flex items-center gap-3 animate-fade-in shadow-2xl border ${syncStatus.type === 'error' ? 'bg-red-900/20 border-red-500/30 text-red-400' : 'bg-indigo-900/20 border-indigo-500/30 text-indigo-400'}`}>
            {isSyncing ? <Loader2 size={18} className="animate-spin" /> : syncStatus.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
            <span className="text-xs font-bold">{syncStatus.message}</span>
          </div>
        )}

        {activeView === 'chats' && selectedConversationId ? (
          <ConversationTimeline 
            messages={filteredMessages} 
            conversation={conversationSummaries.find(s => s.id === selectedConversationId)} 
            allMessages={messages}
          />
        ) : activeView === 'chats' ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 animate-fade-in">
             <div className="mb-8 p-12 bg-[#0A0A0A] border border-white/5 rounded-[3.5rem] text-center max-w-xl shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 opacity-20 group-hover:opacity-100 transition-opacity"></div>
                <div className="w-24 h-24 bg-indigo-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-indigo-500/20 shadow-inner">
                  <LayoutGrid size={40} className="text-indigo-500" />
                </div>
                <h2 className="text-4xl font-black mb-6 tracking-tight">نظام الذاكرة الذكي</h2>
                <p className="text-gray-500 text-sm leading-relaxed mb-10 max-w-sm mx-auto">
                  قم برفع ملفات WhatsApp أو Instagram أو ChatGPT. أو قم بالربط مع Google Drive للمزامنة التلقائية.
                </p>
                
                <div className="mb-12">
                  <p className="text-[10px] text-gray-600 uppercase font-black mb-4 tracking-widest flex items-center justify-center gap-2">
                    <Activity size={12}/> نشاط الذاكرة الأخير
                  </p>
                  <div className="flex gap-1.5 justify-center">
                    {activityHeatmap.map((day, i) => (
                      <div 
                        key={i} 
                        className="w-3.5 h-3.5 rounded-[3px] transition-all hover:scale-150 cursor-help" 
                        style={{ backgroundColor: day.intensity > 0 ? `rgba(99, 102, 241, ${0.2 + day.intensity * 0.8})` : '#141414' }}
                        title={day.date}
                      />
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <button onClick={() => setIsImporting(true)} className="flex items-center justify-center gap-3 px-8 py-5 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-bold transition-all shadow-xl shadow-indigo-600/20 active:scale-95">
                    <Zap size={20} /> استيراد يدوي
                  </button>
                  <button 
                    onClick={handleGDriveSync} 
                    disabled={isSyncing}
                    className={`flex items-center justify-center gap-3 px-8 py-5 bg-[#141414] border border-white/5 hover:bg-[#1a1a1a] rounded-2xl font-bold transition-all ${isSyncing ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isSyncing ? <Loader2 size={20} className="animate-spin" /> : <Cloud size={20} />}
                    Google Drive
                  </button>
                </div>

                <div className="mt-8 flex flex-col items-center gap-4 p-6 bg-white/5 rounded-3xl text-right">
                   <div className="flex items-center gap-2 text-[11px] text-indigo-400 font-bold self-start">
                     <Info size={14}/> تعليمات الربط مع Google Drive:
                   </div>
                   <ul className="text-[10px] text-gray-400 space-y-2 list-disc list-inside">
                      <li>تأكد من وضع ملفاتك (JSON, TXT, HTML) داخل مجلد مخصص.</li>
                      <li>اضغط على زر Google Drive وامنح الإذن للوصول "للقراءة فقط".</li>
                      <li>اختر المجلد المطلوب وسيقوم النظام بفهرسة المحتويات تلقائياً.</li>
                      <li>البيانات ستبقى في متصفحك (IndexedDB) ولن تُرسل لأي خادم.</li>
                   </ul>
                </div>
             </div>
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
      </main>

      {isImporting && <ImportModal onClose={() => setIsImporting(false)} onImport={handleFiles} />}
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

export default App;
