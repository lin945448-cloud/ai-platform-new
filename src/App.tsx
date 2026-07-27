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
              >
                <span>全部选中</span>
                {isAll && <Check size={14} />}
              </div>
              <div className="h-px bg-slate-100 my-1 mx-2" />
            </>
          )}
          {options.map((opt: string) => {
            const isSelected = selected.includes(opt);
            return (
              <div 
                key={opt} onClick={() => toggleOption(opt)}
                className={`px-3 py-2 text-xs font-medium cursor-pointer flex items-center justify-between hover:bg-slate-50 ${isSelected ? 'text-indigo-600 bg-indigo-50/50' : 'text-slate-600'}`}
              >
                <span className="truncate">{opt}</span>
                {isSelected && <Check size={14} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [data, setData] = useState<ParsedData>(getEmptyData());
  const [selectedCommercial, setSelectedCommercial] = useState<string>('全部');
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  
  // 新增：双模切换状态
  const [analysisMode, setAnalysisMode] = useState<'single' | 'compare'>('single');

  const handleModeChange = (mode: 'single' | 'compare') => {
    setAnalysisMode(mode);
    if (mode === 'compare' && selectedBrands.length === 0 && data.brands.length > 0) {
      setSelectedBrands(data.brands.slice(0, 2)); // 默认选两个对比
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col" style={{ height: '100vh', overflow: 'hidden' }}>
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 flex-shrink-0 px-6 py-3 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
            <Activity size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-[15px] font-black text-slate-800 tracking-wide">小红书达人数据洞察平台</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Competitor Intelligence · AI-Powered</p>
          </div>
        </div>

        {data.totalNotes > 0 && (
          <div className="flex items-center gap-4">
            {/* 新增：模式切换器 */}
            <div className="flex items-center bg-slate-100 p-1 rounded-lg shadow-inner border border-slate-200">
              <button onClick={() => handleModeChange('single')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${analysisMode === 'single' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>
                <User size={14} /> 单个分析
              </button>
              <button onClick={() => handleModeChange('compare')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${analysisMode === 'compare' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>
                <GitCompare size={14} /> 竞品对比
              </button>
            </div>

            <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 rounded-xl px-2 py-1.5 shadow-inner">
              <Filter size={14} className="text-slate-400 ml-1" />
              <select value={selectedCommercial} onChange={(e) => setSelectedCommercial(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-700 outline-none cursor-pointer hover:border-indigo-300">
                <option value="全部">全部性质</option>
                <option value="是">仅商业笔记</option>
                <option value="否">仅非商业笔记</option>
              </select>
              <MultiSelect options={data.brands} selected={selectedBrands} onChange={setSelectedBrands} placeholder="全部品牌横评" isCompareMode={analysisMode === 'compare'} />
              <MultiSelect options={data.months} selected={selectedMonths} onChange={setSelectedMonths} placeholder="全部时间段" />
            </div>
          </div>
        )}
      </header>

      <div className="flex-shrink-0 px-6 py-4">
        <UploadBar onDataLoaded={setData} currentData={data} />
      </div>

      <div className="flex-1 flex gap-5 px-6 pb-5 overflow-hidden min-h-0">
        <div className="flex flex-col h-full shadow-sm" style={{ width: '55%' }}>
          {/* 将 mode 传入看板 */}
          <Dashboard data={data} selectedCommercial={selectedCommercial} selectedBrands={selectedBrands} selectedMonths={selectedMonths} analysisMode={analysisMode} />
        </div>
        <div className="flex flex-col h-full shadow-sm" style={{ flex: 1 }}>
          <AIPanel data={data} selectedCommercial={selectedCommercial} selectedBrands={selectedBrands} selectedMonths={selectedMonths} />
        </div>
      </div>
    </div>
  );
}
