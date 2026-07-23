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

    // ================= 赛道交叉数据深度计算 =================
    const trackMap = new Map<string, { count: number; interactions: number; cost: number }>();
    records.forEach(r => {
      const type = r.noteType || '未知';
      const current = trackMap.get(type) || { count: 0, interactions: 0, cost: 0 };
      current.count += 1;
      current.interactions += r.interactions;
      current.cost += r.estimatedCost;
      trackMap.set(type, current);
    });

    const trackStats = Array.from(trackMap.entries()).map(([name, s]) => ({
      name,
      count: s.count,
      interactions: s.interactions,
      avgInteractions: Math.round(s.interactions / s.count),
      cost: s.cost,
      cpe: s.interactions > 0 ? (s.cost / s.interactions).toFixed(2) : (s.cost > 0 ? s.cost.toFixed(2) : '0.00')
    }));

    // 排序：篇均效率最高（最值得像素级复刻）
    const sortedByEfficiency = [...trackStats].sort((a, b) => b.avgInteractions - a.avgInteractions);
    // 排序：合作规模（铺量度）
    const sortedByVolume = [...trackStats].sort((a, b) => b.count - a.count);
    
    // 计算全局平均互动
    const globalAvgInteractions = records.length > 0 ? Math.round(interactions / records.length) : 0;

    // 筛选：潜在蓝海爆款赛道 (合作篇数 <= 3篇，但篇均效率高于大盘平均值，且CPE合理的赛道)
    const blueOceanTracks = trackStats.filter(t => t.count <= 3 && t.avgInteractions > globalAvgInteractions);
    const blueOceanStr = blueOceanTracks.length > 0
      ? blueOceanTracks.map(t => `【${t.name}】(合作 ${t.count} 篇, 篇均互动 ${t.avgInteractions}, CPE ¥${t.cpe})`).join('、')
      : '暂无明显蓝海机会赛道';

    // 筛选：高浪费/低ROI赛道 (赛道CPE 明显高于 全局平均CPE 的 1.5 倍)
    const globalCpeNum = parseFloat(cpe as string);
    const wastefulTracks = trackStats.filter(t => {
      const trackCpeNum = parseFloat(t.cpe);
      return trackCpeNum > (globalCpeNum * 1.5) && t.cost > 0;
    });
    const wastefulStr = wastefulTracks.length > 0
      ? wastefulTracks.map(t => `【${t.name}】(赛道CPE高达 ¥${t.cpe}, 篇均互动仅 ${t.avgInteractions})`).join('、')
      : '未发现明显高预算浪费赛道';

    // 组装格式化各赛道详细数据表
    const trackDetailsMarkdown = trackStats.map(t => 
      `- 【${t.name}】: 合作 ${t.count} 篇 | 赛道总花费 ¥${t.cost} | 总互动量 ${t.interactions} | 篇均互动 ${t.avgInteractions} | 实际CPE ¥${t.cpe}`
    ).join('\n');

    const prompt = `
筛选视角：【品牌：${selectedBrands.length===0?'全部':selectedBrands.join('、')}】 | 【月份：${selectedMonths.length===0?'全部':selectedMonths.join('、')}】 | 【性质：${selectedCommercial==='全部'?'全部笔记':selectedCommercial==='是'?'仅商业笔记':'非商业'}】

客观核心数据指标（请在报告中引用以下数据）：
- 共 ${records.length} 篇笔记，其中视频 ${videoCount} 支，图文 ${imageCount} 篇。
- 总预估花费 ¥${cost}。
- 共有 ${uniqueCreators.length} 位达人，其中复投达人 ${repeatedCount} 位。
- 单粉成本(CPF)约 ¥${cpf}，全局单次互动成本(CPE)约 ¥${cpe}。
- 大盘整体篇均互动量：${globalAvgInteractions}

各赛道（笔记分类）核心计算数据表（请在报告中必须引用以下真实计算结果）：
${trackDetailsMarkdown}

系统交叉计算得出的推演线索：
- 篇均效率最高（爆款率最高）的赛道：【${sortedByEfficiency[0]?.name || '无'}】 (篇均互动: ${sortedByEfficiency[0]?.avgInteractions || 0})
- 合作数量最大（品牌主攻）的赛道：【${sortedByVolume[0]?.name || '无'}】 (合作数: ${sortedByVolume[0]?.count || 0})
- 测算出【潜在蓝海爆款赛道】：${blueOceanStr}
- 测算出【可能存在预算浪费/低效赛道】：${wastefulStr}

爆款笔记案例：
- 标题: ${topRecord.title}
- 达人: ${topRecord.influencerType} (粉丝:${topRecord.followers})
- 形式: ${topRecord.noteType} / ${topRecord.noteForm}
- 互动量: ${topRecord.interactions}

请根据以上真实计算数据，输出商业洞察报告，必须包含以下6个模块（请严格使用 ### 作为主标题，- 作为列表）：

### 1. 达人采购策略
分析粉丝层级、标签聚类、是否偏腰部/复投。判断品牌偏向：ROI效率型/曝光型/矩阵铺量型/垂直型（必须给出证据）。

### 2. 内容分析
分析视频图文比例、标题风格（情绪/生活/种草）、场景。判断品牌打法：生活方式/功能教育/节点营销/SEO/爆款冲刺。
同时，必须在这一章中结合系统计算的赛道数据，进行以下推断：
- 结合爆款案例的特征、标题和形式，定量分析篇均互动量最高（即最有效率）的赛道是否值得进行像素级复刻？并给出具体复刻方法。
- 深度挖掘爆款机会蓝海：结合计算出的“潜在蓝海爆款赛道”（合作篇数极少但篇均互动量极高的赛道），论证其为什么能以小博大，以及品牌未来应如何布局抢占。

### 3. 预算与ROI结构
分析CPF、CPE等。品牌是否在控制成本？是否存在浪费？
同时，必须在这一章中结合费用分析与互动效果，进行成本浪费的精准判断：
- 针对系统计算出的“低ROI/可能浪费的赛道”（即赛道CPE明显偏高，且篇均互动过低的赛道），深度判断其是否属于预算浪费盲区，并给出优化建议或砍掉预算的具体论证。

### 4. 内容效果结构
分析高互动内容并解释原因。

### 5. 品牌打法推测
判断品牌接近哪种打法（曝光型/矩阵型/内容种草型/SEO型/节点营销/长期养号/ROI效率型），写清依据。

### 6. 机会与行动建议
具体可执行建议：优先合作哪类达人？复投建议？内容形式建议？`;

    // 1. 先插入用户的问题
    const userMsg: ChatMessage = { role: 'user', content: `基于当前所有筛选条件，生成深度商业分析报告。`, timestamp: new Date() };
    // 2. 紧接着插入一条空的 AI 占位消息，准备承接流式输入
    const assistantMsg: ChatMessage = { role: 'assistant', content: '', timestamp: new Date() };
    
    setMessages([userMsg, assistantMsg]);
    setIsTyping(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || '分析请求失败');
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder('utf-8');
      if (!reader) throw new Error('流式读取通道打开失败');

      setIsTyping(false);

      let done = false;
      let currentText = '';
      let buffer = '';

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const cleanedLine = line.trim();
            if (!cleanedLine) continue;
            if (cleanedLine === 'data: [DONE]') {
              done = true;
              break;
            }
            if (cleanedLine.startsWith('data: ')) {
              try {
                const json = JSON.parse(cleanedLine.slice(6));
                const content = json.choices?.[0]?.delta?.content || '';
                currentText += content;

                setMessages(prev => {
                  const updated = [...prev];
                  if (updated.length > 0) {
                    updated[updated.length - 1] = {
                      ...updated[updated.length - 1],
                      content: currentText,
                    };
                  }
                  return updated;
                });
              } catch (e) {
                // 忽略偶发的单行 JSON 解析异常
              }
            }
          }
        }
      }
    } catch (error: any) {
      setIsTyping(false);
      setMessages(prev => {
        const updated = [...prev];
        if (updated.length > 0) {
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: `❌ 分析失败: ${error.message}`,
          };
        }
        return updated;
      });
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

        {messages.map((msg, i) => {
          if (msg.role === 'assistant' && msg.content === '' && isTyping) return null;
          return (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`max-w-[95%] rounded-xl px-4 py-3 shadow-sm ${
                  msg.role === 'user' ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-[13px]' : 'bg-slate-50 border border-slate-100'
                }`}
              >
                {msg.role === 'assistant' ? renderMessage(msg.content) : msg.content}
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex gap-2">
            <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 shadow-sm flex gap-1.5 items-center">
              <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" />
              <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              <span className="text-[11px] text-slate-400 ml-2">脑暴中，准备开始输出报告...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};
