import React, { useState } from 'react';
import { ParsedData } from './types';
import { getEmptyData } from './utils/parseData';
import { Activity, Filter } from 'lucide-react';
import { UploadBar } from './components/UploadBar';
import { Dashboard } from './components/Dashboard';
import { AIPanel } from './components/AIPanel';

export default function App() {
  const [data, setData] = useState<ParsedData>(getEmptyData());
  const [selectedCommercial, setSelectedCommercial] = useState<string>('全部'); // 新增：是否商业笔记
  const [selectedBrand, setSelectedBrand] = useState<string>('全部');
  const [selectedMonth, setSelectedMonth] = useState<string>('全部');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col" style={{ height: '100vh', overflow: 'hidden' }}>
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 flex-shrink-0 px-6 py-3 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
            <Activity size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-[15px] font-black text-slate-800 tracking-wide">竞品达人战略洞察平台</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Competitor Intelligence · AI-Powered</p>
          </div>
        </div>

        {data.totalNotes > 0 && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5">
              <Filter size={14} className="text-slate-500" />
              {/* 新增：是否商业笔记 */}
              <select value={selectedCommercial} onChange={(e) => setSelectedCommercial(e.target.value)} className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer">
                <option value="全部">全部笔记性质</option>
                <option value="是">仅商业笔记 (是)</option>
                <option value="否">仅非商业笔记 (否)</option>
              </select>
              <div className="w-px h-3 bg-slate-300 mx-1" />
              <select value={selectedBrand} onChange={(e) => setSelectedBrand(e.target.value)} className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer">
                <option value="全部">全局横向对比</option>
                {data.brands.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              <div className="w-px h-3 bg-slate-300 mx-1" />
              <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer">
                <option value="全部">全部时间段</option>
                {data.months.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
        )}
      </header>

      <div className="flex-shrink-0 px-6 py-4">
        <UploadBar onDataLoaded={setData} currentData={data} />
      </div>

      <div className="flex-1 flex gap-5 px-6 pb-5 overflow-hidden min-h-0">
        <div className="flex flex-col h-full shadow-sm" style={{ width: '55%' }}>
          {/* 将新属性传入 Dashboard */}
          <Dashboard data={data} selectedCommercial={selectedCommercial} selectedBrand={selectedBrand} selectedMonth={selectedMonth} />
        </div>
        <div className="flex flex-col h-full shadow-sm" style={{ flex: 1 }}>
          <AIPanel data={data} selectedBrand={selectedBrand} selectedMonth={selectedMonth} />
        </div>
      </div>
    </div>
  );
}
