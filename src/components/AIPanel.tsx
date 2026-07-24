import React, { useState, useRef, useEffect } from 'react';
import { ParsedData, ChatMessage } from '../types';
import { Bot, Sparkles, RotateCcw } from 'lucide-react';

interface Props {
  data: ParsedData;
  selectedCommercial: string;
  selectedBrands: string[];
  selectedMonths: string[];
}

export const AIPanel: React.FC<Props> = ({ data, selectedCommercial, selectedBrands, selectedMonths }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleGenerateReport = async () => {
    const records = data.records.filter(r => {
      const isCom = (r as any).isCommercial;
      const matchCom = selectedCommercial === '全部' || isCom === selectedCommercial;
      const matchBrand = selectedBrands.length === 0 || selectedBrands.includes(r.reportedBrand);
      const matchMonth = selectedMonths.length === 0 || selectedMonths.includes(r.month);
      return matchCom && matchBrand && matchMonth;
    });
    
    if (records.length === 0) return;

    const cost = records.reduce((s, r) => s + r.estimatedCost, 0);
    const interactions = records.reduce((s, r) => s + r.interactions, 0);
    const uniqueCreators = Array.from(new Map(records.map(r => [r.influencerId, r])).values());
    const totalFollowers = uniqueCreators.reduce((s, r) => s + r.followers, 0);
    const cpe = interactions > 0 ? (cost / interactions).toFixed(2) : 0;
    const cpf = totalFollowers > 0 ? (cost / totalFollowers).toFixed(2) : 0;
    
    let videoCount = 0; let imageCount = 0;
    records.forEach(r => r.noteForm.includes('视频') ? videoCount++ : imageCount++);
    
    const creatorMap = new Map<string, number>();
    records.forEach(r => creatorMap.set(r.influencerId, (creatorMap.get(r.influencerId) || 0) + 1));
    const repeatedCount = Array.from(creatorMap.values()).filter(c => c > 1).length;

    const tags = Array.from(new Set(records.map(r => r.tags).filter(Boolean).map(t => t.split(',')[0]))).slice(0, 15).join('、');
    const topRecord = records.reduce((p, c) => p.interactions > c.interactions ? p : c);

    // ================= 赛道深度分析算力（抓取真实标题） =================
    const typeMap = new Map<string, { count: number; interactions: number }>();
    records.forEach(r => {
      const t = r.noteType || '未知赛道';
      const d = typeMap.get(t) || { count: 0, interactions: 0 };
      d.count += 1; d.interactions += r.interactions;
      typeMap.set(t, d);
    });
    const typeStats = Array.from(typeMap.entries()).map(([name, stat]) => ({
      name, count: stat.count, avgInt: stat.count > 0 ? stat.interactions / stat.count : 0
    }));

    // 获取特定赛道下互动最高的笔记，提供给 AI 做真实数据支撑
    const getTopNoteForType = (typeName: string) => {
      const notes = records.filter(r => (r.noteType || '未知赛道') === typeName);
      if (notes.length === 0) return null;
      return notes.reduce((p, c) => p.interactions > c.interactions ? p : c);
    };

    // 1. 最高效赛道 (篇均互动最高)
    const sortedByEfficiency = [...typeStats].sort((a, b) => b.avgInt - a.avgInt);
    const efficiencyChampion = sortedByEfficiency.length > 0 ? sortedByEfficiency[0] : null;

    // 2. 潜在蓝海爆款赛道 (篇数<=3，但均互动高)
    const potentialTypes = [...typeStats].filter(t => t.count <= 3 && t.avgInt > 100).sort((a,b) => b.avgInt - a.avgInt).slice(0, 2)
      .map(t => {
        const topNote = getTopNoteForType(t.name);
        return `【${t.name}赛道】(仅${t.count}篇, 但均互动高达${Math.round(t.avgInt)}。代表蓝海笔记标题：《${topNote?.title}》)`;
      }).join('； ');

    // ================= 修改点：成本浪费/预算黑洞算力（精准揪出赛道和标题） =================
    const worstNotes = [...records].filter(r => r.estimatedCost > 0).sort((a, b) => {
      const cpeA = a.interactions > 0 ? a.estimatedCost / a.interactions : a.estimatedCost;
      const cpeB = b.interactions > 0 ? b.estimatedCost / b.interactions : b.estimatedCost;
      return cpeB - cpeA;
    }).slice(0, 2);
    
    // 修改：将 influencerType 换成了真正的赛道 noteType，并拼接了具体的翻车笔记标题
    const wasteEvidence = worstNotes.length > 0 
      ? worstNotes.map(n => `【${n.noteType || '未知'}赛道】花费¥${n.estimatedCost}但互动仅${n.interactions}（避坑案例标题：《${n.title}》）`).join(' ； ') 
      : '无明显极端浪费案例';

    // 严密对接你修改后的新版 Prompt
    const prompt = `
筛选视角：【品牌：${selectedBrands.length===0?'全部':selectedBrands.join('、')}】 | 【月份：${selectedMonths.length===0?'全部':selectedMonths.join('、')}】 | 【性质：${selectedCommercial==='全部'?'全部笔记':selectedCommercial==='是'?'仅商业笔记':'非商业'}】

客观数据指标（请在报告中引用以下数据）：
- 共 ${records.length} 篇笔记，其中视频 ${videoCount} 支，图文 ${imageCount} 篇。
- 总预估花费 ¥${cost}。
- 共有 ${uniqueCreators.length} 位达人，其中复投达人 ${repeatedCount} 位。
- 单粉成本(CPF)约 ¥${cpf}，单次互动成本(CPE)约 ¥${cpe}。
- 高频达人标签聚类：${tags}
- 成本浪费嫌疑参考：发现 ${wasteEvidence}。

全盘最强爆款笔记特征：
- 标题: ${topRecord.title}
- 达人属性: ${topRecord.influencerType} (粉丝:${topRecord.followers})
- 赛道形式: ${topRecord.noteType} / ${topRecord.noteForm}
- 互动量: ${topRecord.interactions}

请根据以上真实数据，输出商业洞察报告，必须包含以下6个模块（请严格使用 ### 作为主标题，- 作为列表）：

### 1. 达人采购策略
分析粉丝层级、标签聚类、是否偏腰部/复投。判断品牌偏向：ROI效率型/曝光型/矩阵铺量型/垂直型（必须给出证据）。

### 2. 内容分析
分析视频图文比例、标题风格（情绪/生活/种草）、场景。判断品牌打法：生活方式/功能教育/节点营销/SEO/爆款冲刺。
同时，请结合上述客观计算结果，必须深入分析以下两个核心问题：
- 结合爆款案例的特征、标题和形式，定量分析篇均互动量最高（即最有效率）的赛道 [${efficiencyChampion?.name || '效率最高'}] 是否值得进行像素级复刻？并给出具体复刻方法（例如：选题切入点、视觉表现、黄金3秒前置要素等）。
- 深度挖掘爆款机会蓝海：结合计算出的“潜在蓝海爆款赛道” [${potentialTypes}] 数据，论证其为什么能以小博大（从用户心智、竞争饱和度等角度），以及品牌未来应如何布局抢占。并且，你必须基于左边分析的数据与推断，为该蓝海赛道量身定制输出 2-3 个极具爆款潜质的内容例子标题。

### 3. 预算与ROI结构
分析CPF、CPE等。品牌是否在控制成本？是否存在浪费？成本浪费判断需要严格根据客观提供的费用分析（成本浪费嫌疑参考数据）还有整体互动效果来判断是否真的存在浪费。**重点要求：必须明确点出表现最差的具体“赛道”，并引用其“避坑案例标题”作为证据，具体分析其ROI为何如此拉胯，给品牌后续投放敲响警钟。**

### 4. 内容效果结构
分析高互动内容并解释原因。

### 5. 品牌打法推测
判断品牌接近哪种打法（曝光型/矩阵型/内容种草型/SEO型/节点营销/长期养号/ROI效率型），写清依据。

### 6. 机会与行动建议
具体可执行建议：优先合作哪类达人？复投建议？内容形式建议？`;

    setMessages([{ role: 'user', content: `基于精准赛道表现与ROI拉胯避坑数据，生成深度商业分析报告。`, timestamp: new Date() }]);
    setIsTyping(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || '请求失败');

      setMessages(prev => [...prev, { role: 'assistant', content: resData.result, timestamp: new Date() }]);
    } catch (error: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `❌ 分析失败: ${error.message}`, timestamp: new Date() }]);
    } finally {
      setIsTyping(false);
    }
  };

  const renderMessage = (content: string) => {
    const cleanContent = content.replace(/---+/g, '').replace(/===+/g, '');
    return cleanContent.split('\n').map((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={i} className="h-1.5"></div>;

      const parseBold = (text: string) => {
        const parts = text.split(/(\*\*.*?\*\*)/g);
        return parts.map((p, j) => p.startsWith('**') ? <strong key={j} className="text-indigo-600 font-bold">{p.replace(/\*\*/g, '')}</strong> : p);
      };

      const matchHeading = trimmed.match(/^(#{1,3})\s+(.*)/);
      if (matchHeading) {
        return (
          <h2 key={i} className="text-[15px] font-black text-indigo-700 mt-5 mb-2 pb-1.5 border-b-2 border-indigo-50 flex items-center gap-1.5">
            <Sparkles size={16} className="text-amber-500" /> {parseBold(matchHeading[2])}
          </h2>
        );
      }

      const matchList = trimmed.match(/^[\*\-]\s+(.*)/);
      if (matchList) {
        return <li key={i} className="ml-4 list-disc marker:text-indigo-400 mb-1 text-[13px] text-slate-700 leading-relaxed">{parseBold(matchList[1])}</li>;
      }

      return <p key={i} className="mb-1 text-[13px] text-slate-700 leading-relaxed">{parseBold(trimmed)}</p>;
    });
  };

  return (
    <div className="h-full bg-white rounded-2xl border border-slate-100 flex flex-col relative p-4">
      <div className="flex items-center justify-between mb-3 flex-shrink-0 border-b border-slate-50 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm">
            <Sparkles size={16} className="text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">DeepSeek 商业洞察大脑</h2>
            <p className="text-[10px] text-slate-400">联动多重筛选动态推理</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button onClick={() => setMessages([])} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"><RotateCcw size={14} /></button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scroll pr-2 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <Bot size={40} className="text-violet-200 mb-3" />
            <p className="text-sm font-bold text-slate-700 mb-1">AI 引擎准备就绪</p>
            <button
              onClick={handleGenerateReport}
              disabled={data.totalNotes === 0}
              className="mt-4 flex items-center gap-2 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all shadow-md active:scale-95"
            >
              <Sparkles size={16} /> 生成深度报告
            </button>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className={`max-w-[95%] rounded-xl px-4 py-3 shadow-sm ${
                msg.role === 'user' ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-[13px]' : 'bg-slate-50 border border-slate-100'
              }`}
            >
              {msg.role === 'assistant' ? renderMessage(msg.content) : msg.content}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex gap-2">
            <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 shadow-sm flex gap-1.5 items-center">
              <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" />
              <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              <span className="text-[11px] text-slate-400 ml-2">模型推理中，精细化赛道与成本诊断中...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};
