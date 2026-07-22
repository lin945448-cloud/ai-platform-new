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
      r.influencerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.noteType && r.noteType.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [records, searchTerm]);

  const totalPages = Math.ceil(filteredData.length / pageSize);
  const currentData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const formatNum = (n: number) => n >= 10000 ? (n / 10000).toFixed(1) + 'w' : n.toString();

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden animate-fade-in">
      <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text"
            placeholder="搜索笔记标题、达人昵称或赛道类型..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-400 transition-all"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto custom-scroll">
        <div className="min-w-[900px]">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="py-3 px-4 text-[11px] font-bold text-slate-500 w-[28%]">笔记标题</th>
                <th className="py-3 px-4 text-[11px] font-bold text-slate-500">笔记类型 (赛道)</th>
                <th className="py-3 px-4 text-[11px] font-bold text-slate-500">达人信息</th>
                <th className="py-3 px-4 text-[11px] font-bold text-indigo-500">互动量</th>
                <th className="py-3 px-4 text-[11px] font-bold text-slate-500">点赞</th>
                <th className="py-3 px-4 text-[11px] font-bold text-slate-500">评论</th>
                <th className="py-3 px-4 text-[11px] font-bold text-slate-500">收藏</th>
                <th className="py-3 px-4 text-[11px] font-bold text-slate-500">分享</th>
                {/* 删除了最右侧的操作列，变得更紧凑 */}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentData.length > 0 ? currentData.map((row, i) => {
                const xhsUrl = (row as any).xhsUrl; // 获取达人主页链接
                return (
                <tr key={i} className="hover:bg-slate-50/80 transition-colors group">
                  {/* 修改：笔记标题变成可点击的蓝色链接 */}
                  <td className="py-3 px-4 text-xs">
                    {row.noteLink && row.noteLink !== '未知' ? (
                      <a href={row.noteLink} target="_blank" rel="noreferrer" className="text-indigo-600 hover:text-indigo-800 font-bold flex items-start gap-1 group/link" title="点击访问小红书笔记">
                        <span className="line-clamp-2 leading-relaxed">{row.title}</span>
                        <ExternalLink size={12} className="opacity-0 group-hover/link:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
                      </a>
                    ) : (
                      <div className="line-clamp-2 leading-relaxed font-medium text-slate-700" title={row.title}>{row.title}</div>
                    )}
                    <div className="text-[10px] text-slate-400 mt-1">{row.publishTime} · {row.noteForm}</div>
                  </td>

                  <td className="py-3 px-4">
                    <span className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded-md">
                      {row.noteType}
                    </span>
                  </td>

                  {/* 修改：达人昵称变成可点击的蓝色链接 */}
                  <td className="py-3 px-4 text-xs">
                    {xhsUrl ? (
                      <a href={xhsUrl} target="_blank" rel="noreferrer" className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 group/link" title="点击访问达人主页">
                        {row.influencerName}
                        <ExternalLink size={10} className="opacity-0 group-hover/link:opacity-100 transition-opacity" />
                      </a>
                    ) : (
                      <div className="font-bold text-slate-800">{row.influencerName}</div>
                    )}
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      <span className="text-amber-500 font-medium">{row.influencerType}</span>
                      <span className="mx-1">·</span>
                      {formatNum(row.followers)}粉
                    </div>
                  </td>

                  <td className="py-3 px-4 text-[13px] text-indigo-600 font-black">{formatNum(row.interactions)}</td>
                  <td className="py-3 px-4 text-xs text-slate-600 font-medium">{formatNum(row.likes)}</td>
                  <td className="py-3 px-4 text-xs text-slate-600 font-medium">{formatNum(row.comments)}</td>
                  <td className="py-3 px-4 text-xs text-slate-600 font-medium">{formatNum(row.collects)}</td>
                  <td className="py-3 px-4 text-xs text-slate-600 font-medium">{formatNum(row.shares)}</td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="p-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50 flex-shrink-0">
          <span className="text-[11px] text-slate-500">共检索到 {filteredData.length} 条记录</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-medium disabled:opacity-50 hover:bg-slate-50 transition-colors shadow-sm">上一页</button>
            <span className="text-[11px] text-slate-600 font-bold bg-white px-3 py-1.5 rounded-lg border border-slate-100 shadow-sm">{currentPage} / {totalPages}</span>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-medium disabled:opacity-50 hover:bg-slate-50 transition-colors shadow-sm">下一页</button>
          </div>
        </div>
      )}
    </div>
  );
};
