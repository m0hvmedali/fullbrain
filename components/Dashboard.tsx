
import React, { useMemo, useState, useEffect } from 'react';
import { StandardizedMessage } from '../types';
import { Zap, LayoutGrid, Activity, Cloud, Loader2, BrainCircuit, Sparkles, TrendingUp, BarChart3, Clock, Layers } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, AreaChart, Area } from 'recharts';
import { generateSmartInsight } from '../utils/ai';

interface DashboardProps {
  messages: StandardizedMessage[];
  onImport: () => void;
  onGDrive: () => void;
  isSyncing: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ messages, onImport, onGDrive, isSyncing }) => {
  const [insight, setInsight] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const stats = useMemo(() => {
    const total = messages.length;
    const sources = Array.from(new Set(messages.map(m => m.source)));
    const participants = Array.from(new Set(messages.map(m => m.sender)));
    
    // Last 7 days chart data
    const last7Days = Array.from({length: 7}, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });
    
    const chartData = last7Days.map(date => ({
      name: new Date(date).toLocaleDateString('ar-EG', { weekday: 'short' }),
      count: messages.filter(m => new Date(m.timestamp).toISOString().split('T')[0] === date).length,
    }));

    return { total, sourcesCount: sources.length, participantsCount: participants.length, chartData };
  }, [messages]);

  const fetchInsight = async () => {
    if (messages.length === 0 || isAnalyzing) return;
    setIsAnalyzing(true);
    const result = await generateSmartInsight(messages);
    setInsight(result);
    setIsAnalyzing(false);
  };

  useEffect(() => {
    if (messages.length > 0 && !insight) fetchInsight();
  }, [messages]);

  return (
    <div className="flex-1 flex flex-col items-center p-8 lg:p-12 animate-fade-in overflow-y-auto custom-scrollbar bg-[#060606]">
       <div className="w-full max-w-6xl space-y-10 pb-20">
          
          {/* Hero Section */}
          <div className="p-10 lg:p-16 bg-[#0A0A0A] border border-white/5 rounded-[4rem] text-center shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 opacity-20 group-hover:opacity-100 transition-opacity"></div>
            <div className="w-20 h-20 bg-indigo-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-indigo-500/20 shadow-inner">
              <BrainCircuit size={40} className="text-indigo-500" />
            </div>

            <h2 className="text-4xl lg:text-6xl font-black mb-6 tracking-tight">نظام الذاكرة المتكاملة</h2>
            
            {insight ? (
              <div className="mb-12 p-8 bg-indigo-500/5 border border-indigo-500/10 rounded-[2.5rem] relative animate-fade-in max-w-3xl mx-auto shadow-2xl">
                 <Sparkles className="absolute -top-3 -right-3 text-indigo-500" size={28} />
                 <p className="text-indigo-300 font-bold italic text-xl lg:text-2xl leading-relaxed">"{insight}"</p>
                 <button onClick={fetchInsight} className="mt-6 text-[10px] text-gray-600 font-black uppercase tracking-widest hover:text-indigo-400 transition-colors">تحديث الرؤية الذكية</button>
              </div>
            ) : isAnalyzing ? (
              <div className="mb-12 flex items-center justify-center gap-4">
                 <Loader2 className="animate-spin text-indigo-500" size={24} />
                 <p className="text-gray-600 font-bold animate-pulse text-lg">جاري استرجاع الحكمة من البيانات...</p>
              </div>
            ) : (
              <p className="text-gray-500 text-lg leading-relaxed mb-12 max-w-lg mx-auto">
                مرحباً بك في مركز قيادة بياناتك. هنا حيث تلتقي ذكرياتك الرقمية بالذكاء الاصطناعي لخلق وعي جديد بماضيك.
              </p>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
               <DashboardStat label="إجمالي السجلات" value={stats.total.toLocaleString()} sub="رسالة مؤرشفة" icon={<Layers size={14}/>} />
               <DashboardStat label="جهات الاتصال" value={stats.participantsCount.toString()} sub="شخص متفاعل" icon={<Activity size={14}/>} />
               <DashboardStat label="المصادر" value={stats.sourcesCount.toString()} sub="تطبيقات متصلة" icon={<Cloud size={14}/>} />
               <DashboardStat label="النشاط" value={stats.chartData.reduce((a,b)=>a+b.count, 0).toString()} sub="تفاعل أسبوعي" icon={<TrendingUp size={14}/>} />
            </div>

            <div className="flex flex-col lg:flex-row gap-5 justify-center">
              <button onClick={onImport} className="flex items-center justify-center gap-3 px-12 py-6 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-black transition-all shadow-xl shadow-indigo-600/30 active:scale-95 group/btn">
                <Zap size={22} /> استيراد محلي سريع
              </button>
              <button 
                onClick={onGDrive} 
                disabled={isSyncing}
                className={`flex items-center justify-center gap-3 px-12 py-6 bg-[#141414] border border-white/5 hover:bg-[#1a1a1a] rounded-2xl font-black transition-all ${isSyncing ? 'opacity-50 cursor-not-allowed' : ''} shadow-lg shadow-black/40`}
              >
                {isSyncing ? <Loader2 size={22} className="animate-spin" /> : <Cloud size={22} />}
                سحابة Google Drive
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
             {/* Chart Section */}
             <div className="lg:col-span-2 p-10 bg-[#0D0D0D] border border-white/5 rounded-[3rem] shadow-xl">
                <div className="flex items-center justify-between mb-10">
                   <h3 className="text-xl font-black flex items-center gap-3">
                      <BarChart3 size={20} className="text-indigo-500" />
                      وتيرة النشاط الأخير
                   </h3>
                   <span className="text-[10px] text-gray-600 font-black uppercase tracking-widest bg-white/5 px-4 py-1.5 rounded-full border border-white/5">آخر 7 أيام</span>
                </div>
                <div className="h-64 w-full">
                   <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.chartData}>
                         <XAxis dataKey="name" stroke="#333" fontSize={12} tickLine={false} axisLine={false} />
                         <Tooltip 
                            cursor={{fill: '#1a1a1a'}}
                            contentStyle={{backgroundColor: '#111', border: '1px solid #333', borderRadius: '16px', textAlign: 'right'}}
                            labelStyle={{color: '#6366f1', fontWeight: 'bold'}}
                         />
                         <Bar dataKey="count" radius={[10, 10, 0, 0]}>
                            {stats.chartData.map((entry, index) => (
                               <Cell key={`cell-${index}`} fill={index === 6 ? '#6366f1' : '#1a1a1a'} className="hover:fill-indigo-400 transition-colors" />
                            ))}
                         </Bar>
                      </BarChart>
                   </ResponsiveContainer>
                </div>
             </div>

             {/* Action Card */}
             <div className="p-10 bg-gradient-to-br from-indigo-900/10 to-purple-900/10 border border-indigo-500/20 rounded-[3rem] shadow-xl flex flex-col justify-center text-center space-y-8 group hover:border-indigo-500/40 transition-all">
                <div className="w-20 h-20 bg-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-2xl shadow-indigo-500/20 group-hover:scale-110 transition-transform">
                   <TrendingUp size={40} className="text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-black mb-4">استكشف أنماطك</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">استخدم ميزة "البحث العميق" أو "الإحصائيات" لرؤية علاقات غير مكتشفة في محادثاتك.</p>
                </div>
                <div className="pt-4">
                   <span className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.3em] border border-indigo-400/30 px-6 py-2.5 rounded-full bg-indigo-500/5">الذكاء الاصطناعي متصل</span>
                </div>
             </div>
          </div>
       </div>
    </div>
  );
};

const DashboardStat = ({ label, value, sub, icon }: any) => (
  <div className="p-8 bg-[#080808] border border-white/5 rounded-3xl hover:border-indigo-500/20 transition-all group">
    <div className="flex items-center justify-between mb-4">
       <p className="text-[10px] text-gray-600 uppercase font-black tracking-widest">{label}</p>
       <div className="text-gray-800 group-hover:text-indigo-500 transition-colors">{icon}</div>
    </div>
    <p className="text-4xl font-black text-white mb-1">{value}</p>
    <p className="text-[9px] text-gray-700 font-bold uppercase tracking-tight">{sub}</p>
  </div>
);

export default Dashboard;
