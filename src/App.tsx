import React, { useState } from 'react';
import { ParsedData } from './types';
import { getEmptyData } from './utils/parseData';
import { Activity, Filter, ChevronDown, Check, GitCompare, User } from 'lucide-react';
import { UploadBar } from './components/UploadBar';
import { Dashboard } from './components/Dashboard';
import { AIPanel } from './components/AIPanel';

function MultiSelect({ options, selected, onChange, placeholder, isCompareMode }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const isAll = selected.length === 0;

  const toggleOption = (opt: string) => {
    if (selected.includes(opt)) onChange(selected.filter((o: string) => o !== opt));
    else onChange([...selected, opt]);
  };

  return (
    <div className="relative">
      {isOpen && <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />}
      
      <div 
        onClick={() => setIsOpen(!isOpen)} 
        className="relative z-50 flex items-center justify-between gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-indigo-300 transition-colors min-w-[120px]"
      >
        <span className="text-xs font-bold text-slate-700 truncate max-w-[120px]">
          {isCompareMode && isAll ? '请勾选对比品牌' : isAll ? placeholder : `${selected[0]} ${selected.length > 1 ? `(+${selected.length - 1})` : ''}`}
        </span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-50 top-full right-0 mt-1 w-48 bg-white border border-slate-100 rounded-xl shadow-xl py-1 max-h-60 overflow-y-auto custom-scroll">
          {!isCompareMode && (
            <>
              <div 
                onClick={() => { onChange([]); setIsOpen(false); }}
                className={`px-3 py-2 text-xs font-bold cursor-pointer flex items-center justify-between hover:bg-slate-50 ${isAll ? 'text-indigo-600' : 'text-slate-600'}`}
              
