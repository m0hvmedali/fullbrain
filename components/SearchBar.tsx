
import React from 'react';
import { SearchFilters } from '../types';
import { Filter, Calendar, Type, Users } from 'lucide-react';

interface SearchBarProps {
  filters: SearchFilters;
  setFilters: React.Dispatch<React.SetStateAction<SearchFilters>>;
}

const SearchBar: React.FC<SearchBarProps> = ({ filters, setFilters }) => {
  return (
    <div className="bg-[#121212] p-6 border border-[#1A1A1A] rounded-3xl space-y-6">
      <div className="relative">
        <input 
          type="text" 
          placeholder="Search keywords in messages..."
          className="w-full bg-[#0B0B0B] border border-[#222] rounded-2xl py-4 px-12 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-lg transition-all"
          value={filters.keyword}
          onChange={(e) => setFilters(f => ({ ...f, keyword: e.target.value }))}
        />
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
           <Filter size={20} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="flex flex-col gap-2">
            <label className="text-[10px] text-gray-500 uppercase font-bold flex items-center gap-1">
                <Users size={10} /> Sender Name
            </label>
            <input 
                type="text" 
                placeholder="Any"
                className="bg-[#0B0B0B] border border-[#222] rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-indigo-500"
                value={filters.sender}
                onChange={(e) => setFilters(f => ({ ...f, sender: e.target.value }))}
            />
        </div>
        <div className="flex flex-col gap-2">
            <label className="text-[10px] text-gray-500 uppercase font-bold flex items-center gap-1">
                <Calendar size={10} /> From Date
            </label>
            <input 
                type="date" 
                className="bg-[#0B0B0B] border border-[#222] rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-indigo-500 color-scheme-dark"
                value={filters.dateFrom}
                onChange={(e) => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
            />
        </div>
        <div className="flex flex-col gap-2">
            <label className="text-[10px] text-gray-500 uppercase font-bold flex items-center gap-1">
                <Calendar size={10} /> To Date
            </label>
            <input 
                type="date" 
                className="bg-[#0B0B0B] border border-[#222] rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-indigo-500"
                value={filters.dateTo}
                onChange={(e) => setFilters(f => ({ ...f, dateTo: e.target.value }))}
            />
        </div>
        <div className="flex flex-col gap-2">
            <label className="text-[10px] text-gray-500 uppercase font-bold flex items-center gap-1">
                <Type size={10} /> Min Length
            </label>
            <input 
                type="number" 
                placeholder="0"
                className="bg-[#0B0B0B] border border-[#222] rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-indigo-500"
                value={filters.minLength}
                onChange={(e) => setFilters(f => ({ ...f, minLength: parseInt(e.target.value) || 0 }))}
            />
        </div>
      </div>
    </div>
  );
};

export default SearchBar;
