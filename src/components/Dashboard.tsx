import React, { useMemo, useState } from 'react';
import { ParsedData } from '../types';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Users, FileText, Zap, DollarSign, Award, LayoutDashboard, List, Clapperboard, Image as ImageIcon, PieChart as PieIcon } from 'lucide-react';
import { NotesTable } from './NotesTable';

interface Props {
  data: ParsedData;
  selectedBrand: string;
  selectedMonth: string;
}

export const Dashboard: React.FC<Props> = ({ data, selectedBrand, selectedMonth }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'content' | 'creators' | 'cost' | 'details'>('overview');

  // 1. 过滤当前数据
  const filteredRecords = useMemo(() => {
    return data.records.filter(r => {
      const matchBrand = selectedBrand === '全部' || r.reportedBrand === selectedBrand;
      const matchMonth = selectedMonth === '全部' || r.month === selectedMonth;
      return matchBrand && matchMonth;
    });
  }, [data.records, selectedBrand, selectedMonth]);

  // 2. 超级计算大脑
  const stats = useMemo(() => {
    const notes = filteredRecords.length;
    const interactions = filteredRecords.reduce((s, r) => s + r.interactions, 0);
    const cost = filteredRecords.reduce((s, r) => s + r.estimatedCost, 0);
    const cpe = interactions > 0 ? (cost / interactions).toFixed(2) : '0.00';

    // 时间推移图数据 (判断是按月还是按天)
    const timeUnit = selectedMonth === '全部' ? 'month' : 'date';
    const trendMap = new Map();
    const typeMap = new Map();
    const creatorAttrMap = new Map();
    let topCreator = null;
    let maxInter = -1;
    let videoCount = 0;
    let imageCount = 0;

    filteredRecords.forEach(r => {
      // 爆款达人
      if (r.interactions > maxInter) { maxInter = r.interactions; topCreator = r; }
      
      // 内容形式
      if (r.noteForm.includes('视频')) videoCount++;
      else if (r.noteForm.includes('图文')) imageCount++;

      // 时间趋势
      const t = r[timeUnit];
      if (t && t !== '未知') {
        const ex = trendMap.get(t) || { time: t, notes: 0, interactions: 0, collects: 0, cost: 0, creatorSet: new Set() };
        ex.notes += 1;
        ex.interactions += r.interactions;
        ex.collects += r.collects;
        ex.cost += r.estimatedCost;
        ex.creatorSet.add(r.influencerId);
        trendMap.set(t, ex);
      }

      // 赛道分布 (笔记类型)
      const nType = r.noteType || '未知';
      const ext = typeMap.get(nType) || { name: nType, count: 0, totalInt: 0 };
      ext.count += 1;
      ext.totalInt += r.interactions;
      typeMap.set(nType, ext);

      // 达人属性分布
      const attr = r.influencerType || '未知属性';
      const exa = creatorAttrMap.get(attr) || { name: attr, count: 0, cost: 0, fanTiers: new Map() };
      exa.count += 1;
      exa.cost += r.estimatedCost;
      
      // 属性下的粉丝层级
      const tier = r.followers < 30000 ? '3万以下' : r.followers < 50000 ? '3-5万' : r.followers < 100000 ? '5-10万' : '10万以上';
      const extf = exa.fanTiers.get(tier) || { count: 0, cost: 0 };
      extf.count += 1;
      extf.cost += r.estimatedCost;
      exa.fanTiers.set(tier, extf);
      
      creatorAttrMap.set(attr, exa);
    });

    const trends = Array.from(trendMap.values())
      .map(v => ({ ...v, creators: v.creatorSet.size, timeLabel: timeUnit === 'date' ? v.time.slice(5) : v.time }))
      .sort((a, b) => a.time.localeCompare(b.time));

    const noteTypes = Array.from(typeMap.values())
      .map(v => ({ ...v, avgInt: Math.round(v.totalInt / v.count) }))
      .sort((a, b) => b.count - a.count);

    const creatorAttrs = Array.from(creatorAttrMap.values())
      .map(v => ({
        ...v,
        tiers: Array.from(v.fanTiers.entries()).map(([k, t]: any) => ({ name: k, ...t }))
      }))
      .sort((a, b) => b.count - a.count);

    return {
      notes, interactions, cost, cpe, topCreator, trends, noteTypes, creatorAttrs, videoCount, imageCount,
      videoPct: notes > 0 ? Math.round((videoCount / notes) * 100) : 0,
      imagePct: notes > 0 ? Math.round((imageCount / notes) * 100) : 0,
      isDaily: timeUnit === 'date'
    };
  }, [filteredRecords, selectedMonth]);

  if (data.totalNotes === 0) return <div className="h-full bg-white rounded-2xl border border-slate-100 flex items-center justify-center text-slate-400 font-bold text-sm">请先上传数据文件</div>;
  const formatNum = (n: number) => n >= 10000 ? (n / 10000).toFixed(1) + 'w' : n.toLocaleString();

  return (
    <div className="h-full bg-white rounded-2xl border border-slate-100 p-4 flex flex-col overflow-hidden">
      {/* 5 个 Tab 切换按钮 */}
      <div className="flex items-center gap-1.5 mb-4 flex-shrink-0 bg-slate-50 p-1 rounded-xl w-fit border border-slate-100">
        <TabBtn active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={<LayoutDashboard size={14}/>} label="数据总览" />
        <TabBtn active={activeTab === 'content'} onClick={() => setActiveTab('content')} icon={<Clapperboard size={14}/>} label="内容分析" />
        <TabBtn active={activeTab === 'creators'} onClick={() => setActiveTab('creators')} icon={<Users size={14}/>} label="达人策略" />
        <TabBtn active={activeTab === 'cost'} onClick={() => setActiveTab('cost')} icon={<DollarSign size={14}/>} label="费用分析" />
        <TabBtn active={activeTab === 'details'} onClick={() => setActiveTab('details')} icon={<List size={14}/>} label="笔记明细" />
      </div>

      <div className="flex-1 overflow-y-auto custom-scroll pr-2 space-y-5 pb-10">
        
        {/* ================= Tab 1: 数据总览 ================= */}
        {activeTab === 'overview' && (
          <div className="space-y-5 animate-fade-in">
            <div className="grid grid-cols-4 gap-3">
              <StatCard icon={<FileText />} title="笔记总数" value={stats.notes} color="text-blue-500" bg="bg-blue-50" />
              <StatCard icon={<Zap />} title="总互动量" value={formatNum(stats.interactions)} color="text-indigo-500" bg="bg-indigo-50" />
              <StatCard icon={<DollarSign />} title="总预估花费" value={`¥${formatNum(stats.cost)}`} color="text-emerald-500" bg="bg-emerald-50" />
              <StatCard icon={<Users />} title="单互动成本" value={`¥${stats.cpe}`} color="text-amber-500" bg="bg-amber-50" />
            </div>

            <ChartBox title={stats.isDaily ? "每日互动与收藏趋势" : "月度互动与收藏推移"}>
              <LineChart data={stats.trends}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="timeLabel" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} width={45} tickFormatter={formatNum} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                <Line type="monotone" name="互动量" dataKey="interactions" stroke="#6366F1" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                <Line type="monotone" name="收藏量" dataKey="collects" stroke="#F59E0B" strokeWidth={3} dot={{ r: 3 }} />
              </LineChart>
            </ChartBox>

            {!stats.isDaily && (
              <ChartBox title="月度笔记总数推移">
                <BarChart data={stats.trends}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="timeLabel" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} width={30} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none' }} />
                  <Bar dataKey="notes" name="笔记篇数" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ChartBox>
            )}
          </div>
        )}

        {/* ================= Tab 2: 内容分析 ================= */}
        {activeTab === 'content' && (
          <div className="space-y-5 animate-fade-in">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <h3 className="text-xs font-bold text-slate-700 mb-4 flex items-center gap-1.5"><Clapperboard size={14}/> 内容形式分布</h3>
              <div className="flex gap-4 mb-3">
                <div className="flex-1 bg-white rounded-xl p-4 text-center border border-indigo-50 shadow-sm">
                  <Clapperboard className="mx-auto text-indigo-500 mb-2" size={24}/>
                  <div className="text-2xl font-black text-indigo-600">{stats.videoCount}</div>
                  <div className="text-[11px] text-indigo-400 mt-1 font-medium">视频 · {stats.videoPct}%</div>
                </div>
                <div className="flex-1 bg-white rounded-xl p-4 text-center border border-emerald-50 shadow-sm">
                  <ImageIcon className="mx-auto text-emerald-500 mb-2" size={24}/>
                  <div className="text-2xl font-black text-emerald-600">{stats.imageCount}</div>
                  <div className="text-[11px] text-emerald-400 mt-1 font-medium">图文 · {stats.imagePct}%</div>
                </div>
              </div>
              <div className="h-2 w-full flex rounded-full overflow-hidden">
                <div style={{ width: `${stats.videoPct}%` }} className="bg-indigo-500 transition-all duration-1000"></div>
                <div style={{ width: `${stats.imagePct}%` }} className="bg-emerald-400 transition-all duration-1000"></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <ChartBox title="赛道分布 (篇数)">
                <BarChart data={stats.noteTypes} layout="vertical" margin={{ left: 10 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} width={70} />
                  <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none' }} />
                  <Bar dataKey="count" name="篇数" fill="#8B5CF6" radius={[0, 4, 4, 0]} barSize={20} label={{ position: 'right', fill: '#64748b', fontSize: 10 }} />
                </BarChart>
              </ChartBox>

              <ChartBox title="各赛道平均互动量">
                <BarChart data={stats.noteTypes} layout="vertical" margin={{ left: 10 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} width={70} />
                  <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none' }} formatter={(val) => formatNum(val as number)} />
                  <Bar dataKey="avgInt" name="平均互动" fill="#EC4899" radius={[0, 4, 4, 0]} barSize={20} label={{ position: 'right', fill: '#64748b', fontSize: 10, formatter: formatNum }} />
                </BarChart>
              </ChartBox>
            </div>
          </div>
        )}

        {/* ================= Tab 3: 达人策略 ================= */}
        {activeTab === 'creators' && (
          <div className="space-y-5 animate-fade-in">
            {stats.topCreator && (
              <div className="bg-gradient-to-r from-violet-50 to-indigo-50 rounded-xl p-4 border border-violet-100 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 mb-1"><Award size={16} className="text-violet-600" /><span className="text-xs font-bold text-violet-800">最高互动达人揭秘</span></div>
                  <p className="text-sm font-bold text-slate-800">{stats.topCreator.influencerName}</p>
                  <p className="text-[11px] text-slate-600 mt-1 truncate max-w-md">爆文: {stats.topCreator.title}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black text-indigo-600">{formatNum(stats.topCreator.interactions)}</p>
                  <p className="text-[10px] text-slate-500">斩获互动量</p>
                </div>
              </div>
            )}

            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
              <h3 className="text-xs font-bold text-slate-700 mb-4 flex items-center gap-1.5"><PieIcon size={14}/> 达人属性结构 & 费用拆解</h3>
              <div className="space-y-4">
                {stats.creatorAttrs.map((attr, i) => (
                  <div key={i} className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-50">
                      <span className="text-[13px] font-bold text-indigo-600">{attr.name}</span>
                      <div className="text-right flex gap-4">
                        <div><p className="text-[10px] text-slate-400">人数 / 占比</p><p className="text-xs font-bold text-slate-700">{attr.count}人 <span className="text-slate-400 font-normal">({Math.round(attr.count/stats.notes*100)}%)</span></p></div>
                        <div><p className="text-[10px] text-slate-400">预估费用 / 占比</p><p className="text-xs font-bold text-emerald-600">¥{formatNum(attr.cost)} <span className="text-slate-400 font-normal">({Math.round(attr.cost/stats.cost*100)}%)</span></p></div>
                      </div>
                    </div>
                    {/* 层级拆解 */}
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      {attr.tiers.map((t:any, j:number) => (
                        <div key={j} className="bg-slate-50 rounded p-2 text-center">
                          <p className="text-[10px] text-slate-500 mb-1">{t.name}</p>
                          <p className="text-xs font-bold text-slate-700">{t.count}人</p>
                          <p className="text-[10px] text-emerald-500 mt-0.5">¥{formatNum(t.cost)}</p>
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
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} width={30} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none' }} />
                <Line type="monotone" name="达人数" dataKey="creators" stroke="#8B5CF6" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ChartBox>
          </div>
        )}

        {/* ================= Tab 4: 费用分析 ================= */}
        {activeTab === 'cost' && (
          <div className="space-y-5 animate-fade-in">
            <div className="flex gap-4">
              <div className="flex-1 bg-white border border-amber-100 shadow-sm rounded-xl p-5 relative overflow-hidden">
                <p className="text-xs text-slate-500 mb-1">总预估投放</p>
                <p className="text-3xl font-black text-slate-800">¥{formatNum(stats.cost)}</p>
                <p className="text-[11px] text-slate-400 mt-2">{stats.notes} 篇笔记</p>
                <DollarSign className="absolute right-4 top-4 text-amber-100" size={48} />
              </div>
              <div className="flex-1 bg-white border border-indigo-100 shadow-sm rounded-xl p-5 relative overflow-hidden">
                <p className="text-xs text-slate-500 mb-1">单次互动成本 (CPE)</p>
                <p className="text-3xl font-black text-slate-800">¥{stats.cpe}</p>
                <p className="text-[11px] text-slate-400 mt-2">平均值</p>
                <Zap className="absolute right-4 top-4 text-indigo-50" size={48} />
              </div>
            </div>

            <ChartBox title={stats.isDaily ? "每日预估费用推移" : "月度预估费用推移"}>
              <LineChart data={stats.trends}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="timeLabel" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} width={45} tickFormatter={formatNum} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none' }} formatter={(val) => '¥' + formatNum(val as number)} />
                <Line type="monotone" name="预估费用" dataKey="cost" stroke="#10B981" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 6 }} fill="#10B981" />
              </LineChart>
            </ChartBox>
          </div>
        )}

        {/* ================= Tab 5: 笔记明细 ================= */}
        {activeTab === 'details' && (
          <div className="h-[500px] animate-fade-in">
            <NotesTable records={filteredRecords} />
          </div>
        )}
      </div>
    </div>
  );
};

// 各种迷你组件，让代码更干净
function TabBtn({ active, onClick, icon, label }: any) {
  return (
    <button onClick={onClick} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${active ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
      {icon} {label}
    </button>
  );
}

function StatCard({ icon, title, value, color, bg }: any) {
  return (
    <div className={`${bg} rounded-xl p-3 border border-slate-100/50`}>
      <div className={`w-7 h-7 rounded-lg bg-white flex items-center justify-center shadow-sm mb-2 ${color}`}>
        {React.cloneElement(icon, { size: 14 })}
      </div>
      <p className="text-[11px] text-slate-500 mb-0.5">{title}</p>
      <p className={`text-lg font-black ${color.replace('text-', 'text-').replace('500', '700')}`}>{value}</p>
    </div>
  );
}

function ChartBox({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
      <h3 className="text-xs font-bold text-slate-700 mb-4">{title}</h3>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
