import React, { useMemo, useState } from 'react';
import { ParsedData, NoteRecord } from '../types';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, ReferenceLine, LabelList } from 'recharts';
import { LayoutDashboard, Users, Clapperboard, DollarSign, List, FileText, Zap, ThumbsUp, MessageCircle, Star, Share2, Award, ExternalLink } from 'lucide-react';
import { NotesTable } from './NotesTable';

interface Props { data: ParsedData; selectedCommercial: string; selectedBrands: string[]; selectedMonths: string[]; analysisMode: 'single' | 'compare'; }

const formatNum = (n: number) => n >= 10000 ? (n / 10000).toFixed(1) + 'w' : n.toLocaleString();
const formatComma = (n: number) => Number(n).toLocaleString();
const getTop3 = (arr: any[], key: string) => [...arr].sort((a, b) => b[key] - a[key]).slice(0, 3);

// 核心算力：独立计算某一批数据的统计值
function computeStats(records: NoteRecord[], timeUnit: string) {
  let cost=0, interactions=0, likes=0, comments=0, collects=0, shares=0, videoCount=0, imageCount=0;
  const trendMap = new Map();
  const typeMap = new Map();
  const creatorAttrMap = new Map();
  const creatorsSet = new Set();

  records.forEach(r => {
    cost += r.estimatedCost; interactions += r.interactions; likes += r.likes; comments += r.comments; collects += r.collects; shares += r.shares;
    r.noteForm.includes('视频') ? videoCount++ : imageCount++;
    creatorsSet.add(r.influencerId);

    const t = (r as any)[timeUnit];
    if (t && t !== '未知') {
      const ex = trendMap.get(t) || { time: t, notes: 0, interactions: 0, likes: 0, comments: 0, collects: 0, cost: 0, creators: new Set() };
      ex.notes++; ex.interactions += r.interactions; ex.likes += r.likes; ex.comments += r.comments; ex.collects += r.collects; ex.cost += r.estimatedCost; ex.creators.add(r.influencerId);
      trendMap.set(t, ex);
    }

    const nType = r.noteType || '未知';
    const ext = typeMap.get(nType) || { name: nType, count: 0, interactions: 0, vCount: 0, iCount: 0 };
    ext.count++; ext.interactions += r.interactions; r.noteForm.includes('视频') ? ext.vCount++ : ext.iCount++;
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
    ...v, avgInt: v.interactions / v.count, vPct: (v.vCount/v.count)*100, iPct: (v.iCount/v.count)*100
  })).sort((a, b) => b.count - a.count);

  const creatorAttrs = Array.from(creatorAttrMap.values()).map(v => ({ ...v, avgCost: v.cost / v.count })).sort((a,b)=>b.count-a.count);

  const avg = {
    interactions: trends.length ? Math.round(trends.reduce((s,t)=>s+t.interactions,0)/trends.length) : 0,
    likes: trends.length ? Math.round(trends.reduce((s,t)=>s+t.likes,0)/trends.length) : 0,
    comments: trends.length ? Math.round(trends.reduce((s,t)=>s+t.comments,0)/trends.length) : 0,
    collects: trends.length ? Math.round(trends.reduce((s,t)=>s+t.collects,0)/trends.length) : 0,
    cpe: trends.length ? (trends.reduce((s,t)=>s+t.cpe,0)/trends.length) : 0,
  };

  return { 
    records, notes, interactions, likes, comments, collects, shares, cost, cpe, 
    videoCount, imageCount, influencerCount: creatorsSet.size, 
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
    
    // 单品牌模式：根据下拉筛选合并
    let singleRecords = validRecords;
    if (analysisMode === 'single' && selectedBrands.length > 0) singleRecords = validRecords.filter(r => selectedBrands.includes(r.reportedBrand));
    const os = computeStats(singleRecords, tu);

    // 对比模式：提取每个品牌
    const ab = analysisMode === 'compare' ? (selectedBrands.length > 0 ? selectedBrands : data.brands) : [];
    const cs: Record<string, ReturnType<typeof computeStats>> = {};
    ab.forEach(b => cs[b] = computeStats(validRecords.filter(r => r.reportedBrand === b), tu));

    const tl = Array.from(new Set(validRecords.map(r => tu === 'date' ? r.date.slice(5) : r.month))).sort();
    return { overallStats: os, compareStats: cs, timeUnit: tu, allTimeLabels: tl, activeBrands: ab };
  }, [data.records, selectedCommercial, selectedBrands, selectedMonths, analysisMode]);

  if (data.totalNotes === 0) return <div className="h-full bg-white rounded-2xl flex justify-center items-center text-slate-400 font-bold">请先上传数据文件</div>;
  if (analysisMode === 'compare' && activeBrands.length === 0) return <div className="h-full bg-white rounded-2xl flex justify-center items-center text-slate-400 font-bold">请在上方勾选需要对比的品牌</div>;

  const isDaily = timeUnit === 'date';
  const displayTitle = analysisMode === 'single' ? (selectedBrands.length === 1 ? selectedBrands[0] : (selectedBrands.length===0?'全部品牌概览':'聚合品牌概览')) : '竞品对比模式';
  const colors = ['#6366F1', '#14B8A6', '#F59E0B', '#EC4899', '#8B5CF6'];

  // 构造对比统一趋势表
  const compareTrends = allTimeLabels.map(time => {
    const row: any = { timeLabel: time };
    activeBrands.forEach(b => {
      const t = compareStats[b].trends.find(x => x.timeLabel === time);
      row[`${b}_int`] = t?.interactions || 0; row[`${b}_likes`] = t?.likes || 0; row[`${b}_comments`] = t?.comments || 0; row[`${b}_collects`] = t?.collects || 0;
      row[`${b}_notes`] = t?.notes || 0; row[`${b}_creators`] = t?.creators || 0; row[`${b}_cost`] = t?.cost || 0; row[`${b}_cpe`] = t?.cpe || 0;
    });
    return row;
  });

  // ========== UI 组件区 ==========
  const SingleMetricChart = ({ title, dataKey, rateKey, color, avg }: any) => (
    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-xs font-bold text-slate-700">{title}推移</h3>
        <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-1 rounded-md shadow-sm border border-slate-100">日均: {formatComma(avg)}</span>
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={overallStats.trends}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="timeLabel" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: color }} width={40} tickFormatter={formatNum} />
            {rateKey && <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#F59E0B' }} width={30} tickFormatter={(v)=>v+'%'}/>}
            <Tooltip formatter={(value: number, name: string) => name.includes('占比') ? value.toFixed(1)+'%' : formatComma(value)} contentStyle={{ borderRadius: '8px', border: 'none' }} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
            <ReferenceLine yAxisId="left" y={avg} stroke={color} strokeDasharray="3 3" opacity={0.5} />
            <Line yAxisId="left" type="monotone" name={`${title}量`} dataKey={dataKey} stroke={color} strokeWidth={3} dot={{ r: 3 }} />
            {rateKey && <Line yAxisId="right" type="monotone" name={`占互动比例`} dataKey={rateKey} stroke="#F59E0B" strokeWidth={2} dot={false} opacity={0.8} />}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const CompareMetricChart = ({ title, metricSuffix }: any) => (
    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
      <h3 className="text-xs font-bold text-slate-700 mb-3">{title}对比推移</h3>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={compareTrends}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="timeLabel" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} width={40} tickFormatter={formatNum} />
            <Tooltip formatter={(value: number) => formatComma(value)} contentStyle={{ borderRadius: '8px', border: 'none' }} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
            {activeBrands.map((b, i) => (
              <Line key={b} type="monotone" name={b} dataKey={`${b}_${metricSuffix}`} stroke={colors[i%colors.length]} strokeWidth={3} dot={{ r: 3 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const Top3Ranking = ({ title, records, dataKey, icon, label }: any) => (
    <div className="flex-1 min-w-[300px] bg-white border border-slate-100 rounded-xl p-3 shadow-sm">
      <h4 className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-1.5 pb-2 border-b border-slate-50">{icon} {title} TOP3</h4>
      <div className="space-y-2">
        {records.map((r:any, i:number) => (
          <div key={i} className="flex gap-2 items-start p-2 rounded-lg hover:bg-slate-50 transition-colors">
            <div className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center text-[10px] font-black ${i===0?'bg-amber-100 text-amber-600':i===1?'bg-slate-200 text-slate-600':i===2?'bg-orange-100 text-orange-600':'bg-slate-50 text-slate-400'}`}>{i+1}</div>
            <div className="flex-1 min-w-0">
              <a href={r.noteLink!=='未知'?r.noteLink:'#'} target="_blank" rel="noreferrer" className="text-[11px] font-bold text-indigo-600 hover:underline line-clamp-1 flex items-center gap-1">{r.title} <ExternalLink size={8}/></a>
              <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-500">
                <span className="bg-slate-100 px-1 rounded">{r.noteType}</span>
                <a href={r.xhsUrl||'#'} target="_blank" rel="noreferrer" className="hover:text-indigo-500 font-medium truncate">{r.influencerName}</a>
                <span className="text-slate-300">|</span> <span>{r.influencerType} ({formatNum(r.followers)}粉)</span>
              </div>
            </div>
            <div className="text-right flex-shrink-0"><p className="text-xs font-black text-slate-800">{formatComma(r[dataKey])}</p><p className="text-[9px] text-slate-400">{label}</p></div>
          </div>
        ))}
      </div>
    </div>
  );

  const ContentDetailBlock = ({ stats, bName }: any) => (
    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-4">
      <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 border-l-4 border-indigo-500 pl-2">{bName} 内容赛道剖析</h3>
      
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100"><tr className="text-[11px] text-slate-500">
            <th className="p-3">赛道名称</th><th className="p-3">篇数</th><th className="p-3">总互动量</th><th className="p-3 text-indigo-600">篇均互动量</th><th className="p-3">视频占比</th><th className="p-3">图文占比</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-50">
            {stats.types.map((t:any, i:number) => (
              <tr key={i} className="hover:bg-slate-50 text-[11px] font-medium text-slate-700">
                <td className="p-3">{t.name}</td><td className="p-3">{t.count}</td><td className="p-3">{formatComma(t.interactions)}</td><td className="p-3 text-indigo-600 font-bold">{formatComma(Math.round(t.avgInt))}</td>
                <td className="p-3"><div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-indigo-400" style={{width:`${t.vPct}%`}}/></div> {t.vPct.toFixed(0)}%</td>
                <td className="p-3"><div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-400" style={{width:`${t.iPct}%`}}/></div> {t.iPct.toFixed(0)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-4">
        <Top3Ranking title="互动量" records={stats.topInt} dataKey="interactions" icon={<Zap size={14} className="text-indigo-500"/>} label="互动" />
        <Top3Ranking title="点赞量" records={stats.topLikes} dataKey="likes" icon={<ThumbsUp size={14} className="text-rose-500"/>} label="点赞" />
        <Top3Ranking title="评论量" records={stats.topComments} dataKey="comments" icon={<MessageCircle size={14} className="text-violet-500"/>} label="评论" />
        <Top3Ranking title="收藏量" records={stats.topCollects} dataKey="collects" icon={<Star size={14} className="text-amber-500"/>} label="收藏" />
      </div>
    </div>
  );

  return (
    <div className="h-full bg-white rounded-2xl border border-slate-100 p-4 flex flex-col overflow-hidden">
      {/* 头部布局修改：突出显示当前品牌，按钮左对齐 */}
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

      <div className="flex-1 overflow-y-auto custom-scroll pr-2 space-y-6 pb-10">
        
        {/* ================= Tab 1: 数据总览 ================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fade-in">
            {analysisMode === 'single' ? (
              <>
                <div className="grid grid-cols-4 gap-3">
                  <StatCard title="笔记总数" value={overallStats.notes} color="text-blue-500" bg="bg-blue-50" />
                  <StatCard title="总互动量" value={formatNum(overallStats.interactions)} color="text-indigo-500" bg="bg-indigo-50" />
                  <StatCard title="总花费" value={`¥${formatNum(overallStats.cost)}`} color="text-emerald-500" bg="bg-emerald-50" />
                  <StatCard title="CPE" value={`¥${overallStats.cpe.toFixed(2)}`} color="text-amber-500" bg="bg-amber-50" />
                </div>
                {/* 需求1：拆分四大指标双轴图，均附带虚线与侧边均值 */}
                <SingleMetricChart title="互动" dataKey="interactions" rateKey={null} color="#6366F1" avg={overallStats.avg.interactions} />
                <SingleMetricChart title="点赞" dataKey="likes" rateKey="likeRate" color="#F43F5E" avg={overallStats.avg.likes} />
                <SingleMetricChart title="评论" dataKey="comments" rateKey="commentRate" color="#8B5CF6" avg={overallStats.avg.comments} />
                <SingleMetricChart title="收藏" dataKey="collects" rateKey="collectRate" color="#F59E0B" avg={overallStats.avg.collects} />
              </>
            ) : (
              <>
                {/* 竞品对比模式图表 */}
                <CompareMetricChart title="互动量" metricSuffix="int" />
                <CompareMetricChart title="点赞量" metricSuffix="likes" />
                <CompareMetricChart title="评论量" metricSuffix="comments" />
                <CompareMetricChart title="收藏量" metricSuffix="collects" />
              </>
            )}
          </div>
        )}

        {/* ================= Tab 2: 内容分析 ================= */}
        {activeTab === 'content' && (
          <div className="space-y-6 animate-fade-in">
            {analysisMode === 'single' ? (
              <ContentDetailBlock stats={overallStats} bName="整体" />
            ) : (
              activeBrands.map(b => <ContentDetailBlock key={b} stats={compareStats[b]} bName={b} />)
            )}
          </div>
        )}

        {/* ================= Tab 3: 达人策略 ================= */}
        {activeTab === 'creators' && (
          <div className="space-y-6 animate-fade-in">
            {analysisMode === 'single' ? (
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                <h3 className="text-xs font-bold text-slate-700 mb-4 flex items-center gap-1.5">👥 达人结构矩阵</h3>
                <div className="grid gap-3">
                  {overallStats.creatorAttrs.map((attr, i) => (
                    <div key={i} className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                      <div className="w-[20%]"><span className="text-sm font-black text-indigo-700">{attr.name}</span></div>
                      <div className="flex-1 flex gap-6">
                        {/* 修改：占比与数量左移 */}
                        <div><p className="text-[10px] text-slate-400 mb-0.5">人数占比</p><p className="text-sm font-black text-slate-700">{attr.count}人 <span className="text-[10px] font-normal">({Math.round(attr.count/overallStats.notes*100)}%)</span></p></div>
                        <div><p className="text-[10px] text-slate-400 mb-0.5">费用占比</p><p className="text-sm font-black text-emerald-600">¥{formatNum(attr.cost)} <span className="text-[10px] font-normal">({Math.round(attr.cost/overallStats.cost*100)}%)</span></p></div>
                        {/* 修改：新增平均费用指标 */}
                        <div><p className="text-[10px] text-slate-400 mb-0.5">该层级平均合作费</p><p className="text-sm font-black text-amber-600">¥{formatComma(Math.round(attr.avgCost))}/人</p></div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6"><SingleMetricChart title="合作达人数" dataKey="creators" color="#8B5CF6" avg={overallStats.avg.interactions/*这里仅借用组件，avg略过*/} /></div>
              </div>
            ) : (
              <div className="space-y-6">
                <CompareMetricChart title="合作达人数" metricSuffix="creators" />
                
                {/* 需求5：达人总数对比表格 */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr><th className="p-3 text-xs font-bold text-slate-500">对比指标</th>{activeBrands.map(b=><th key={b} className="p-3 text-xs font-bold text-indigo-600">{b}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-[11px] text-slate-700">
                      <tr><td className="p-3 font-bold">达人总数 (人)</td>{activeBrands.map(b=><td key={b} className="p-3 font-black">{compareStats[b].influencerCount}</td>)}</tr>
                      <tr><td className="p-3 font-bold">预估总花费 (¥)</td>{activeBrands.map(b=><td key={b} className="p-3">{formatComma(compareStats[b].cost)}</td>)}</tr>
                      <tr className="bg-slate-50"><td colSpan={activeBrands.length+1} className="p-2 font-bold text-slate-400">达人属性结构详情 (人数 / 平均费用)</td></tr>
                      {/* 取所有出现过的达人属性 */}
                      {Array.from(new Set(activeBrands.flatMap(b => compareStats[b].creatorAttrs.map(a=>a.name)))).map((attrName:any, i) => (
                        <tr key={i}>
                          <td className="p-3">{attrName}</td>
                          {activeBrands.map(b => {
                            const match = compareStats[b].creatorAttrs.find(a=>a.name===attrName);
                            return <td key={b} className="p-3">{match ? <span className="font-bold">{match.count}人 <span className="text-emerald-600 font-normal">/ ¥{formatComma(Math.round(match.avgCost))}</span></span> : '-'}</td>
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
          <div className="space-y-6 animate-fade-in">
            {analysisMode === 'single' ? (
              <>
                <SingleMetricChart title="预估投放费用" dataKey="cost" color="#10B981" avg={overallStats.cost/(overallStats.trends.length||1)} />
                {/* 需求4：包含平均 CPE 虚线的 CPE 推移图 */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 mt-6">
                  <h3 className="text-xs font-bold text-slate-700 mb-3">单次互动成本 (CPE) 推移</h3>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={overallStats.trends}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="timeLabel" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#F59E0B' }} width={30} />
                        <Tooltip formatter={(v:number)=>'¥'+v.toFixed(2)} contentStyle={{ borderRadius: '8px', border: 'none' }} />
                        <ReferenceLine y={overallStats.avg.cpe} stroke="#F59E0B" strokeDasharray="3 3" label={{ position: 'top', value: `均值 ¥${overallStats.avg.cpe.toFixed(2)}`, fill: '#F59E0B', fontSize: 10 }} />
                        <Line type="monotone" name="CPE" dataKey="cpe" stroke="#F59E0B" strokeWidth={3} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            ) : (
              <>
                <CompareMetricChart title="预估总花费" metricSuffix="cost" />
                <CompareMetricChart title="单次互动成本 (CPE)" metricSuffix="cpe" />
              </>
            )}
          </div>
        )}

        {/* ================= Tab 5: 笔记明细 ================= */}
        {activeTab === 'details' && (
          <div className="animate-fade-in space-y-6">
            {analysisMode === 'single' ? (
               <div className="h-[600px]"><NotesTable records={overallStats.records} /></div>
            ) : (
               activeBrands.map(b => (
                 <div key={b} className="space-y-2">
                   <h3 className="text-sm font-black text-slate-800 border-l-4 border-indigo-500 pl-2">{b} 明细数据</h3>
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
