import React, { useState, useRef, useEffect } from 'react';
import { ParsedData, ChatMessage } from '../types';
import { Bot, Sparkles, RotateCcw } from 'lucide-react';

interface Props {
  data: ParsedData;
  selectedBrand: string;
  selectedMonth: string;
}

export const AIPanel: React.FC<Props> = ({ data, selectedBrand, selectedMonth }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleGenerateReport = async () => {
    // 1. 过滤当前数据
    const records = data.records.filter(r => 
      (selectedBrand === '全部' || r.reportedBrand === selectedBrand) &&
      (selectedMonth === '全部' || r.month === selectedMonth)
    );
    if (records.length === 0) return;

    // 2. 组装给 AI 的商业级 Prompt (完全基于你的需求)
    const cost = records.reduce((s, r) => s + r.estimatedCost, 0);
    const topRecord = records.reduce((p, c) => p.interactions > c.interactions ? p : c);
    
    const tags = Array.from(new Set(records.map(r => r.tags).filter(Boolean).map(t => t.split(',')[0]))).slice(0, 10).join('、');
    
    const prompt = `
当前分析切片：【品牌：${selectedBrand}】 | 【月份：${selectedMonth}】
共计 ${records.length} 篇笔记。预估总花费：¥${cost}。
高频达人标签聚类：${tags}

表现最爆款的笔记特征：
- 标题: ${topRecord.title}
- 达人属性: ${topRecord.influencerType} (粉丝:${topRecord.followers})
- 笔记类型: ${topRecord.noteType} / 形式: ${topRecord.noteForm}
- 互动量: ${topRecord.interactions}

请根据以上真实数据，输出商业洞察报告（包含以下4部分）：
1.【达人策略 Creator Strategy】：判断品牌偏向ROI效率型、曝光型还是垂直型？是否偏向某类达人？
2.【内容策略 Content Strategy】：基于爆款标题和形式，推断其内容包装是在做生活方式、功能教育还是爆款冲刺？
3.【人群策略推断 Audience】：基于达人标签和笔记类型，推测目标人群（如精致白领、宝妈等）并说明依据。
4.【机会与行动建议 Opportunity】：哪类达人值得优先合作？哪些内容形式应该强化？给出落地建议。
（必须用 Markdown 排版，使用加粗和分点，语气专业商业化）`;

    // 3. 开始发送请求
    setMessages([{ role: 'user', content: `请基于当前筛选（${selectedBrand} / ${selectedMonth}）生成深度商业分析报告。`, timestamp: new Date() }]);
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

  return (
    <div className="h-full bg-white rounded-2xl border border-slate-100 flex flex-col relative p-4">
      <div className="flex items-center justify-between mb-3 flex-shrink-0 border-b border-slate-50 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm">
            <Sparkles size={16} className="text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">DeepSeek 商业洞察</h2>
            <p className="text-[10px] text-slate-400">基于本地数据推理 · 拒绝编造</p>
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
            <p className="text-sm font-bold text-slate-700 mb-1">AI 分析引擎已就绪</p>
            <button
              onClick={handleGenerateReport}
              disabled={data.totalNotes === 0}
              className="mt-4 flex items-center gap-2 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all shadow-md active:scale-95"
            >
              <Sparkles size={16} /> 提取核心数据并生成报告
            </button>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className={`max-w-[90%] rounded-xl px-4 py-3 shadow-sm text-[13px] leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user' ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white' : 'bg-slate-50 border border-slate-100 text-slate-700'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex gap-2">
            <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 shadow-sm flex gap-1.5 items-center">
              <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" />
              <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              <span className="text-[11px] text-slate-400 ml-2">DeepSeek 模型推理中...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};
