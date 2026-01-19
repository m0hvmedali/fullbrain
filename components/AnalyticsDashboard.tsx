
import React, { useMemo } from 'react';
import { StandardizedMessage } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';
import { Activity, Users, Type, Zap } from 'lucide-react';

interface AnalyticsProps {
  messages: StandardizedMessage[];
}

const AnalyticsDashboard: React.FC<AnalyticsProps> = ({ messages }) => {
  const stats = useMemo(() => {
    if (!messages.length) return null;

    // Time-based stats
    const dailyMap = new Map<string, number>();
    const senderMap = new Map<string, number>();
    const wordFreq: Record<string, number> = {};

    messages.forEach(m => {
      // Activity over time
      const date = new Date(m.timestamp).toISOString().split('T')[0];
      dailyMap.set(date, (dailyMap.get(date) || 0) + 1);

      // Top communicators
      senderMap.set(m.sender, (senderMap.get(m.sender) || 0) + 1);

      // Simple word frequency (non-AI logic)
      const words = m.content.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      words.forEach(w => {
          wordFreq[w] = (wordFreq[w] || 0) + 1;
      });
    });

    const timeData = Array.from(dailyMap.entries()).map(([date, count]) => ({ date, count })).sort((a,b) => a.date.localeCompare(b.date));
    const senderData = Array.from(senderMap.entries()).map(([name, count]) => ({ name, value: count }));
    const topWords = Object.entries(wordFreq).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([text, count]) => ({ text, count }));

    return {
      timeData,
      senderData,
      topWords,
      totalWords: messages.reduce((acc, m) => acc + m.meta.word_count, 0),
      avgLength: Math.round(messages.reduce((acc, m) => acc + m.meta.message_length, 0) / messages.length)
    };
  }, [messages]);

  const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#f97316'];

  if (!stats) return <div className="p-10 text-center text-gray-500">No data for analytics</div>;

  return (
    <div className="flex-1 overflow-y-auto p-10 bg-[#0B0B0B] space-y-10">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-6 bg-[#121212] border border-[#1A1A1A] rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl"><Activity size={24} /></div>
          <div>
            <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Total Messages</p>
            <p className="text-2xl font-bold">{messages.length.toLocaleString()}</p>
          </div>
        </div>
        <div className="p-6 bg-[#121212] border border-[#1A1A1A] rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-purple-500/10 text-purple-500 rounded-xl"><Users size={24} /></div>
          <div>
            <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Unique Senders</p>
            <p className="text-2xl font-bold">{stats.senderData.length}</p>
          </div>
        </div>
        <div className="p-6 bg-[#121212] border border-[#1A1A1A] rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-teal-500/10 text-teal-500 rounded-xl"><Type size={24} /></div>
          <div>
            <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Words Analyzed</p>
            <p className="text-2xl font-bold">{stats.totalWords.toLocaleString()}</p>
          </div>
        </div>
        <div className="p-6 bg-[#121212] border border-[#1A1A1A] rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-orange-500/10 text-orange-500 rounded-xl"><Zap size={24} /></div>
          <div>
            <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Avg Length</p>
            <p className="text-2xl font-bold">{stats.avgLength} chars</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="p-8 bg-[#121212] border border-[#1A1A1A] rounded-3xl">
          <h3 className="text-lg font-bold mb-6">Engagement Activity Over Time</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.timeData}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                <XAxis dataKey="date" stroke="#555" fontSize={10} tickLine={false} />
                <YAxis stroke="#555" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #333', borderRadius: '12px', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="count" stroke="#6366f1" fillOpacity={1} fill="url(#colorCount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-8 bg-[#121212] border border-[#1A1A1A] rounded-3xl">
          <h3 className="text-lg font-bold mb-6">Messaging Distribution</h3>
          <div className="h-[300px] flex items-center justify-center">
             <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.senderData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stats.senderData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #333', borderRadius: '12px', fontSize: '12px' }}
                  />
                </PieChart>
             </ResponsiveContainer>
             <div className="flex flex-col gap-2">
                {stats.senderData.slice(0, 5).map((d, i) => (
                    <div key={d.name} className="flex items-center gap-2 text-xs">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                        <span className="text-gray-400 truncate w-24">{d.name}</span>
                        <span className="font-bold text-gray-200">{d.value}</span>
                    </div>
                ))}
             </div>
          </div>
        </div>

        <div className="p-8 bg-[#121212] border border-[#1A1A1A] rounded-3xl lg:col-span-2">
           <h3 className="text-lg font-bold mb-6">Lexical Frequency (Common Keywords)</h3>
           <div className="flex flex-wrap gap-4">
              {stats.topWords.map((word, i) => (
                  <div key={word.text} className="px-6 py-3 bg-[#1A1A1A] border border-[#222] rounded-2xl flex items-center gap-3 hover:border-indigo-500/50 transition-colors">
                      <span className="text-indigo-400 font-mono font-bold">#{i + 1}</span>
                      <span className="text-lg font-semibold">{word.text}</span>
                      <span className="text-xs text-gray-500 bg-[#0B0B0B] px-2 py-0.5 rounded-full">{word.count}</span>
                  </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
