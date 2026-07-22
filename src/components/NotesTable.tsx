import React, { useState, useMemo } from 'react';
import { NoteRecord } from '../types';
import { Search, ExternalLink } from 'lucide-react';

interface Props {
  records: NoteRecord[];
}

export const NotesTable: React.FC<Props> = ({ records }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const filteredData = useMemo(() => {
    return records.filter(r => 
      r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.influencerName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [records, searchTerm]);

  const totalPages = Math.ceil(filteredData.length / pageSize);
  const currentData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const formatNum = (n: number) => n >= 10000 ? (n / 10000).toFixed(1) + 'w' : n.toString();

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-3 border-b border-slate-100 bg-slate-50/50">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text"
            placeholder="搜索笔记标题或达人昵称..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-400 transition-all"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto custom-scroll">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="py-2.5 px-4 text-[11px] font-semibold text-slate-500 w-1/3">笔记标题</th>
              <th className="py-2.5 px-4 text-[11px] font-semibold text-slate-500">达人昵称</th>
              <th className="py-2.5 px-4 text-[11px] font-semibold text-slate-500">互动量</th>
              <th className="py-2.5 px-4 text-[11px] font-semibold text-slate-500 text-right">链接</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {currentData.map((row, i) => (
              <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                <td className="py-3 px-4 text-xs text-slate-700">
                  <div className="line-clamp-2 leading-relaxed font-medium">{row.title}</div>
                  <div className="text-[10px] text-slate-400 mt-1">{row.publishTime} · {row.noteForm}</div>
                </td>
                <td className="py-3 px-4 text-xs text-slate-700">
                  <div className="font-bold text-indigo-600">{row.influencerName}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{row.influencerType}</div>
                </td>
                <td className="py-3 px-4 text-xs text-slate-700 font-bold">{formatNum(row.interactions)}</td>
                <td className="py-3 px-4 text-right">
                  {row.noteLink && row.noteLink !== '未知' && (
                    <a href={row.noteLink} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-50 text-indigo-500 hover:bg-indigo-100 transition-colors">
                      <ExternalLink size={14} />
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="p-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <span className="text-[11px] text-slate-500">共 {filteredData.length} 条</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 rounded bg-white border border-slate-200 text-xs disabled:opacity-50">上一页</button>
            <span className="text-[11px] text-slate-600 font-medium">{currentPage} / {totalPages}</span>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 rounded bg-white border border-slate-200 text-xs disabled:opacity-50">下一页</button>
          </div>
        </div>
      )}
    </div>
  );
};
