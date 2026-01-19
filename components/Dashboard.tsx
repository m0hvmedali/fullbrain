
import React, { useMemo, useState, useEffect } from 'react';
import { StandardizedMessage } from '../types';
import { Activity, BrainCircuit, Sparkles, TrendingUp, BarChart3, Clock, Layers, UploadCloud } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, Cell } from 'recharts';
import { generateSmartInsight } from '../utils/ai';

interface DashboardProps {
  messages: StandardizedMessage[];
  onImport: () => void;
  onGDrive: () => void;
  isSyncing: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ messages, onImport }) => {
  const [insight, setInsight] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const stats = useMemo(() => {
    const total = messages.length;
    const participants = Array.from(new Set(messages.map(m => m.sender)));
    
    // بيانات تجريبية للرسم البياني تعكس التفاعل
    const chartData = [
      { name: 'السبت', count: 400 }, { name: 'الأحد', count: 300 },
      { name: 'الاثنين', count: 600 }, { name: 'الثلاثاء', count: 800 },
      { name: 'الأربعاء', count: 500 }, { name: 'الخميس', count: 900 },
      { name: 'الجمعة', count: 200 }
    ];

    return { total, participantsCount: participants.length, chartData };
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
    <div className="flex-1 flex flex-col items-center p-4 md:p-8 lg:p-12 animate-fade-in overflow-y-auto custom-scrollbar bg-[#060606]">
       <div className="w-full max-w-5xl space-y-6 md:space-y-8 pb-10">
          
          <div className="p-6 md:p-10 bg-[#0A0A0A] border border-white/5 rounded-[2rem] md:rounded-[3rem] text-center shadow-2xl relative overflow-hidden group">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 md:mb-6 border border-indigo-500/20">
              <BrainCircuit size={24} className="text-indigo-500 md:hidden" />
              <BrainCircuit size={32} className="text-indigo-500 hidden md:block" />
            </div>

            <h2 className="text-2xl md:text-4xl font-black mb-3 md:mb-4 tracking-tight">مستودع الذاكرة الذكي</h2>
            
            {insight ? (
              <div className="mb-6 md:mb-10 p-5 md:p-6 bg-indigo-500/5 border border-indigo-500/10 rounded-[1.5rem] md:rounded-[2rem] relative animate-fade-in max-w-2xl mx-auto">
                 <Sparkles className="absolute -top-2 -right-2 text-indigo-500" size={16} />
                 <p className="text-indigo-300 font-bold italic text-sm md:text-lg leading-relaxed">"{insight}"</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 mb-10">
                <p className="text-gray-500 text-[11px] md:text-sm leading-relaxed max-w-md mx-auto">
                  قم باستيراد سجلاتك لتبدأ عملية التحليل والاستنطاق الذكي.
                </p>
                <button 
                  onClick={onImport}
                  className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-sm flex items-center gap-3 transition-all shadow-xl shadow-indigo-600/20"
                >
                  <UploadCloud size={18} />
                  استيراد بيانات جديدة
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
               <DashboardStat label="إجمالي السجلات" value={stats.total.toLocaleString()} icon={<Layers size={14}/>} />
               <DashboardStat label="جهات الاتصال" value={stats.participantsCount.toString()} icon={<Activity size={14}/>} />
               <DashboardStat label="نمط النشاط" value="مكثف" icon={<TrendingUp size={14}/>} />
               <DashboardStat label="الحالة" value="متصل" icon={<Clock size={14}/>} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             <div className="lg:col-span-2 p-6 md:p-8 bg-[#0D0D0D] border border-white/5 rounded-[1.5rem] md:rounded-[2.5rem] shadow-xl">
                <h3 className="text-xs md:text-sm font-black mb-6 flex items-center gap-2 text-indigo-400">
                  <BarChart3 size={16} /> وتيرة النشاط الأسبوعي
                </h3>
                <div className="h-40 md:h-48 w-full">
                   <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.chartData}>
                         <XAxis dataKey="name" stroke="#333" fontSize={8} tickLine={false} axisLine={false} />
                         <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                            {stats.chartData.map((entry, index) => (
                               <Cell key={`cell-${index}`} fill={index === 5 ? '#6366f1' : '#1a1a1a'} />
                            ))}
                         </Bar>
                      </BarChart>
                   </ResponsiveContainer>
                </div>
             </div>

             <div className="p-6 md:p-8 bg-indigo-600/5 border border-indigo-500/10 rounded-[1.5rem] md:rounded-[2.5rem] shadow-xl flex flex-col justify-center text-center space-y-3">
                <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center mx-auto mb-1">
                   <TrendingUp size={20} className="text-indigo-400" />
                </div>
                <h3 className="text-base md:text-lg font-black">تحليل الأنماط</h3>
                <p className="text-gray-500 text-[10px] md:text-[11px] leading-relaxed">استخدم الرادار الذكي للبحث والتحليل المعمق في البيانات المستوردة.</p>
             </div>
          </div>
       </div>
    </div>
  );
};

const DashboardStat = ({ label, value, icon }: any) => (
  <div className="p-4 md:p-6 bg-[#080808] border border-white/5 rounded-xl md:rounded-2xl text-right">
    <div className="flex items-center justify-between mb-2">
       <p className="text-[8px] md:text-[9px] text-gray-700 uppercase font-black tracking-widest truncate ml-2">{label}</p>
       <div className="text-gray-800 shrink-0">{icon}</div>
    </div>
    <p className="text-lg md:text-2xl font-black text-white">{value}</p>
  </div>
);

export default Dashboard;
