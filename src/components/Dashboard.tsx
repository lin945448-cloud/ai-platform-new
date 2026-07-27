import React, { useMemo, useState } from 'react';
import { ParsedData, NoteRecord } from '../types';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, ReferenceLine, LabelList } from 'recharts';
import { LayoutDashboard, Users, Clapperboard, DollarSign, List, FileText, Zap, ThumbsUp, MessageCircle, Star, ExternalLink, ArrowUpDown, Award } from 'lucide-react';
import { NotesTable } from './NotesTable';

interface Props { data: ParsedData; selectedCommercial: string; selectedBrands: string[]; selectedMonths: string[]; analysisMode: 'single' | 'compare'; }

const formatNum = (n: any) => { const num = Number(n) || 0; return num >= 10000 ? (num / 10000).toFixed(1) + 'w' : num.toLocaleString(); };
const formatComma = (n: any) => (Number(n) || 0).toLocaleString();
const getTop3 = (arr: any[], key: string) => [...arr].sort((a, b) => (Number(b[key])||0) - (Number(a[key])||0)).slice(0, 3);

// 核心算力
function computeStats(records: NoteRecord[], timeUnit: string) {
  let cost=0, interactions=0, likes=0, comments=0, collects=0, shares=0, videoCount=0, imageCount=0;
  const trendMap = new Map();
  const typeMap = new Map();
  const creatorAttrMap = new Map();
  const creatorNotesMap = new Map();

  records.forEach(r => {
    cost += r.estimatedCost; interactions += r.interactions; likes += r.likes; comments += r.comments; collects += r.collects; shares += r.shares;
    r.noteForm.includes('视频') ? videoCount++ : imageCount++;

    // 记录复投达人明细
    const cInfo = creatorNotesMap.get(r.influencerId) || { name: r.influencerName, type: r.influencerType, followers: r.followers, notes: [] };
    cInfo.notes.push(r);
    creatorNotesMap.set(r.influencerId, cInfo);

    const t = (r as any)[timeUnit];
    if (t && t !== '未知') {
      const ex = trendMap.get(t) || { time: t, notes: 0, interactions: 0, likes: 0, comments: 0, collects: 0, cost: 0, creators: new Set() };
      ex.notes++; ex.interactions += r.interactions; ex.likes += r.likes; ex.comments += r.comments; ex.collects += r.collects; ex.cost += r.estimatedCost; ex.creators.add(r.influencerId);
      trendMap.set(t, ex);
    }

    const nType = r.noteType || '未知';
    // 新增：计算每个赛道的点赞、评论、收藏
    const ext = typeMap.get(nType) || { name: nType, count: 0, interactions: 0, likes: 0, comments: 0, collects: 0, vCount: 0, iCount: 0 };
    ext.count++; ext.interactions += r.interactions; ext.likes += r.likes; ext.comments += r.comments; ext.collects += r.collects;
    r.noteForm.includes('视频') ? ext.vCount++ : ext.iCount++;
    typeMap.set(nType, ext);

    const attr = r.influencerType || '未知属性';
    const exa = creatorAttrMap.get(attr) || { name: attr, count: 0, cost: 0 };
    exa.count++; exa.cost += r.estimatedCost;
    creatorAttrMap.set(attr, exa);
  });

  const notes = records.length;
  const cpe = interactions > 0 ? cost / interactions : 0;
  
  const trends = Array.from(trendMap.values()).map(v => ({
    timeLabel: timeUnit === 'date' ? v.time.slice(5) : v.time,
    notes: v.notes, interactions: v.interactions, likes: v.likes, comments: v.comments, collects: v.collects, cost: v.cost, creators: v.creators.size,
    cpe: v.interactions > 0 ? v.cost / v.interactions : 0,
    likeRate: v.interactions > 0 ? (v.likes/v.interactions)*100 : 0,
    commentRate: v.interactions > 0 ? (v.comments/v.interactions)*100 : 0,
    collectRate: v.interactions > 0 ? (v.collects/v.interactions)*100 : 0,
  })).sort((a, b) => a.timeLabel.localeCompare(b.timeLabel));

  const types = Array.from(typeMap.values()).map(v => ({
    ...v, avgInt: v.count > 0 ? v.interactions / v.count : 0, vPct: v.count > 0 ? (v.vCount/v.count)*100 : 0, iPct: v.count > 0 ? (v.iCount/v.count)*100 : 0
  })).sort((a, b) => b.count - a.count);

  const creatorAttrs = Array.from(creatorAttrMap.values()).map(v => ({ ...v, avgCost: v.count > 0 ? v.cost / v.count : 0 })).sort((a,b)=>b.count-a.count);
  const repeatedCreators = Array.from(creatorNotesMap.values()).filter((c:any) => c.notes.length > 1).sort((a:any,b:any)=>b.notes.length - a.notes.length);

  const avg = {
    notes: trends.length ? Math.round(trends.reduce((s,t)=>s+t.notes,0)/trends.length) : 0,
    interactions: trends.length ? Math.round(trends.reduce((s,t)=>s+t.interactions,0)/trends.length) : 0,
    likes: trends.length ? Math.round(trends.reduce((s,t)=>s+t.likes,0)/trends.length) : 0,
    comments: trends.length ? Math.round(trends.reduce((s,t)=>s+t.comments,0)/trends.length) : 0,
    collects: trends.length ? Math.round(trends.reduce((s,t)=>s+t.collects,0)/trends.length) : 0,
    cpe: trends.length ? (trends.reduce((s,t)=>s+t.cpe,0)/trends.length) : 0,
    cost: trends.length ? (trends.reduce((s,t)=>s+t.cost,0)/trends.length) : 0,
  };

  return { 
    records, notes, interactions, likes, comments, collects, shares, cost, cpe, 
    videoCount, imageCount, influencerCount: creatorNotesMap.size, repeatedCreators,
    trends, types, creatorAttrs, avg,
    topInt: getTop3(records, 'interactions'), topLikes: getTop3(records, 'likes'), topComments: getTop3(records, 'comments'), topCollects: getTop3(records, 'collects')
  };
}

export const Dashboard: React.FC<Props> = ({ data, selectedCommercial, selectedBrands, selectedMonths, analysisMode }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'content' | 'creators' | 'cost' | 'details'>('overview');

  const { overallStats, compareStats, timeUnit, allTimeLabels, activeBrands } = useMemo(() => {
    let validRecords = data.records.filter(r => selectedCommercial === '全部' || (r as any).isCommercial === selectedCommercial);
    if (selectedMonths.length > 0) validRecords = validRecords.filter(r => selectedMonths.includes(r.month));
    const tu = selectedMonths.length === 1 ? 'date' : 'month';
    
    let singleRecords = validRecords;
    if (analysisMode === 'single' && selectedBrands.length > 0) singleRecords = validRecords.filter(r => selectedBrands.includes(r.reportedBrand));
    const os = computeStats(singleRecords, tu);

    const ab = analysisMode === 'compare' ? (selectedBrands.length > 0 ? selectedBrands : data.brands) : [];
    const cs: Record<string, ReturnType<typeof computeStats>> = {};
    ab.forEach(b => cs[b] = computeStats(validRecords.filter(r => r.reportedBrand === b), tu));

    const tl = Array.from(new Set(validRecords.map(r => tu === 'date' ? r.date.slice(5) : r.month))).sort();
    return { overallStats: os, compareStats: cs, timeUnit: tu, allTimeLabels: tl, activeBrands: ab };
  }, [data.records, selectedCommercial, selectedBrands, selectedMonths, analysisMode]);

  if (data.totalNotes === 0) return <div className="h-full bg-white rounded-2xl flex justify-center items-center text-slate-400 font-bold">请先上传数据文件</div>;
  if (analysisMode === 'compare' && activeBrands.length === 0) return <div className="h-full bg-white rounded-2xl flex justify-center items-center text-slate-400 font-bold">请在上方勾选需要对比的品牌</div>;

  const isDaily = timeUnit === 'date';
  const timeLabelText = isDaily ? '日均' : '月均';
  const displayTitle = analysisMode === 'single' ? (selectedBrands.length === 1 ? selectedBrands[0] : (selectedBrands.length===0?'全部品牌概览':'聚合品牌概览')) : '竞品对比模式';
  const colors = ['#6366F1', '#14B8A6', '#F59E0B', '#EC4899', '#8B5CF6'];

  const compareTrends = allTimeLabels.map(time => {
    const row: any = { timeLabel: time };
    activeBrands.forEach(b => {
      const t = compareStats[b].trends.find(x => x.timeLabel === time);
      row[`${b}_int`] = t?.interactions || 0; row[`${b}_likes`] = t?.likes || 0; row[`${b}_comments`] = t?.comments || 0; row[`${b}_collects`] = t?.collects || 0;
      row[`${b}_likeRate`] = t?.likeRate || 0; row[`${b}_commentRate`] = t?.commentRate || 0; row[`${b}_collectRate`] = t?.collectRate || 0;
      row[`${b}_notes`] = t?.notes || 0; row[`${b}_creators`] = t?.creators || 0; row[`${b}_cost`] = t?.cost || 0; row[`${b}_cpe`] = t?.cpe || 0;
    });
    return row;
  });

  // ========== UI 子组件 ==========
  const SingleMetricChart = ({ title, dataKey, rateKey, color, rateColor, avg }: any) => (
    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 mt-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-xs font-bold text-slate-700">{title}推移</h3>
        <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-1 rounded-md shadow-sm border border-slate-100">{title}{timeLabelText}数: {formatComma(avg)}</span>
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={overallStats.trends}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="timeLabel" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: color }} width={40} tickFormatter={formatNum} />
            {rateKey && <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: rateColor }} width={35} tickFormatter={(v)=>v+'%'}/>}
            <Tooltip formatter={(value: number, name: string) => name.includes('占比') ? value.toFixed(1)+'%' : formatComma(value)} contentStyle={{ borderRadius: '8px', border: 'none' }} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
            <ReferenceLine yAxisId="left" y={avg} stroke={color} strokeDasharray="3 3" opacity={0.5} label={{ position: 'insideTopLeft', value: `均值 ${formatComma(avg)}`, fill: color, fontSize: 10 }} />
            <Line yAxisId="left" type="monotone" name={`${title}量`} dataKey={dataKey} stroke={color} strokeWidth={3} dot={{ r: 3 }} />
            {rateKey && <Line yAxisId="right" type="monotone" name={`占互动比例`} dataKey={rateKey} stroke={rateColor} strokeWidth={2} dot={false} opacity={0.8} />}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  // 修改：竞品对比的单图组件（支持在内部调用时不显示外边框）
  const CompareMetricChart = ({ title, metricSuffix, isRate, isInner }: any) => (
    <div className={isInner ? "" : "bg-slate-50 rounded-xl p-4 border border-slate-100 mt-4"}>
      <h3 className="text-xs font-bold text-slate-700 mb-3">{title}推移</h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={compareTrends}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="timeLabel" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} width={40} tickFormatter={isRate ? (v)=>v+'%' : formatNum} />
            <Tooltip formatter={(value: number) => isRate ? value.toFixed(1)+'%' : formatComma(value)} contentStyle={{ borderRadius: '8px', border: 'none' }} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
            {activeBrands.map((b, i) => (
              <Line key={b} type="monotone" name={b} dataKey={`${b}_${metricSuffix}`} stroke={colors[i%colors.length]} strokeWidth={3} dot={{ r: 3 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  // 恢复：原版的直观竖向排行榜
  const Top3Ranking = ({ title, records, dataKey, icon, label }: any) => (
    <div className="flex-1 min-w-[250px] bg-white border border-slate-100 rounded-xl p-3 shadow-sm">
      <h4 className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-1.5 pb-2 border-b border-slate-50">{icon} {title} TOP3</h4>
      <div className="space-y-2">
        {records.map((r:any, i:number) => (
          <div key={i} className="flex gap-2 items-start p-2 rounded-lg bg-slate-50/50 hover:bg-slate-100 transition-colors border border-slate-100">
            <div className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center text-[10px] font-black mt-0.5 ${i===0?'bg-amber-100 text-amber-600':i===1?'bg-slate-200 text-slate-600':i===2?'bg-orange-100 text-orange-600':'bg-slate-50 text-slate-400'}`}>{i+1}</div>
            <div className="flex-1 min-w-0">
              <a href={r.noteLink && r.noteLink!=='未知'?r.noteLink:'#'} target="_blank" rel="noreferrer" className="text-[11px] font-bold text-indigo-600 hover:underline line-clamp-1">{r.title} <ExternalLink size={8} className="inline"/></a>
              <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-500">
                <span className="bg-white border border-slate-200 px-1 rounded shadow-sm">{r.noteType}</span>
                <a href={r.xhsUrl||'#'} target="_blank" rel="noreferrer" className="hover:text-indigo-500 font-bold truncate max-w-[80px]">{r.influencerName}</a>
                <span className="text-slate-300">|</span> <span>{r.influencerType} ({formatNum(r.followers)})</span>
              </div>
            </div>
            <div className="text-right flex-shrink-0 ml-1"><p className="text-xs font-black text-slate-800">{formatComma(r[dataKey])}</p><p className="text-[9px] text-slate-400">{label}</p></div>
          </div>
        ))}
      </div>
    </div>
  );

  const ContentDetailBlock = ({ stats, bName }: any) => {
    const [sort, setSort] = useState({ key: 'count', dir: 'desc' });
    const sortedTypes = useMemo(() => {
      return [...stats.types].sort((a, b) => sort.dir === 'asc' ? a[sort.key] - b[sort.key] : b[sort.key] - a[sort.key]);
    }, [stats.types, sort]);
    const thClass = "p-2 font-bold cursor-pointer hover:bg-slate-100 transition-colors select-none whitespace-nowrap";
    const handleSort = (k:string) => setSort({ key: k, dir: sort.key===k && sort.dir==='desc' ? 'asc' : 'desc' });

    return (
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-4">
        <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 border-l-4 border-indigo-500 pl-2">{bName} 内容深度剖析</h3>
        
        {/* 顶部总篇数和形式占比概要 */}
        <div className="flex gap-4 mb-2">
          <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm flex items-center gap-4 pr-6">
            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center"><FileText className="text-indigo-500" size={18}/></div>
            <div><p className="text-[10px] text-slate-500 mb-0.5">总笔记篇数</p><p className="text-xl font-black text-slate-800">{stats.notes}</p></div>
          </div>
          <div className="flex-1 bg-white rounded-xl p-3 border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center"><Clapperboard className="text-emerald-500" size={18}/></div>
            <div className="flex-1">
              <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1">
                <span>视频 {stats.videoCount}篇 ({stats.notes?Math.round((stats.videoCount/stats.notes)*100):0}%)</span>
                <span>图文 {stats.imageCount}篇 ({stats.notes?Math.round((stats.imageCount/stats.notes)*100):0}%)</span>
              </div>
              <div className="h-1.5 w-full flex rounded-full overflow-hidden">
                <div style={{ width: `${stats.notes?(stats.videoCount/stats.notes)*100:0}%` }} className="bg-emerald-400"></div>
                <div style={{ width: `${stats.notes?(stats.imageCount/stats.notes)*100:0}%` }} className="bg-indigo-300"></div>
              </div>
            </div>
          </div>
        </div>

        {/* 四大排行榜，恢复原版设计，采用 Grid 2x2 布局放在赛道上方 */}
        <div className="grid grid-cols-2 gap-4">
          <Top3Ranking title="互动最高" records={stats.topInt} dataKey="interactions" icon={<Zap size={14} className="text-indigo-500"/>} label="互动" />
          <Top3Ranking title="点赞最高" records={stats.topLikes} dataKey="likes" icon={<ThumbsUp size={14} className="text-rose-500"/>} label="点赞" />
          <Top3Ranking title="评论最高" records={stats.topComments} dataKey="comments" icon={<MessageCircle size={14} className="text-violet-500"/>} label="评论" />
          <Top3Ranking title="收藏最高" records={stats.topCollects} dataKey="collects" icon={<Star size={14} className="text-amber-500"/>} label="收藏" />
        </div>

        {/* 排序表格，新增点赞/评论/收藏排序列 */}
        <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 pt-2"><LayoutDashboard size={14} className="text-indigo-500"/> 赛道明细数据穿透</h4>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead className="bg-slate-50 border-b border-slate-100"><tr className="text-[11px] text-slate-500">
              <th className="p-3 font-bold">赛道名称</th>
              <th className={thClass} onClick={()=>handleSort('count')}><div className="flex items-center gap-1 hover:text-indigo-600">篇数 <ArrowUpDown size={10}/></div></th>
              <th className={thClass} onClick={()=>handleSort('interactions')}><div className="flex items-center gap-1 hover:text-indigo-600">总互动量 <ArrowUpDown size={10}/></div></th>
              <th className={`${thClass} text-indigo-600`} onClick={()=>handleSort('avgInt')}><div className="flex items-center gap-1">篇均互动量 <ArrowUpDown size={10}/></div></th>
              <th className={thClass} onClick={()=>handleSort('likes')}><div className="flex items-center gap-1 hover:text-indigo-600">点赞 <ArrowUpDown size={10}/></div></th>
              <th className={thClass} onClick={()=>handleSort('comments')}><div className="flex items-center gap-1 hover:text-indigo-600">评论 <ArrowUpDown size={10}/></div></th>
              <th className={thClass} onClick={()=>handleSort('collects')}><div className="flex items-center gap-1 hover:text-indigo-600">收藏 <ArrowUpDown size={10}/></div></th>
              <th className="p-2 font-bold">视频占比</th><th className="p-2 font-bold">图文占比</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-50">
              {sortedTypes.map((t:any, i:number) => (
                <tr key={i} className="hover:bg-slate-50 text-[11px] font-medium text-slate-700">
                  <td className="p-3">{t.name}</td><td className="p-3">{t.count}</td><td className="p-3">{formatComma(t.interactions)}</td><td className="p-3 text-indigo-600 font-bold">{formatComma(Math.round(t.avgInt))}</td>
                  <td className="p-3">{formatComma(t.likes)}</td><td className="p-3">{formatComma(t.comments)}</td><td className="p-3">{formatComma(t.collects)}</td>
                  <td className="p-2"><div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-indigo-400" style={{width:`${t.vPct}%`}}/></div> {t.vPct.toFixed(0)}%</td>
                  <td className="p-2"><div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-400" style={{width:`${t.iPct}%`}}/></div> {t.iPct.toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full bg-white rounded-2xl border border-slate-100 p-4 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-4 flex-shrink-0 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-6 bg-indigo-500 rounded-full"></div>
          <span className="text-lg font-black text-slate-800 tracking-wide truncate max-w-[200px]">{displayTitle}</span>
        </div>
        <div className="flex gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-100">
          <TabBtn active={activeTab==='overview'} onClick={()=>setActiveTab('overview')} icon={<LayoutDashboard size={14}/>} label="数据总览" />
          <TabBtn active={activeTab==='content'} onClick={()=>setActiveTab('content')} icon={<Clapperboard size={14}/>} label="内容分析" />
          <TabBtn active={activeTab==='creators'} onClick={()=>setActiveTab('creators')} icon={<Users size={14}/>} label="达人策略" />
          <TabBtn active={activeTab==='cost'} onClick={()=>setActiveTab('cost')} icon={<DollarSign size={14}/>} label="费用分析" />
          <TabBtn active={activeTab==='details'} onClick={()=>setActiveTab('details')} icon={<List size={14}/>} label="笔记明细" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scroll pr-2 space-y-2 pb-10">
        
        {/* ================= Tab 1: 数据总览 ================= */}
        {activeTab === 'overview' && (
          <div className="animate-fade-in">
            {analysisMode === 'single' ? (
              <>
                <div className="grid grid-cols-4 gap-3 mb-2">
                  <StatCard title="笔记总数" value={overallStats.notes} color="text-blue-500" bg="bg-blue-50" />
                  <StatCard title="总互动量" value={formatNum(overallStats.interactions)} color="text-indigo-500" bg="bg-indigo-50" />
                  <StatCard title="总花费" value={`¥${formatNum(overallStats.cost)}`} color="text-emerald-500" bg="bg-emerald-50" />
                  <StatCard title="CPE" value={`¥${overallStats.cpe.toFixed(2)}`} color="text-amber-500" bg="bg-amber-50" />
                </div>
                <SingleMetricChart title="篇数" dataKey="notes" rateKey={null} color="#3B82F6" rateColor="" avg={overallStats.avg.notes} />
                <SingleMetricChart title="互动" dataKey="interactions" rateKey={null} color="#6366F1" rateColor="" avg={overallStats.avg.interactions} />
                <SingleMetricChart title="点赞" dataKey="likes" rateKey="likeRate" color="#F43F5E" rateColor="#14B8A6" avg={overallStats.avg.likes} />
                <SingleMetricChart title="评论" dataKey="comments" rateKey="commentRate" color="#8B5CF6" rateColor="#14B8A6" avg={overallStats.avg.comments} />
                <SingleMetricChart title="收藏" dataKey="collects" rateKey="collectRate" color="#F59E0B" rateColor="#14B8A6" avg={overallStats.avg.collects} />
              </>
            ) : (
              <>
                <CompareMetricChart title="篇数" metricSuffix="notes" isRate={false} />
                <CompareMetricChart title="互动量" metricSuffix="int" isRate={false} />
                
                {/* 需求1: 竞对模式下，量与比例合并在一个大框里 */}
                <div className="bg-white border border-rose-100 rounded-xl p-4 mt-6 shadow-sm">
                  <h3 className="text-sm font-black text-slate-800 mb-2 border-l-4 border-rose-500 pl-2">点赞综合表现</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <CompareMetricChart title="点赞量" metricSuffix="likes" isRate={false} isInner={true} />
                    <CompareMetricChart title="点赞互动占比" metricSuffix="likeRate" isRate={true} isInner={true} />
                  </div>
                </div>

                <div className="bg-white border border-violet-100 rounded-xl p-4 mt-6 shadow-sm">
                  <h3 className="text-sm font-black text-slate-800 mb-2 border-l-4 border-violet-500 pl-2">评论综合表现</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <CompareMetricChart title="评论量" metricSuffix="comments" isRate={false} isInner={true} />
                    <CompareMetricChart title="评论互动占比" metricSuffix="commentRate" isRate={true} isInner={true} />
                  </div>
                </div>

                <div className="bg-white border border-amber-100 rounded-xl p-4 mt-6 shadow-sm">
                  <h3 className="text-sm font-black text-slate-800 mb-2 border-l-4 border-amber-500 pl-2">收藏综合表现</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <CompareMetricChart title="收藏量" metricSuffix="collects" isRate={false} isInner={true} />
                    <CompareMetricChart title="收藏互动占比" metricSuffix="collectRate" isRate={true} isInner={true} />
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ================= Tab 2: 内容分析 ================= */}
        {activeTab === 'content' && (
          <div className="space-y-6 animate-fade-in pt-2">
            {analysisMode === 'single' ? (
              <ContentDetailBlock stats={overallStats} bName="整体" />
            ) : (
              activeBrands.map(b => <ContentDetailBlock key={b} stats={compareStats[b]} bName={b} />)
            )}
          </div>
        )}

        {/* ================= Tab 3: 达人策略 ================= */}
        {activeTab === 'creators' && (
          <div className="space-y-6 animate-fade-in pt-2">
            {analysisMode === 'single' ? (
              <>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 shadow-sm text-center">
                    <p className="text-xs text-indigo-500 font-bold mb-1">合作达人总数 (去重)</p>
                    <p className="text-2xl font-black text-indigo-700">{overallStats.influencerCount} <span className="text-sm font-normal">人</span></p>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 shadow-sm text-center">
                    <p className="text-xs text-emerald-600 font-bold mb-1">预估总花费</p>
                    <p className="text-2xl font-black text-emerald-700">¥{formatComma(overallStats.cost)}</p>
                  </div>
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 shadow-sm text-center">
                    <p className="text-xs text-amber-600 font-bold mb-1">大盘人均合作费</p>
                    <p className="text-2xl font-black text-amber-700">¥{formatComma(overallStats.influencerCount?Math.round(overallStats.cost/overallStats.influencerCount):0)}</p>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                  <h3 className="text-xs font-bold text-slate-700 mb-4">👥 达人属性结构矩阵</h3>
                  <div className="grid gap-3">
                    {overallStats.creatorAttrs.map((attr, i) => (
                      <div key={i} className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                        <div className="w-[20%]"><span className="text-sm font-black text-indigo-700">{attr.name}</span></div>
                        <div className="flex-1 flex gap-6">
                          <div><p className="text-[10px] text-slate-400 mb-0.5">人数占比</p><p className="text-sm font-black text-slate-700">{attr.count}人 <span className="text-[10px] font-normal">({Math.round(attr.count/overallStats.notes*100)}%)</span></p></div>
                          <div><p className="text-[10px] text-slate-400 mb-0.5">费用占比</p><p className="text-sm font-black text-emerald-600">¥{formatNum(attr.cost)} <span className="text-[10px] font-normal">({Math.round(attr.cost/overallStats.cost*100)}%)</span></p></div>
                          <div><p className="text-[10px] text-slate-400 mb-0.5">该层级平均合作费</p><p className="text-sm font-black text-amber-600">¥{formatComma(Math.round(attr.avgCost))}/人</p></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {overallStats.repeatedCreators.length > 0 && (
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                    <h3 className="text-xs font-bold text-slate-700 mb-4 flex items-center gap-1.5"><Award size={14} className="text-rose-500" /> 高频复投达人明细清单</h3>
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-100"><tr className="text-[11px] text-slate-500">
                          <th className="p-3 w-1/5">达人名称</th><th className="p-3">复用次数</th><th className="p-3">达人属性</th><th className="p-3 w-1/2">复用笔记明细 (点击直达)</th>
                        </tr></thead>
                        <tbody className="divide-y divide-slate-50">
                          {overallStats.repeatedCreators.map((c:any, i:number) => (
                            <tr key={i} className="hover:bg-slate-50 text-[11px] text-slate-700 align-top">
                              <td className="p-3 font-bold text-slate-800">{c.name}</td>
                              <td className="p-3"><span className="bg-rose-100 text-rose-600 px-2 py-0.5 rounded font-black">{c.notes.length} 次</span></td>
                              <td className="p-3">{c.type} <br/><span className="text-slate-400 font-medium">{formatNum(c.followers)}粉</span></td>
                              <td className="p-3">
                                <ul className="space-y-1.5">
                                  {c.notes.map((n:any, idx:number)=>(
                                    <li key={idx}><a href={n.noteLink!=='未知'?n.noteLink:'#'} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline flex items-start gap-1 leading-relaxed"><ExternalLink size={10} className="mt-0.5 flex-shrink-0"/> {n.title}</a></li>
                                  ))}
                                </ul>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-6">
                <CompareMetricChart title="合作达人数" metricSuffix="creators" isRate={false} />
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
                  <table className="w-full text-left min-w-[600px]">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr><th className="p-3 text-xs font-bold text-slate-500">对比指标</th>{activeBrands.map(b=><th key={b} className="p-3 text-xs font-bold text-indigo-600">{b}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-[11px] text-slate-700">
                      <tr><td className="p-3 font-bold text-indigo-500">达人总数 (人, 去重)</td>{activeBrands.map(b=><td key={b} className="p-3 font-black text-indigo-600">{compareStats[b].influencerCount}</td>)}</tr>
                      <tr><td className="p-3 font-bold text-emerald-500">预估总花费 (¥)</td>{activeBrands.map(b=><td key={b} className="p-3 font-black text-emerald-600">{formatComma(compareStats[b].cost)}</td>)}</tr>
                      <tr><td className="p-3 font-bold text-amber-500">人均达人花费 (¥/人)</td>{activeBrands.map(b=><td key={b} className="p-3 font-bold text-amber-600">{formatComma(compareStats[b].influencerCount?Math.round(compareStats[b].cost/compareStats[b].influencerCount):0)}</td>)}</tr>
                      <tr className="bg-slate-50"><td colSpan={activeBrands.length+1} className="p-2 font-bold text-slate-400 text-center">—— 达人属性层级：人数分布 / 该层级平均费用 ——</td></tr>
                      {Array.from(new Set(activeBrands.flatMap(b => compareStats[b].creatorAttrs.map(a=>a.name)))).map((attrName:any, i) => (
                        <tr key={i}>
                          <td className="p-3 font-bold text-slate-600">{attrName}</td>
                          {activeBrands.map(b => {
                            const match = compareStats[b].creatorAttrs.find(a=>a.name===attrName);
                            return <td key={b} className="p-3">{match ? <span className="font-bold text-slate-700">{match.count}人 <span className="text-slate-400 font-normal">/ ¥{formatComma(Math.round(match.avgCost))}</span></span> : <span className="text-slate-300">-</span>}</td>
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= Tab 4: 费用分析 ================= */}
        {activeTab === 'cost' && (
          <div className="space-y-6 animate-fade-in pt-2">
            {analysisMode === 'single' ? (
              <>
                <div className="flex gap-4 mb-2">
                  <div className="flex-1 bg-white border border-slate-200 shadow-sm rounded-xl p-5 relative overflow-hidden">
                    <p className="text-xs text-slate-500 mb-2">总预估投放</p>
                    <p className="text-3xl font-black text-slate-800">¥{formatComma(overallStats.cost)}</p>
                    <p className="text-[11px] text-slate-400 mt-3">{overallStats.notes} 篇笔记</p>
                    <DollarSign className="absolute -right-4 -bottom-4 text-amber-50" size={100} strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 bg-white border border-slate-200 shadow-sm rounded-xl p-5 relative overflow-hidden">
                    <p className="text-xs text-slate-500 mb-2">单次互动成本 (CPE)</p>
                    <p className="text-3xl font-black text-slate-800">¥{overallStats.cpe.toFixed(2)}</p>
                    <p className="text-[11px] text-slate-400 mt-3">平均值</p>
                    <Zap className="absolute -right-4 -bottom-4 text-indigo-50" size={100} strokeWidth={1.5} />
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <h3 className="text-xs font-bold text-slate-700 mb-3">预估投放费用推移</h3>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={overallStats.trends}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="timeLabel" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#10B981' }} width={40} tickFormatter={(v)=>'¥'+formatNum(v)} />
                        <Tooltip formatter={(v:number)=>'¥'+formatComma(v)} contentStyle={{ borderRadius: '8px', border: 'none' }} />
                        <ReferenceLine y={overallStats.avg.cost} stroke="#10B981" strokeDasharray="3 3" label={{ position: 'insideTopLeft', value: `费用${timeLabelText}均值 ¥${formatComma(Math.round(overallStats.avg.cost))}`, fill: '#10B981', fontSize: 10 }} />
                        <Line type="monotone" name="预估费用" dataKey="cost" stroke="#10B981" strokeWidth={3} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <h3 className="text-xs font-bold text-slate-700 mb-3">单次互动成本 (CPE) 推移</h3>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={overallStats.trends}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="timeLabel" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#F59E0B' }} width={30} />
                        <Tooltip formatter={(v:number)=>'¥'+v.toFixed(2)} contentStyle={{ borderRadius: '8px', border: 'none' }} />
                        <ReferenceLine y={overallStats.avg.cpe} stroke="#F59E0B" strokeDasharray="3 3" label={{ position: 'insideTopLeft', value: `全局CPE均值 ¥${overallStats.avg.cpe.toFixed(2)}`, fill: '#F59E0B', fontSize: 10 }} />
                        <Line type="monotone" name="CPE" dataKey="cpe" stroke="#F59E0B" strokeWidth={3} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            ) : (
              <>
                <CompareMetricChart title="预估总花费" metricSuffix="cost" isRate={false} />
                <CompareMetricChart title="单次互动成本 (CPE)" metricSuffix="cpe" isRate={false} />
              </>
            )}
          </div>
        )}

        {/* ================= Tab 5: 笔记明细 ================= */}
        {activeTab === 'details' && (
          <div className="animate-fade-in space-y-6 pt-2">
            {analysisMode === 'single' ? (
               <div className="h-[600px]"><NotesTable records={overallStats.records} /></div>
            ) : (
               activeBrands.map(b => (
                 <div key={b} className="space-y-2">
                   <h3 className="text-sm font-black text-slate-800 border-l-4 border-indigo-500 pl-2">{b} 笔记明细</h3>
                   <div className="h-[400px]"><NotesTable records={compareStats[b].records} /></div>
                 </div>
               ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

function TabBtn({ active, onClick, icon, label }: any) { return (<button onClick={onClick} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${active ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{icon} {label}</button>); }
function StatCard({ title, value, color, bg }: any) { return (<div className={`${bg} rounded-xl p-3 border border-slate-100/50`}><p className="text-[11px] text-slate-500 mb-0.5">{title}</p><p className={`text-lg font-black ${color.replace('text-', 'text-').replace('500', '700')}`}>{value}</p></div>); }
