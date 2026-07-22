import React, { useMemo, useState } from 'react';
import { ParsedData } from '../types';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, LabelList } from 'recharts';
import { Users, FileText, Zap, DollarSign, LayoutDashboard, List, Clapperboard, Image as ImageIcon, PieChart as PieIcon, ThumbsUp, MessageCircle, Star, Share2, Crown } from 'lucide-react';
import { NotesTable } from './NotesTable';

interface Props { data: ParsedData; selectedCommercial: string; selectedBrand: string; selectedMonth: string; }

export const Dashboard: React.FC<Props> = ({ data, selectedCommercial, selectedBrand, selectedMonth }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'content' | 'creators' | 'cost' | 'details'>('overview');

  const filteredRecords = useMemo(() => {
    return data.records.filter(r => {
      const isCom = (r as any).isCommercial;
      const matchCom = selectedCommercial === '全部' || isCom === selectedCommercial;
      const matchBrand = selectedBrand === '全部' || r.reportedBrand === selectedBrand;
      const matchMonth = selectedMonth === '全部' || r.month === selectedMonth;
      return matchCom && matchBrand && matchMonth;
    });
  }, [data.records, selectedCommercial, selectedBrand, selectedMonth]);

  const stats = useMemo(() => {
    const notes = filteredRecords.length;
    const interactions = filteredRecords.reduce((s, r) => s + r.interactions, 0);
    const cost = filteredRecords.reduce((s, r) => s + r.estimatedCost, 0);
    const likes = filteredRecords.reduce((s, r) => s + r.likes, 0);
    const comments = filteredRecords.reduce((s, r) => s + r.comments, 0);
    const collects = filteredRecords.reduce((s, r) => s + r.collects, 0);
    const shares = filteredRecords.reduce((s, r) => s + r.shares, 0);
    const cpe = interactions > 0 ? (cost / interactions).toFixed(2) : '0.00';

    const timeUnit = selectedMonth === '全部' ? 'month' : 'date';
    const trendMap = new Map();
    const typeMap = new Map();
    const creatorAttrMap = new Map();
    let videoCount = 0; let imageCount = 0;

    // 达人Top10计算
    const top10Notes = [...filteredRecords].sort((a, b) => b.interactions - a.interactions).slice(0, 10);

    filteredRecords.forEach(r => {
      if (r.noteForm.includes('视频')) videoCount++; else imageCount++;

      const t = r[timeUnit];
      if (t && t !== '未知') {
        const ex = trendMap.get(t) || { time: t, notes: 0, interactions: 0, shares: 0, cost: 0, creators: new Set() };
        ex.notes += 1; ex.interactions += r.interactions; ex.shares += r.shares; ex.cost += r.estimatedCost; ex.creators.add(r.influencerId);
        trendMap.set(t, ex);
      }

      const nType = r.noteType || '未知';
      const ext = typeMap.get(nType) || { name: nType, count: 0, totalInt: 0 };
      ext.count += 1; ext.totalInt += r.interactions;
      typeMap.set(nType, ext);

      const attr = r.influencerType || '未知属性';
      const exa = creatorAttrMap.get(attr) || { name: attr, count: 0, cost: 0, fanTiers: new Map() };
      exa.count += 1; exa.cost += r.estimatedCost;
      const tier = r.followers < 30000 ? '3w以下' : r.followers < 50000 ? '3-5w' : r.followers < 100000 ? '5-10w' : '10w+';
      const extf = exa.fanTiers.get(tier) || { count: 0, cost: 0 };
      extf.count += 1; extf.cost += r.estimatedCost; exa.fanTiers.set(tier, extf);
      creatorAttrMap.set(attr, exa);
    });

    const trends = Array.from(trendMap.values()).map(v => ({ 
      ...v, creators: v.creators.size, timeLabel: timeUnit === 'date' ? v.time.slice(5) : v.time,
      cpe: v.interactions > 0 ? (v.cost / v.interactions).toFixed(2) : 0 
    })).sort((a, b) => a.time.localeCompare(b.time));

    const noteTypes = Array.from(typeMap.values()).map(v => ({ ...v, avgInt: Math.round(v.totalInt / v.count) })).sort((a, b) => b.count - a.count);
    const creatorAttrs = Array.from(creatorAttrMap.values()).map(v => ({ ...v, tiers: Array.from(v.fanTiers.entries()).map(([k, t]: any) => ({ name: k, ...t })) })).sort((a, b) => b.count - a.count);

    return { notes, interactions, cost, cpe, likes, comments, collects, shares, trends, noteTypes, creatorAttrs, top10Notes, videoCount, imageCount, videoPct: notes > 0 ? Math.round((videoCount / notes) * 100) : 0, imagePct: notes > 0 ? Math.round((imageCount / notes) * 100) : 0, isDaily: timeUnit === 'date' };
  }, [filteredRecords, selectedMonth]);

  if (data.totalNotes === 0) return <div className="h-full bg-white rounded-2xl flex justify-center items-center text-slate-400 font-bold">请先上传数据文件</div>;
  const formatNum = (n: number) => n >= 10000 ? (n / 10000).toFixed(1) + 'w' : n.toLocaleString();

  return (
    <div className="h-full bg-white rounded-2xl border border-slate-100 p-4 flex flex-col overflow-hidden">
      <div className="flex gap-1.5 mb-4 flex-shrink-0 bg-slate-50 p-1 rounded-xl w-fit border border-slate-100">
        <TabBtn active={activeTab==='overview'} onClick={()=>setActiveTab('overview')} icon={<LayoutDashboard size={14}/>} label="数据总览" />
        <TabBtn active={activeTab==='content'} onClick={()=>setActiveTab('content')} icon={<Clapperboard size={14}/>} label="内容分析" />
        <TabBtn active={activeTab==='creators'} onClick={()=>setActiveTab('creators')} icon={<Users size={14}/>} label="达人策略" />
        <TabBtn active={activeTab==='cost'} onClick={()=>setActiveTab('cost')} icon={<DollarSign size={14}/>} label="费用分析" />
        <TabBtn active={activeTab==='details'} onClick={()=>setActiveTab('details')} icon={<List size={14}/>} label="笔记明细" />
      </div>

      <div className="flex-1 overflow-y-auto custom-scroll pr-2 space-y-6 pb-10">
        
        {/* ================= Tab 1: 数据总览 ================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-4 gap-3">
              <StatCard icon={<FileText/>} title="笔记总数" value={stats.notes} color="text-blue-500" bg="bg-blue-50" />
              <StatCard icon={<Zap/>} title="总互动量" value={formatNum(stats.interactions)} color="text-indigo-500" bg="bg-indigo-50" />
              <StatCard icon={<DollarSign/>} title="总预估花费" value={`¥${formatNum(stats.cost)}`} color="text-emerald-500" bg="bg-emerald-50" />
              <StatCard icon={<Users/>} title="单互动成本(CPE)" value={`¥${stats.cpe}`} color="text-amber-500" bg="bg-amber-50" />
              {/* 新增的4个卡片 */}
              <StatCard icon={<ThumbsUp/>} title="总点赞数" value={formatNum(stats.likes)} color="text-rose-500" bg="bg-rose-50" />
              <StatCard icon={<MessageCircle/>} title="总评论数" value={formatNum(stats.comments)} color="text-violet-500" bg="bg-violet-50" />
              <StatCard icon={<Star/>} title="总收藏数" value={formatNum(stats.collects)} color="text-fuchsia-500" bg="bg-fuchsia-50" />
              <StatCard icon={<Share2/>} title="总分享数" value={formatNum(stats.shares)} color="text-cyan-500" bg="bg-cyan-50" />
            </div>

            <ChartBox title={stats.isDaily ? "每日互动与分享趋势 (双轴)" : "月度互动与分享推移 (双轴)"}>
              <LineChart data={stats.trends}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="timeLabel" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                {/* 双 Y 轴设计 */}
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6366F1' }} width={40} tickFormatter={formatNum} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#14B8A6' }} width={40} tickFormatter={formatNum} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                <Line yAxisId="left" type="monotone" name="互动量" dataKey="interactions" stroke="#6366F1" strokeWidth={3} dot={{ r: 3 }} />
                <Line yAxisId="right" type="monotone" name="分享数" dataKey="shares" stroke="#14B8A6" strokeWidth={3} dot={{ r: 3 }} />
              </LineChart>
            </ChartBox>

            {!stats.isDaily && (
              <ChartBox title="月度笔记总数推移 (直观数据)">
                <BarChart data={stats.trends}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="timeLabel" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                  <YAxis hide />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none' }} />
                  <Bar dataKey="notes" name="笔记篇数" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={50}>
                    {/* 直接在柱子上方显示数字 */}
                    <LabelList dataKey="notes" position="top" fill="#64748b" fontSize={12} fontWeight="bold" />
                  </Bar>
                </BarChart>
              </ChartBox>
            )}
          </div>
        )}

        {/* ================= Tab 2: 内容分析 ================= */}
        {activeTab === 'content' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <h3 className="text-xs font-bold text-slate-700 mb-4 flex items-center gap-1.5"><Clapperboard size={14}/> 笔记形式占比</h3>
              <div className="flex gap-4 mb-3">
                <div className="flex-1 bg-white rounded-xl p-4 text-center shadow-sm">
                  <div className="text-2xl font-black text-indigo-600">{stats.videoCount}</div>
                  <div className="text-[11px] text-indigo-400 mt-1 font-medium">视频 · {stats.videoPct}%</div>
                </div>
                <div className="flex-1 bg-white rounded-xl p-4 text-center shadow-sm">
                  <div className="text-2xl font-black text-emerald-600">{stats.imageCount}</div>
                  <div className="text-[11px] text-emerald-400 mt-1 font-medium">图文 · {stats.imagePct}%</div>
                </div>
              </div>
              <div className="h-2 w-full flex rounded-full overflow-hidden">
                <div style={{ width: `${stats.videoPct}%` }} className="bg-indigo-500"></div>
                <div style={{ width: `${stats.imagePct}%` }} className="bg-emerald-400"></div>
              </div>
            </div>

            {/* 修改：放大且单独成行的赛道分布 */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <h3 className="text-xs font-bold text-slate-700 mb-4 flex items-center gap-1.5">📁 赛道篇数分布 (展开版)</h3>
              <div style={{ height: `${Math.max(250, stats.noteTypes.length * 40 + 20)}px` }} className="w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.noteTypes} layout="vertical" margin={{ left: 10, right: 30 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} width={80} />
                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none' }} />
                    {/* 给每个赛道不同的漂亮颜色 */}
                    <Bar dataKey="count" name="篇数" radius={[0, 6, 6, 0]} barSize={24}>
                      {stats.noteTypes.map((_, i) => <Cell key={i} fill={['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#A855F7', '#EC4899', '#F97316'][i % 7]} />)}
                      <LabelList dataKey="count" position="right" fill="#64748b" fontSize={11} fontWeight="bold" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 修改：赛道平均互动量，用带数字的排版 */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <h3 className="text-xs font-bold text-slate-700 mb-5 flex items-center gap-1.5">⚡ 赛道平均互动量排行榜</h3>
              <div className="space-y-4">
                {stats.noteTypes.sort((a,b) => b.avgInt - a.avgInt).map((item, i) => {
                  const maxVal = Math.max(...stats.noteTypes.map(n => n.avgInt));
                  const pct = maxVal === 0 ? 0 : (item.avgInt / maxVal) * 100;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="w-5 text-center text-slate-400 font-black text-sm">{i+1}</span>
                      <span className="w-24 text-xs font-bold text-slate-700 truncate">{item.name}</span>
                      <div className="flex-1 bg-slate-200 h-2.5 rounded-full overflow-hidden">
                        <div className="bg-violet-500 h-full rounded-full" style={{ width: `${pct}%` }}></div>
                      </div>
                      <div className="text-right w-20">
                        <span className="font-black text-sm text-slate-800">{formatNum(item.avgInt)}</span>
                        <span className="text-[10px] text-slate-400 ml-1.5">{item.count}篇</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ================= Tab 3: 达人策略 ================= */}
        {activeTab === 'creators' && (
          <div className="space-y-6 animate-fade-in">
            {/* 修改：美化属性拆解面板 */}
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
              <h3 className="text-xs font-bold text-slate-700 mb-4 flex items-center gap-1.5"><PieIcon size={14}/> 达人属性结构 & 费用拆解</h3>
              <div className="grid gap-4">
                {stats.creatorAttrs.map((attr, i) => (
                  <div key={i} className="bg-gradient-to-r from-white to-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                    <div className="flex justify-between items-center mb-3 pb-3 border-b border-slate-200/60">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                        <span className="text-sm font-black text-indigo-700">{attr.name}</span>
                      </div>
                      <div className="text-right flex gap-6">
                        <div><p className="text-[10px] text-slate-400 mb-0.5">达人数占比</p><p className="text-sm font-black text-slate-700">{attr.count}人 <span className="text-[10px] text-slate-400 font-normal">({Math.round(attr.count/stats.notes*100)}%)</span></p></div>
                        <div><p className="text-[10px] text-slate-400 mb-0.5">费用占比</p><p className="text-sm font-black text-emerald-600">¥{formatNum(attr.cost)} <span className="text-[10px] text-emerald-400 font-normal">({Math.round(attr.cost/stats.cost*100)}%)</span></p></div>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {attr.tiers.map((t:any, j:number) => (
                        <div key={j} className="bg-white rounded-lg p-2.5 text-center border border-slate-100">
                          <p className="text-[11px] font-bold text-slate-500 mb-1">{t.name}</p>
                          <p className="text-[13px] font-black text-slate-800">{t.count}人</p>
                          <p className="text-[10px] font-bold text-emerald-500 mt-1 bg-emerald-50 rounded-full inline-block px-2">¥{formatNum(t.cost)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <ChartBox title={stats.isDaily ? "每日达人数推移" : "月度达人数推移"}>
              <LineChart data={stats.trends}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="timeLabel" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                <YAxis hide />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none' }} />
                <Line type="monotone" name="达人数" dataKey="creators" stroke="#8B5CF6" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 6 }} >
                  <LabelList dataKey="creators" position="top" fill="#8B5CF6" fontSize={11} fontWeight="bold" />
                </Line>
              </LineChart>
            </ChartBox>

            {/* 新增：Top 10 达人排行榜 */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <h3 className="text-xs font-bold text-slate-700 mb-4 flex items-center gap-1.5"><Crown size={16} className="text-amber-500"/> 达人爆款互动排行 (Top 10)</h3>
              <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                {stats.top10Notes.map((note, i) => (
                  <div key={i} className="flex items-center justify-between p-3 border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      {/* 排名勋章 */}
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-black ${i===0?'bg-amber-100 text-amber-600':i===1?'bg-slate-200 text-slate-600':i===2?'bg-orange-100 text-orange-600':'bg-slate-50 text-slate-400'}`}>
                        {i+1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-[13px] font-bold text-slate-800">{note.influencerName}</p>
                          <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 rounded-sm">{note.noteType}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">{note.influencerType} · {formatNum(note.followers)}粉</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-indigo-600">{formatNum(note.interactions)}</p>
                      <p className="text-[10px] text-slate-400">互动</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= Tab 4: 费用分析 ================= */}
        {activeTab === 'cost' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex gap-4">
              <div className="flex-1 bg-white border border-amber-100 shadow-sm rounded-xl p-5 relative">
                <p className="text-xs text-slate-500 mb-1">总预估投放</p>
                <p className="text-3xl font-black text-slate-800">¥{formatNum(stats.cost)}</p>
                <p className="text-[11px] text-slate-400 mt-2">{stats.notes} 篇笔记</p>
                <DollarSign className="absolute right-4 top-4 text-amber-100" size={48} />
              </div>
              <div className="flex-1 bg-white border border-indigo-100 shadow-sm rounded-xl p-5 relative">
                <p className="text-xs text-slate-500 mb-1">单次互动成本 (CPE)</p>
                <p className="text-3xl font-black text-slate-800">¥{stats.cpe}</p>
                <p className="text-[11px] text-slate-400 mt-2">平均值</p>
                <Zap className="absolute right-4 top-4 text-indigo-50" size={48} />
              </div>
            </div>

            {/* 修改：全部月份时双Y轴加 CPE */}
            <ChartBox title={stats.isDaily ? "每日预估费用推移" : "月度预估费用与 CPE 推移 (双轴)"}>
              <LineChart data={stats.trends}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="timeLabel" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#10B981' }} width={40} tickFormatter={(v)=>'¥'+formatNum(v)} />
                {/* 如果是全部月份，展示右侧的 CPE 轴 */}
                {!stats.isDaily && <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#F59E0B' }} width={30} />}
                
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                <Line yAxisId="left" type="monotone" name="预估费用" dataKey="cost" stroke="#10B981" strokeWidth={3} dot={{ r: 3 }} />
                {!stats.isDaily && <Line yAxisId="right" type="monotone" name="CPE" dataKey="cpe" stroke="#F59E0B" strokeWidth={3} dot={{ r: 3 }} />}
              </LineChart>
            </ChartBox>
          </div>
        )}

        {activeTab === 'details' && <div className="h-[500px] animate-fade-in"><NotesTable records={filteredRecords} /></div>}
      </div>
    </div>
  );
};

function TabBtn({ active, onClick, icon, label }: any) { return (<button onClick={onClick} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${active ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{icon} {label}</button>); }
function StatCard({ icon, title, value, color, bg }: any) { return (<div className={`${bg} rounded-xl p-3 border border-slate-100/50`}><div className={`w-7 h-7 rounded-lg bg-white flex items-center justify-center shadow-sm mb-2 ${color}`}>{React.cloneElement(icon, { size: 14 })}</div><p className="text-[11px] text-slate-500 mb-0.5">{title}</p><p className={`text-lg font-black ${color.replace('text-', 'text-').replace('500', '700')}`}>{value}</p></div>); }
function ChartBox({ title, children }: { title: string, children: React.ReactNode }) { return (<div className="bg-slate-50 rounded-xl p-4 border border-slate-100"><h3 className="text-xs font-bold text-slate-700 mb-4">{title}</h3><div className="h-56"><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div></div>); }
