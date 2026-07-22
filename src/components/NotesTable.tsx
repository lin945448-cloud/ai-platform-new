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

  // 搜索过滤
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
      {/* 搜索栏 */}
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

      {/* 表格主体 (加入 min-w-[900px] 保证列多的时候不会挤在一起，而是横向滚动) */}
      <div className="flex-1 overflow-auto custom-scroll">
        <div className="min-w-[900px]">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="py-3 px-4 text-[11px] font-bold text-slate-500 w-[25%]">笔记标题</th>
                <th className="py-3 px-4 text-[11px] font-bold text-slate-500">笔记类型 (赛道)</th>
                <th className="py-3 px-4 text-[11px] font-bold text-slate-500">达人信息</th>
                <th className="py-3 px-4 text-[11px] font-bold text-indigo-500">互动量</th>
                <th className="py-3 px-4 text-[11px] font-bold text-slate-500">点赞</th>
                <th className="py-3 px-4 text-[11px] font-bold text-slate-500">评论</th>
                <th className="py-3 px-4 text-[11px] font-bold text-slate-500">收藏</th>
                <th className="py-3 px-4 text-[11px] font-bold text-slate-500">分享</th>
                <th className="py-3 px-4 text-[11px] font-bold text-slate-500 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentData.length > 0 ? currentData.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50/80 transition-colors group">
                  {/* 笔记标题 */}
                  <td className="py-3 px-4 text-xs text-slate-700">
                    <div className="line-clamp-2 leading-relaxed font-medium" title={row.title}>{row.title}</div>
                    <div className="text-[10px] text-slate-400 mt-1">{row.publishTime} · {row.noteForm}</div>
                  </td>
                  
                  {/* 笔记类型 */}
                  <td className="py-3 px-4">
                    <span className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded-md">
                      {row.noteType}
                    </span>
                  </td>

                  {/* 达人信息 (加上了粉丝数) */}
                  <td className="py-3 px-4 text-xs text-slate-700">
                    <div className="font-bold text-slate-800">{row.influencerName}</div>
                    {/* 这里的粉丝数展示完美符合你的截图要求 */}
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      <span className="text-amber-500 font-medium">{row.influencerType}</span>
                      <span className="mx-1">·</span>
                      {formatNum(row.followers)}粉
                    </div>
                  </td>

                  {/* 核心互动数据 */}
                  <td className="py-3 px-4 text-[13px] text-indigo-600 font-black">
                    {formatNum(row.interactions)}
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-600 font-medium">{formatNum(row.likes)}</td>
                  <td className="py-3 px-4 text-xs text-slate-600 font-medium">{formatNum(row.comments)}</td>
                  <td className="py-3 px-4 text-xs text-slate-600 font-medium">{formatNum(row.collects)}</td>
                  <td className="py-3 px-4 text-xs text-slate-600 font-medium">{formatNum(row.shares)}</td>

                  {/* 链接按钮 */}
                  <td className="py-3 px-4 text-center">
                    {row.noteLink && row.noteLink !== '未知' ? (
                      <a href={row.noteLink} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-50 text-indigo-500 hover:bg-indigo-100 hover:scale-110 transition-all shadow-sm">
                        <ExternalLink size={14} />
                      </a>
                    ) : (
                      <span className="text-[10px] text-slate-300">无链接</span>
                    )}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-xs text-slate-400">没有找到匹配的数据</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 分页控制 */}
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
