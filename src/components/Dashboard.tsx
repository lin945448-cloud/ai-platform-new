import React, { useMemo, useState } from 'react';
import { ParsedData, NoteRecord } from '../types';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, LabelList, ReferenceLine } from 'recharts';
import { Users, FileText, Zap, DollarSign, LayoutDashboard, List, Clapperboard, Award, ExternalLink, Repeat, HelpCircle, Trophy, ThumbsUp, MessageCircle, Star, Sparkles } from 'lucide-react';
import { NotesTable } from './NotesTable';

interface Props { 
  data: ParsedData; 
  selectedCommercial: string; 
  selectedBrands: string[]; 
  selectedMonths: string[]; 
  analysisMode: 'single' | 'compare';
}

export const Dashboard: React.FC<Props> = ({ data, selectedCommercial, selectedBrands, selectedMonths, analysisMode }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'content' | 'creators' | 'cost' | 'details'>('overview');

  // 当前生效的品牌列表
  const activeBrands = useMemo(() => {
    if (selectedBrands.length > 0) return selectedBrands;
    return data.brands.length > 0 ? [data.brands[0]] : [];
  }, [selectedBrands, data.brands]);

  // 数据过滤核心逻辑
  const filteredRecords = useMemo(() => {
    return data.records.filter(r => {
      const isCom = (r as any).isCommercial;
      const matchCom = selectedCommercial === '全部' || isCom === selectedCommercial;
      const matchBrand = analysisMode === 'single' 
        ? (activeBrands.includes(r.reportedBrand))
        : (selectedBrands.length === 0 || selectedBrands.includes(r.reportedBrand));
      const matchMonth = selectedMonths.length === 0 || selectedMonths.includes(r.month);
      return matchCom && matchBrand && matchMonth;
    });
  }, [data.records, selectedCommercial, selectedBrands, selectedMonths, analysisMode, activeBrands]);

  // 1. 各个品牌单独拆分出来的基础统计 (对比分析模式核心依赖)
  const brandStatsMap = useMemo(() => {
    const map = new Map<string, any>();
    data.brands.forEach(brand => {
      const bRecords = data.records.filter(r => {
        const isCom = (r as any).isCommercial;
        const matchCom = selectedCommercial === '全部' || isCom === selectedCommercial;
        const matchMonth = selectedMonths.length === 0 || selectedMonths.includes(r.month);
        return r.reportedBrand === brand && matchCom && matchMonth;
      });

      if (bRecords.length === 0) return;

      const totalCost = bRecords.reduce((s, r) => s + r.estimatedCost, 0);
      const totalInt = bRecords.reduce((s, r) => s + r.interactions, 0);
      const totalLikes = bRecords.reduce((s, r) => s + r.likes, 0);
      const totalCom = bRecords.reduce((s, r) => s + r.comments, 0);
      const totalCol = bRecords.reduce((s, r) => s + r.collects, 0);
      const totalShare = bRecords.reduce((s, r) => s + r.shares, 0);
      
      const uCreators = Array.from(new Map(bRecords.map(r => [r.influencerId, r])).values());
      const totalFollowers = uCreators.reduce((s, r) => s + r.followers, 0);

      // 计算指标
      const avgCost = uCreators.length > 0 ? (totalCost / uCreators.length).toFixed(0) : '0';
      const cpe = totalInt > 0 ? (totalCost / totalInt).toFixed(2) : '0.00';
      const cpf = totalFollowers > 0 ? (totalCost / totalFollowers).toFixed(2) : '0.00';

      // 赛道明细计算
      const tracksMap = new Map<string, any>();
      bRecords.forEach(r => {
        const type = r.noteType || '未知赛道';
        const curr = tracksMap.get(type) || { name: type, count: 0, interactions: 0, video: 0, image: 0 };
        curr.count += 1;
        curr.interactions += r.interactions;
        if (r.noteForm.includes('视频')) curr.video += 1; else curr.image += 1;
        tracksMap.set(type, curr);
      });
      const trackDetails = Array.from(tracksMap.values()).map(t => ({
        ...t,
        avgInt: Math.round(t.interactions / t.count),
        videoPct: Math.round((t.video / t.count) * 100),
        imagePct: Math.round((t.image / t.count) * 100),
      })).sort((a,b) => b.interactions - a.interactions);

      // 排行榜前3名
      const topInteractions = [...bRecords].sort((a,b) => b.interactions - a.interactions).slice(0, 3);
      const topLikes = [...bRecords].sort((a,b) => b.likes - a.likes).slice(0, 3);
      const topComments = [...bRecords].sort((a,b) => b.comments - a.comments).slice(0, 3);
      const topCollects = [...bRecords].sort((a,b) => b.collects - a.collects).slice(0, 3);

      // 月度趋势
      const monthMap = new Map<string, number>();
      bRecords.forEach(r => {
        monthMap.set(r.month, (monthMap.get(r.month) || 0) + r.interactions);
      });

      map.set(brand, {
        records: bRecords,
        notesCount: bRecords.length,
        totalCost,
        totalInt,
        totalLikes,
        totalCom,
        totalCol,
        totalShare,
        cpe,
        cpf,
        creatorsCount: uCreators.length,
        avgCost,
        trackDetails,
        topInteractions,
        topLikes,
        topComments,
        topCollects,
        monthMap
      });
    });
    return map;
  }, [data.records, data.brands, selectedCommercial, selectedMonths]);

  // 全局/过滤合并指标统计
  const stats = useMemo(() => {
    const notes = filteredRecords.length;
    const interactions = filteredRecords.reduce((s, r) => s + r.interactions, 0);
    const cost = filteredRecords.reduce((s, r) => s + r.estimatedCost, 0);
    const likes = filteredRecords.reduce((s, r) => s + r.likes, 0);
    const comments = filteredRecords.reduce((s, r) => s + r.comments, 0);
    const collects = filteredRecords.reduce((s, r) => s + r.collects, 0);
    const shares = filteredRecords.reduce((s, r) => s + r.shares, 0);
    const cpe = interactions > 0 ? (cost / interactions).toFixed(2) : '0.00';
    const influencerCount = new Set(filteredRecords.map(r => r.influencerId)).size;

    // 平均值
    const avgLikes = notes > 0 ? Math.round(likes / notes) : 0;
    const avgComments = notes > 0 ? Math.round(comments / notes) : 0;
    const avgCollects = notes > 0 ? Math.round(collects / notes) : 0;
    const avgInteractions = notes > 0 ? Math.round(interactions / notes) : 0;

    const timeUnit = selectedMonths.length === 1 ? 'date' : 'month';
    const trendMap = new Map();
    let videoCount = 0; let imageCount = 0;
    const creatorNotesMap = new Map<string, { count: number; name: string; type: string; followers: number; xhsUrl: string; brand: string }>();

    filteredRecords.forEach(r => {
      if (r.noteForm.includes('视频')) videoCount++; else imageCount++;

      const cInfo = creatorNotesMap.get(r.influencerId) || { count: 0, name: r.influencerName, type: r.influencerType, followers: r.followers, xhsUrl: (r as any).xhsUrl, brand: r.reportedBrand };
      cInfo.count += 1;
      creatorNotesMap.set(r.influencerId, cInfo);

      const t = r[timeUnit];
      if (t && t !== '未知') {
        const ex = trendMap.get(t) || { time: t, notes: 0, interactions: 0, likes: 0, comments: 0, collects: 0, cost: 0, brandsMap: new Map() };
        ex.notes += 1; 
        ex.interactions += r.interactions; 
        ex.likes += r.likes;
        ex.comments += r.comments;
        ex.collects += r.collects;
        ex.cost += r.estimatedCost;
        
        // 记录不同品牌的互动，画竞品对比图时用
        ex.brandsMap.set(r.reportedBrand, (ex.brandsMap.get(r.reportedBrand) || 0) + r.interactions);
        trendMap.set(t, ex);
      }
    });

    const repeatedCreators = Array.from(creatorNotesMap.values()).filter(c => c.count > 1).sort((a, b) => b.count - a.count);

    // 格式化图表趋势数据
    const trends = Array.from(trendMap.values()).map(v => {
      const brandData: any = {};
      v.brandsMap.forEach((val: number, key: string) => {
        brandData[`int_${key}`] = val; // int_Tempo得宝: 1234
      });

      return { 
        ...v, 
        timeLabel: timeUnit === 'date' ? v.time.slice(5) : v.time,
        // 各项指标占互动量的百分比折线
        likesRatio: v.interactions > 0 ? Number(((v.likes / v.interactions) * 100).toFixed(1)) : 0,
        commentsRatio: v.interactions > 0 ? Number(((v.comments / v.interactions) * 100).toFixed(1)) : 0,
        collectsRatio: v.interactions > 0 ? Number(((v.collects / v.interactions) * 100).toFixed(1)) : 0,
        cpe: v.interactions > 0 ? Number((v.cost / v.interactions).toFixed(2)) : 0,
        ...brandData
      };
    }).sort((a, b) => a.time.localeCompare(b.time));

    // 达人属性
    const creatorAttrMap = new Map();
    filteredRecords.forEach(r => {
      const attr = r.influencerType || '未知属性';
      const exa = creatorAttrMap.get(attr) || { name: attr, count: 0, cost: 0, uCreators: new Set() };
      exa.count += 1;
      exa.cost += r.estimatedCost;
      exa.uCreators.add(r.influencerId);
      creatorAttrMap.set(attr, exa);
    });

    const creatorAttrs = Array.from(creatorAttrMap.values()).map(v => {
      const totalBrandCost = filteredRecords.reduce((s, r) => s + r.estimatedCost, 0);
      const totalBrandNotes = filteredRecords.length;
      return {
        name: v.name,
        count: v.count,
        cost: v.cost,
        uCount: v.uCreators.size,
        avgCost: v.uCreators.size > 0 ? Math.round(v.cost / v.uCreators.size) : 0,
        notePct: totalBrandNotes > 0 ? Math.round((v.count / totalBrandNotes) * 100) : 0,
        costPct: totalBrandCost > 0 ? Math.round((v.cost / totalBrandCost) * 100) : 0,
      };
    }).sort((a, b) => b.count - a.count);

    return { 
      notes, interactions, cost, cpe, likes, comments, collects, shares, influencerCount, 
      repeatedCreators, trends, creatorAttrs, videoCount, imageCount,
      videoPct: notes > 0 ? Math.round((videoCount / notes) * 100) : 0, 
      imagePct: notes > 0 ? Math.round((imageCount / notes) * 100) : 0, 
      isDaily: timeUnit === 'date',
      avgLikes, avgComments, avgCollects, avgInteractions
    };
  }, [filteredRecords, selectedMonths]);

  if (data.totalNotes === 0) return <div className="h-full bg-white rounded-2xl flex justify-center items-center text-slate-400 font-bold">请先上传数据文件</div>;

  const formatNum = (n: number) => n >= 10000 ? (n / 10000).toFixed(1) + 'w' : n.toLocaleString();
  const formatComma = (n: number) => Number(n).toLocaleString();

  // 辅助渲染前3排行榜组件
  const renderTop3List = (list: NoteRecord[], titleName: string, metricKey: 'interactions' | 'likes' | 'comments' | 'collects', metricName: string) => {
    return (
      <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm space-y-2.5">
        <h4 className="text-xs font-black text-slate-800 flex items-center gap-1">
          <Trophy size={14} className="text-amber-500" /> {titleName}排行榜
        </h4>
        {list.map((note, i) => {
          const xhsUrl = (note as any).xhsUrl;
          return (
            <div key={i} className="flex items-start justify-between gap-2 p-2 hover:bg-slate-50 rounded-lg transition-colors border-b border-dashed border-slate-100 last:border-0">
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className={`w-4 h-4 rounded text-[10px] font-black flex items-center justify-center ${i===0?'bg-amber-100 text-amber-600':i===1?'bg-slate-100 text-slate-500':'bg-orange-50 text-orange-600'}`}>{i+1}</span>
                  <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-1.5 rounded">{note.noteType}</span>
                </div>
                {note.noteLink ? (
                  <a href={note.noteLink} target="_blank" rel="noreferrer" className="text-xs font-bold text-slate-700 hover:text-indigo-600 line-clamp-1 block leading-tight">{note.title}</a>
                ) : (
                  <p className="text-xs font-bold text-slate-700 line-clamp-1 leading-tight">{note.title}</p>
                )}
                <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium truncate">
                  {xhsUrl ? (
                    <a href={xhsUrl} target="_blank" rel="noreferrer" className="text-indigo-500 hover:underline font-bold">{note.influencerName}</a>
                  ) : (
                    <span>{note.influencerName}</span>
                  )}
                  <span>·</span><span>{note.influencerType}</span><span>·</span><span>{formatNum(note.followers)}粉</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs font-black text-indigo-600">{formatComma(note[metricKey])}</p>
                <p className="text-[9px] text-slate-400 font-bold">{metricName}</p>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="h-full bg-white rounded-2xl border border-slate-100 p-4 flex flex-col overflow-hidden relative">
      {/* 5大板块 TabBar */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0 border-b border-slate-100 pb-2">
        <div className="flex gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100">
          <TabBtn active={activeTab==='overview'} onClick={()=>setActiveTab('overview')} icon={<LayoutDashboard size={14}/>} label="数据总览" />
          <TabBtn active={activeTab==='content'} onClick={()=>setActiveTab('content')} icon={<Clapperboard size={14}/>} label="内容分析" />
          <TabBtn active={activeTab==='creators'} onClick={()=>setActiveTab('creators')} icon={<Users size={14}/>} label="达人策略" />
          <TabBtn active={activeTab==='cost'} onClick={()=>setActiveTab('cost')} icon={<DollarSign size={14}/>} label="费用分析" />
          <TabBtn active={activeTab==='details'} onClick={()=>setActiveTab('details')} icon={<List size={14}/>} label="笔记明细" />
        </div>
        {/* 单个分析模式下左上角/顶端放大显示所选品牌 */}
        {analysisMode === 'single' && (
          <div className="flex items-center gap-1.5 bg-indigo-50/70 border border-indigo-100 px-3 py-1.5 rounded-xl">
            <span className="text-[10px] uppercase font-extrabold text-indigo-500 tracking-wider">当前聚焦品牌</span>
            <div className="h-2.5 w-px bg-indigo-200"></div>
            <span className="text-xs font-black text-indigo-700">{activeBrands[0] || '默认全局'}</span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scroll pr-1 space-y-6 pb-10">
        
        {/* ================= Tab 1: 数据总览 ================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-4 gap-3">
              <StatCard icon={<FileText/>} title="笔记总数" value={stats.notes} color="text-blue-500" bg="bg-blue-50" />
              <StatCard icon={<Zap/>} title="总互动量" value={formatNum(stats.interactions)} color="text-indigo-500" bg="bg-indigo-50" />
              <StatCard icon={<DollarSign/>} title="总预估花费" value={`¥${formatNum(stats.cost)}`} color="text-emerald-500" bg="bg-emerald-50" />
              <StatCard icon={<Users/>} title="单互动成本(CPE)" value={`¥${stats.cpe}`} color="text-amber-500" bg="bg-amber-50" />
            </div>

            {analysisMode === 'single' ? (
              // =================【单个分析模式】折线图集群 =================
              <div className="space-y-6">
                {/* 1. 互动量推移图 (单轴) */}
                <ChartBox title="互动推移趋势" iconText={`${activeBrands[0]} 篇均互动量: ${stats.avgInteractions}次`}>
                  <LineChart data={stats.trends}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="timeLabel" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} tickFormatter={formatNum} />
                    <Tooltip formatter={(value: number) => formatComma(value)} contentStyle={{ borderRadius: '8px', border: 'none' }} />
                    <ReferenceLine y={stats.avgInteractions} stroke="#FF7300" strokeDasharray="4 4" label={{ value: '平均值', fill: '#FF7300', fontSize: 10, position: 'top' }} />
                    <Line type="monotone" name="总互动量" dataKey="interactions" stroke="#6366F1" strokeWidth={3} dot={{ r: 3 }} />
                  </LineChart>
                </ChartBox>

                {/* 2. 点赞量双轴图 (占比图) */}
                <ChartBox title="点赞推移与互动占比 (双轴)" iconText={`${activeBrands[0]} 篇均点赞: ${stats.avgLikes}次`}>
                  <LineChart data={stats.trends}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="timeLabel" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6366F1' }} tickFormatter={formatNum} />
                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#EC4899' }} unit="%" />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none' }} />
                    <ReferenceLine yAxisId="left" y={stats.avgLikes} stroke="#3B82F6" strokeDasharray="4 4" label={{ value: '均值', fill: '#3B82F6', fontSize: 10 }} />
                    <Line yAxisId="left" type="monotone" name="点赞量" dataKey="likes" stroke="#6366F1" strokeWidth={3} dot={{ r: 3 }} />
                    <Line yAxisId="right" type="monotone" name="点赞/互动比" dataKey="likesRatio" stroke="#EC4899" strokeWidth={2} strokeDasharray="3 3" dot={false} />
                  </LineChart>
                </ChartBox>

                {/* 3. 评论量双轴图 */}
                <ChartBox title="评论推移与互动占比 (双轴)" iconText={`${activeBrands[0]} 篇均评论: ${stats.avgComments}次`}>
                  <LineChart data={stats.trends}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="timeLabel" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#10B981' }} tickFormatter={formatNum} />
                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#EC4899' }} unit="%" />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none' }} />
                    <ReferenceLine yAxisId="left" y={stats.avgComments} stroke="#10B981" strokeDasharray="4 4" label={{ value: '均值', fill: '#10B981', fontSize: 10 }} />
                    <Line yAxisId="left" type="monotone" name="评论量" dataKey="comments" stroke="#10B981" strokeWidth={3} dot={{ r: 3 }} />
                    <Line yAxisId="right" type="monotone" name="评论/互动比" dataKey="commentsRatio" stroke="#EC4899" strokeWidth={2} strokeDasharray="3 3" dot={false} />
                  </LineChart>
                </ChartBox>

                {/* 4. 收藏量双轴图 */}
                <ChartBox title="收藏推移与互动占比 (双轴)" iconText={`${activeBrands[0]} 篇均收藏: ${stats.avgCollects}次`}>
                  <LineChart data={stats.trends}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="timeLabel" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#F59E0B' }} tickFormatter={formatNum} />
                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#EC4899' }} unit="%" />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none' }} />
                    <ReferenceLine yAxisId="left" y={stats.avgCollects} stroke="#F59E0B" strokeDasharray="4 4" label={{ value: '均值', fill: '#F59E0B', fontSize: 10 }} />
                    <Line yAxisId="left" type="monotone" name="收藏量" dataKey="collects" stroke="#F59E0B" strokeWidth={3} dot={{ r: 3 }} />
                    <Line yAxisId="right" type="monotone" name="收藏/互动比" dataKey="collectsRatio" stroke="#EC4899" strokeWidth={2} strokeDasharray="3 3" dot={false} />
                  </LineChart>
                </ChartBox>
              </div>
            ) : (
              // =================【竞品对比模式】折线图集群 =================
              <div className="space-y-6">
                <ChartBox title="各竞品品牌互动推移对比 (多线交织)" iconText="对比多竞品的绝对影响力走势">
                  <LineChart data={stats.trends}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="timeLabel" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} tickFormatter={formatNum} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none' }} />
                    <Legend />
                    {selectedBrands.map((brand, idx) => {
                      const colors = ["#6366F1", "#10B981", "#F59E0B", "#EC4899", "#06B6D4"];
                      return (
                        <Line 
                          key={brand} 
                          type="monotone" 
                          name={`${brand}互动量`} 
                          dataKey={`int_${brand}`} 
                          stroke={colors[idx % colors.length]} 
                          strokeWidth={2.5} 
                          dot={{ r: 2.5 }} 
                        />
                      );
                    })}
                  </LineChart>
                </ChartBox>
              </div>
            )}
          </div>
        )}

        {/* ================= Tab 2: 内容分析 ================= */}
        {activeTab === 'content' && (
          <div className="space-y-6 animate-fade-in">
            {analysisMode === 'single' ? (
              // =================【单个分析模式】内容明细 =================
              <div className="space-y-6">
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <h3 className="text-xs font-extrabold text-slate-700 mb-3 flex items-center gap-1.5">📁 ${activeBrands[0]} 赛道明细明细表</h3>
                  <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead className="bg-slate-50/80 font-black text-slate-500 border-b border-slate-100">
                        <tr>
                          <th className="py-2.5 px-3">赛道名称</th>
                          <th className="py-2.5 px-3">合作篇数</th>
                          <th className="py-2.5 px-3 text-indigo-600">总互动量</th>
                          <th className="py-2.5 px-3 text-indigo-600">篇均互动量</th>
                          <th className="py-2.5 px-3">视频占比</th>
                          <th className="py-2.5 px-3">图文占比</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 font-bold text-slate-700">
                        {(brandStatsMap.get(activeBrands[0])?.trackDetails || []).map((t: any, i: number) => (
                          <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-2.5 px-3 text-slate-900">{t.name}</td>
                            <td className="py-2.5 px-3">{t.count} 篇</td>
                            <td className="py-2.5 px-3 text-indigo-600 font-extrabold">{formatComma(t.interactions)}</td>
                            <td className="py-2.5 px-3 text-indigo-600 font-extrabold">{formatComma(t.avgInt)}</td>
                            <td className="py-2.5 px-3 text-indigo-500">{t.videoPct}%</td>
                            <td className="py-2.5 px-3 text-emerald-500">{t.imagePct}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 4重 Top3 排行榜 */}
                <div className="grid grid-cols-2 gap-4">
                  {renderTop3List(brandStatsMap.get(activeBrands[0])?.topInteractions || [], "总互动量", "interactions", "总互动")}
                  {renderTop3List(brandStatsMap.get(activeBrands[0])?.topLikes || [], "点赞量", "likes", "点赞")}
                  {renderTop3List(brandStatsMap.get(activeBrands[0])?.topComments || [], "评论量", "comments", "评论")}
                  {renderTop3List(brandStatsMap.get(activeBrands[0])?.topCollects || [], "收藏量", "collects", "收藏")}
                </div>
              </div>
            ) : (
              // =================【竞品对比模式】多表级联 =================
              <div className="space-y-8">
                {selectedBrands.map(brand => {
                  const bStat = brandStatsMap.get(brand);
                  if (!bStat) return null;
                  return (
                    <div key={brand} className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl space-y-4">
                      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                        <Sparkles size={16} className="text-indigo-500" />
                        <h3 className="text-sm font-black text-slate-800">{brand} 专属内容洞察</h3>
                      </div>
                      
                      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
                        <table className="w-full text-left border-collapse text-[10px]">
                          <thead className="bg-slate-100/50 font-black text-slate-500 border-b border-slate-100">
                            <tr>
                              <th className="py-2 px-3">赛道名称</th>
                              <th className="py-2 px-3">合作篇数</th>
                              <th className="py-2 px-3 text-indigo-600">总互动量</th>
                              <th className="py-2 px-3 text-indigo-600">篇均互动量</th>
                              <th className="py-2 px-3">视频占比</th>
                              <th className="py-2 px-3">图文占比</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50 font-bold text-slate-700">
                            {bStat.trackDetails.map((t: any, i: number) => (
                              <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-2 px-3 text-slate-900">{t.name}</td>
                                <td className="py-2 px-3">{t.count} 篇</td>
                                <td className="py-2 px-3 text-indigo-600 font-extrabold">{formatComma(t.interactions)}</td>
                                <td className="py-2 px-3 text-indigo-600 font-extrabold">{formatComma(t.avgInt)}</td>
                                <td className="py-2 px-3 text-indigo-500">{t.videoPct}%</td>
                                <td className="py-2 px-3 text-emerald-500">{t.imagePct}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {renderTop3List(bStat.topInteractions, `${brand} 互动榜`, "interactions", "总互动")}
                        {renderTop3List(bStat.topLikes, `${brand} 点赞榜`, "likes", "点赞")}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= Tab 3: 达人策略 ================= */}
        {activeTab === 'creators' && (
          <div className="space-y-6 animate-fade-in">
            {analysisMode === 'single' ? (
              // =================【单个分析模式】达人属性左移 =================
              <div className="space-y-6">
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                  <h3 className="text-xs font-bold text-slate-700 mb-4 flex items-center gap-1.5">👥 达人属性层级分布</h3>
                  <div className="grid gap-4">
                    {stats.creatorAttrs.map((attr, i) => (
                      <div key={i} className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm flex flex-col gap-2 hover:shadow transition-all">
                        {/* 达人数占比、费用占比挪位至左侧名字旁边 */}
                        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-black text-indigo-700">{attr.name}</span>
                            <div className="flex items-center gap-1.5 text-[10px] font-bold">
                              <span className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded">篇数占 {attr.notePct}%</span>
                              <span className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded">费用占 {attr.costPct}%</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-black text-slate-800">{attr.uCount} 位达人</span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-bold">
                          <div className="bg-slate-50 p-2 rounded">
                            <p className="text-[10px] text-slate-400">合作篇数</p>
                            <p className="text-sm font-extrabold text-slate-700 mt-0.5">{attr.count} 篇</p>
                          </div>
                          <div className="bg-slate-50 p-2 rounded">
                            <p className="text-[10px] text-slate-400">平均费用指标 / 达人</p>
                            <p className="text-sm font-extrabold text-emerald-600 mt-0.5">¥{formatComma(attr.avgCost)}</p>
                          </div>
                          <div className="bg-slate-50 p-2 rounded">
                            <p className="text-[10px] text-slate-400">总投放费用</p>
                            <p className="text-sm font-extrabold text-slate-700 mt-0.5">¥{formatNum(attr.cost)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              // =================【竞品对比模式】汇总对比长表 =================
              <div className="space-y-6">
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <h3 className="text-xs font-extrabold text-slate-700 mb-3 flex items-center gap-1.5">📊 竞品达人采购策略一览表</h3>
                  <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse text-[10px]">
                      <thead className="bg-slate-100 font-black text-slate-500 border-b border-slate-100">
                        <tr>
                          <th className="py-2.5 px-3">品牌名</th>
                          <th className="py-2.5 px-3">达人总数 (去重)</th>
                          <th className="py-2.5 px-3 text-indigo-600">总投放费用</th>
                          <th className="py-2.5 px-3">均费用/达人</th>
                          <th className="py-2.5 px-3">头部达人/腰部/初级</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 font-bold text-slate-700">
                        {selectedBrands.map(brand => {
                          const bStat = brandStatsMap.get(brand);
                          if (!bStat) return null;
                          return (
                            <tr key={brand} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-2.5 px-3 text-slate-900 font-black">{brand}</td>
                              <td className="py-2.5 px-3">{bStat.creatorsCount} 人</td>
                              <td className="py-2.5 px-3 text-emerald-600">¥{formatComma(bStat.totalCost)}</td>
                              <td className="py-2.5 px-3">¥{formatComma(bStat.avgCost)}</td>
                              <td className="py-2.5 px-3 text-slate-500">
                                {bStat.records.filter((r:any)=>r.influencerType==='头部达人').length}篇/
                                {bStat.records.filter((r:any)=>r.influencerType==='腰部达人').length}篇/
                                {bStat.records.filter((r:any)=>r.influencerType==='初级达人').length}篇
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= Tab 4: 费用分析 ================= */}
        {activeTab === 'cost' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex gap-4">
              <div className="flex-1 bg-white border border-amber-100 shadow-sm rounded-xl p-5 relative">
                <p className="text-xs text-slate-500 mb-1">总预估投放</p>
                <p className="text-3xl font-black text-slate-800">¥{formatComma(stats.cost)}</p>
                <p className="text-[11px] text-slate-400 mt-2">{stats.notes} 篇笔记</p>
              </div>
              <div className="flex-1 bg-white border border-indigo-100 shadow-sm rounded-xl p-5 relative">
                <p className="text-xs text-slate-500 mb-1">单次互动成本 (CPE)</p>
                <p className="text-3xl font-black text-slate-800">¥{stats.cpe}</p>
                <p className="text-[11px] text-slate-400 mt-2">平均值</p>
              </div>
            </div>

            <ChartBox title="预估投放金额推移趋势" iconText="添加 CPE 行业警示均值参考线">
              <LineChart data={stats.trends}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="timeLabel" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#10B981' }} tickFormatter={(v)=>'¥'+formatNum(v)} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#F59E0B' }} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none' }} />
                {/* 增加平均CPE虚线参考线 */}
                <ReferenceLine yAxisId="right" y={Number(stats.cpe)} stroke="#EF4444" strokeDasharray="5 5" label={{ value: `平均CPE: ¥${stats.cpe}`, fill: '#EF4444', fontSize: 10 }} />
                <Line yAxisId="left" type="monotone" name="预算花费" dataKey="cost" stroke="#10B981" strokeWidth={3} dot={{ r: 3 }} />
                <Line yAxisId="right" type="monotone" name="单次CPE" dataKey="cpe" stroke="#F59E0B" strokeWidth={2.5} dot={{ r: 2 }} />
              </LineChart>
            </ChartBox>
          </div>
        )}

        {/* ================= Tab 5: 笔记明细 ================= */}
        {activeTab === 'details' && (
          <div className="h-[520px] animate-fade-in">
            {analysisMode === 'single' ? (
              <NotesTable records={filteredRecords} />
            ) : (
              // 对比模式下，各品牌单独拆表独立呈现
              <div className="space-y-6 h-full overflow-y-auto pr-1">
                {selectedBrands.map(brand => {
                  const bStat = brandStatsMap.get(brand);
                  if (!bStat) return null;
                  return (
                    <div key={brand} className="bg-white border border-slate-200 p-3 rounded-2xl h-[450px] flex flex-col">
                      <p className="text-xs font-black text-slate-800 mb-2 flex items-center gap-1.5">📋 {brand} 明细流水表</p>
                      <div className="flex-1 overflow-hidden">
                        <NotesTable records={bStat.records} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

function TabBtn({ active, onClick, icon, label }: any) { return (<button onClick={onClick} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${active ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{icon} {label}</button>); }
function StatCard({ icon, title, value, color, bg }: any) { return (<div className={`${bg} rounded-xl p-3 border border-slate-100/50`}><div className={`w-7 h-7 rounded-lg bg-white flex items-center justify-center shadow-sm mb-2 ${color}`}>{React.cloneElement(icon, { size: 14 })}</div><p className="text-[11px] text-slate-500 mb-0.5">{title}</p><p className={`text-lg font-black ${color.replace('text-', 'text-').replace('500', '700')}`}>{value}</p></div>); }
function ChartBox({ title, iconText, children }: { title: string, iconText?: string, children: React.ReactNode }) { return (<div className="bg-slate-50 rounded-xl p-4 border border-slate-100"><div className="flex justify-between items-center mb-4"><h3 className="text-xs font-bold text-slate-700">{title}</h3>{iconText && <span className="text-[10px] font-black text-slate-400 bg-slate-200/50 px-2 py-0.5 rounded-full">{iconText}</span>}</div><div className="h-56"><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div></div>); }
