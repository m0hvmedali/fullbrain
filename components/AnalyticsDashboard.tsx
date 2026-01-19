
import React, { useMemo } from 'react';
import { StandardizedMessage } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Activity, Users, Type, Zap, PieChart as PieIcon, TrendingUp, Calendar, ArrowUpRight } from 'lucide-react';

interface AnalyticsProps {
  messages: StandardizedMessage[];
}

const AnalyticsDashboard: React.FC<AnalyticsProps> = ({ messages }) => {
  const stats = useMemo(() => {
    if (!messages.length) return null;

    const dailyMap = new Map<string, number>();
    const senderMap = new Map<string, number>();
    const sourceMap = new Map<string, number>();
    const wordFreq: Record<string, number> = {};

    messages.forEach(m => {
      const date = new Date(m.timestamp).toISOString().split('T')[0];
      dailyMap.set(date, (dailyMap.get(date) || 0) + 1);
      senderMap.set(m.sender, (senderMap.get(m.sender) || 0) + 1);
      sourceMap.set(m.source, (sourceMap.get(m.source) || 0) + 1);

      const words = m.content.toLowerCase().split(/\s+/).filter(w => w.length > 4);
      words.forEach(w => {
          wordFreq[w] = (wordFreq[w] || 0) + 1;
      });
    });

    const timeData = Array.from(dailyMap.entries()).map(([date, count]) => ({ 
      date: new Date(date).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' }), 
      count 
    })).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(-15);

    const senderData = Array.from(senderMap.entries())
      .map(([name, count]) => ({ name, value: count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const sourceData = Array.from(sourceMap.entries()).map(([name, value]) => ({ name, value }));
    const topWords = Object.entries(wordFreq).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([text, count]) => ({ text, count }));

    return {
      timeData,
      senderData,
      sourceData,
      topWords,
      totalWords: messages.reduce((acc, m) => acc + m.meta.word_count, 0),
      avgLength: Math.round(messages.reduce((acc, m) => acc + m.meta.message_length, 0) / messages.length)
    };
  }, [messages]);

  const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#f97316'];

  if (!stats) return (
    <div className="flex-1 flex flex-col items-center justify-center p-20 text-center opacity-50">
      <PieIcon size={64} className="mb-4 text-gray-800" />
      <h2 className="text-xl font-bold">لا توجد بيانات للتحليل</h2>
      <p className="text-sm text-gray-600">قم باستيراد محادثاتك أولاً لتتمكن من رؤية الإحصائيات.</p>
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto p-10 bg-[#060606] space-y-10 custom-scrollbar" dir="rtl">
      <header className="mb-10">
        <h2 className="text-4xl font-black tracking-tighter flex items-center gap-4">
          <Activity className="text-indigo-500" size={32} />
          لوحة التحليلات الذكية
        </h2>
        <p className="text-gray-500 mt-2 font-medium">تحليل إحصائي ولغوي معمق لذاكرتك الرقمية.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard icon={<Activity />} label="إجمالي السجلات" value={messages.length} color="indigo" />
        <MetricCard icon={<Users />} label="جهات الاتصال" value={stats.senderData.length} color="purple" />
        <MetricCard icon={<Type />} label="كلمات تم تحليلها" value={stats.totalWords} color="teal" />
        <MetricCard icon={<TrendingUp />} label="متوسط طول الرسالة" value={stats.avgLength} unit="حرف" color="orange" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Activity Timeline */}
        <div className="p-8 bg-[#0D0D0D] border border-white/5 rounded-[2.5rem] lg:col-span-2 shadow-xl">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-black flex items-center gap-2">
              <Calendar size={18} className="text-indigo-500" />
              وتيرة النشاط (آخر 15 يوم)
            </h3>
            <span className="text-[10px] text-gray-700 font-black uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full">تحديث فوري</span>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.timeData}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
                <XAxis dataKey="date" stroke="#333" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#333" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111', border: '1px solid #222', borderRadius: '16px', fontSize: '12px', textAlign: 'right' }}
                  itemStyle={{ color: '#6366f1' }}
                />
                <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Source Distribution */}
        <div className="p-8 bg-[#0D0D0D] border border-white/5 rounded-[2.5rem] shadow-xl">
          <h3 className="text-lg font-black mb-8 flex items-center gap-2">
            <PieIcon size={18} className="text-purple-500" />
            توزيع المصادر
          </h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.sourceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {stats.sourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #222', borderRadius: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
             {stats.sourceData.map((d, i) => (
               <div key={d.name} className="flex items-center justify-between text-xs p-2 bg-white/5 rounded-xl">
                 <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                    <span className="text-gray-400 font-bold uppercase">{d.name}</span>
                 </div>
                 <span className="font-black text-gray-200">{d.value}</span>
               </div>
             ))}
          </div>
        </div>

        {/* Top Senders */}
        <div className="p-8 bg-[#0D0D0D] border border-white/5 rounded-[2.5rem] shadow-xl">
           <h3 className="text-lg font-black mb-6 flex items-center gap-2">
              <Users size={18} className="text-teal-500" />
              أكثر المتحدثين تفاعلاً
           </h3>
           <div className="space-y-4">
              {stats.senderData.map((sender, i) => (
                <div key={sender.name} className="flex flex-col gap-2">
                   <div className="flex justify-between items-center text-xs font-bold">
                      <span className="text-gray-300">{sender.name}</span>
                      <span className="text-gray-600">{sender.value} رسالة</span>
                   </div>
                   <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-500 rounded-full transition-all duration-1000"
                        style={{ width: `${(sender.value / stats.senderData[0].value) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }}
                      ></div>
                   </div>
                </div>
              ))}
           </div>
        </div>

        {/* Word Frequency Tags */}
        <div className="p-8 bg-[#0D0D0D] border border-white/5 rounded-[2.5rem] lg:col-span-2 shadow-xl">
           <h3 className="text-lg font-black mb-8 flex items-center gap-2">
              <Type size={18} className="text-orange-500" />
              الكلمات والمفاهيم الأكثر تكراراً
           </h3>
           <div className="flex flex-wrap gap-3">
              {stats.topWords.map((word, i) => (
                  <div key={word.text} className="px-5 py-3 bg-[#111] border border-white/5 rounded-2xl flex items-center gap-3 hover:border-indigo-500/30 transition-all group">
                      <span className="text-indigo-500 font-black text-xs">#{i + 1}</span>
                      <span className="text-base font-bold text-gray-200 group-hover:text-white transition-colors">{word.text}</span>
                      <span className="text-[10px] text-gray-700 bg-black px-2 py-0.5 rounded-lg font-black">{word.count}</span>
                  </div>
              ))}
           </div>
        </div>
      </div>

      <div className="p-10 bg-indigo-600/5 border border-indigo-500/10 rounded-[3rem] flex flex-col items-center text-center space-y-4">
         <ArrowUpRight className="text-indigo-500" size={32} />
         <h4 className="text-xl font-black">رؤية تحليلية كاملة</h4>
         <p className="text-gray-500 max-w-lg text-sm leading-relaxed">تعتمد هذه البيانات على التحليل الهيكلي للملفات المرفوعة. يمكنك استخدام "القوالب الذكية" لإجراء تحليل لغوي أكثر تعقيداً لمحتوى هذه الرسائل.</p>
      </div>
    </div>
  );
};

const MetricCard = ({ icon, label, value, unit = "", color }: any) => {
  const colorMap: any = {
    indigo: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
    purple: "text-purple-500 bg-purple-500/10 border-purple-500/20",
    teal: "text-teal-500 bg-teal-500/10 border-teal-500/20",
    orange: "text-orange-500 bg-orange-500/10 border-orange-500/20",
  };

  return (
    <div className="p-6 bg-[#0D0D0D] border border-white/5 rounded-3xl flex items-center gap-5 shadow-lg group hover:border-white/10 transition-all">
      <div className={`p-4 rounded-2xl transition-transform group-hover:scale-110 ${colorMap[color]}`}>{icon}</div>
      <div>
        <p className="text-[10px] text-gray-600 uppercase font-black tracking-widest mb-1">{label}</p>
        <p className="text-2xl font-black text-white">
          {typeof value === 'number' ? value.toLocaleString() : value} 
          {unit && <span className="text-xs text-gray-600 mr-1">{unit}</span>}
        </p>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
