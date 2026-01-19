
import React from 'react';
import { SearchFilters } from '../types';
import { Filter, Calendar, Type, Users, Search, Hash, Clock, X } from 'lucide-react';

interface SearchBarProps {
  filters: SearchFilters;
  setFilters: React.Dispatch<React.SetStateAction<SearchFilters>>;
}

const SearchBar: React.FC<SearchBarProps> = ({ filters, setFilters }) => {
  const resetFilters = () => {
    setFilters({
      keyword: '',
      sender: '',
      source: 'all',
      dateFrom: '',
      dateTo: '',
      minLength: 0
    });
  };

  const hasActiveFilters = filters.keyword || filters.sender || filters.source !== 'all' || filters.dateFrom || filters.dateTo || filters.minLength > 0;

  return (
    <div className="bg-[#0D0D0D] p-10 border border-white/5 rounded-[3rem] space-y-10 shadow-2xl relative overflow-hidden" dir="rtl">
      <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
         <Search size={120} className="text-indigo-500" />
      </div>

      <div className="relative group z-10">
        <input 
          type="text" 
          placeholder="ابحث في الكلمات، الجمل، أو الذكريات..."
          className="w-full bg-[#060606] border border-white/5 rounded-[2rem] py-7 px-16 text-2xl font-black focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/40 transition-all placeholder:text-gray-800"
          value={filters.keyword}
          onChange={(e) => setFilters(f => ({ ...f, keyword: e.target.value }))}
        />
        <div className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-700 group-focus-within:text-indigo-500 transition-colors">
           <Search size={28} />
        </div>
        {filters.keyword && (
          <button 
            onClick={() => setFilters(f => ({ ...f, keyword: '' }))}
            className="absolute left-6 top-1/2 -translate-y-1/2 p-2 bg-white/5 hover:bg-white/10 rounded-full text-gray-500 transition-all"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 z-10 relative">
        <div className="flex flex-col gap-3">
            <label className="text-[10px] text-gray-600 uppercase font-black tracking-[0.2em] flex items-center gap-2">
                <Users size={12} className="text-indigo-500" /> اسم المرسل
            </label>
            <input 
                type="text" 
                placeholder="مثال: محمد، علي..."
                className="bg-[#060606] border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:border-indigo-500 transition-all"
                value={filters.sender}
                onChange={(e) => setFilters(f => ({ ...f, sender: e.target.value }))}
            />
        </div>
        
        <div className="flex flex-col gap-3">
            <label className="text-[10px] text-gray-600 uppercase font-black tracking-[0.2em] flex items-center gap-2">
                <Hash size={12} className="text-purple-500" /> مصدر البيانات
            </label>
            <select 
                className="bg-[#060606] border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:border-indigo-500 transition-all"
                value={filters.source}
                onChange={(e) => setFilters(f => ({ ...f, source: e.target.value as any }))}
            >
               <option value="all">كافة المصادر</option>
               <option value="whatsapp">WhatsApp</option>
               <option value="instagram">Instagram</option>
               <option value="chatgpt">ChatGPT</option>
            </select>
        </div>

        <div className="flex flex-col gap-3">
            <label className="text-[10px] text-gray-600 uppercase font-black tracking-[0.2em] flex items-center gap-2">
                <Calendar size={12} className="text-teal-500" /> من تاريخ
            </label>
            <input 
                type="date" 
                className="bg-[#060606] border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:border-indigo-500 color-scheme-dark"
                value={filters.dateFrom}
                onChange={(e) => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
            />
        </div>

        <div className="flex flex-col gap-3">
            <label className="text-[10px] text-gray-600 uppercase font-black tracking-[0.2em] flex items-center gap-2">
                <Clock size={12} className="text-orange-500" /> الحد الأدنى للطول
            </label>
            <div className="flex items-center gap-4">
               <input 
                  type="range" 
                  min="0"
                  max="500"
                  step="10"
                  className="flex-1 accent-indigo-500 bg-white/5 h-1.5 rounded-full"
                  value={filters.minLength}
                  onChange={(e) => setFilters(f => ({ ...f, minLength: parseInt(e.target.value) }))}
               />
               <span className="text-xs font-black text-gray-500 w-12 text-center">{filters.minLength}</span>
            </div>
        </div>
      </div>

      {hasActiveFilters && (
        <div className="flex justify-between items-center pt-8 border-t border-white/5 z-10 relative">
           <div className="flex gap-4">
              <div className="px-5 py-2.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 animate-fade-in">
                 <Filter size={12} /> فلترة نشطة
              </div>
           </div>
           <button 
             onClick={resetFilters}
             className="text-xs font-black text-gray-600 hover:text-red-500 transition-colors uppercase tracking-widest flex items-center gap-2"
           >
             <X size={14} /> إعادة ضبط الفلاتر
           </button>
        </div>
      )}
    </div>
  );
};

export default SearchBar;
