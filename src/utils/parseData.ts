import { NoteRecord, ParsedData } from '../types';

const getNum = (val: any): number => {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  const parsed = parseFloat(val.toString().replace(/,/g, ''));
  return isNaN(parsed) ? 0 : parsed;
};

export function analyzeData(rawRows: any[]): ParsedData {
  if (!rawRows || rawRows.length === 0) return getEmptyData();

  const uniqueRecords = new Map<string, NoteRecord>();
  
  rawRows.forEach(row => {
    const noteLink = row['笔记链接'] || row['链接'] || Math.random().toString();
    if (uniqueRecords.has(noteLink)) return;

    const publishTime = row['笔记发布时间'] || row['发布时间'] || '';
    // 从 "2026-06-08 18:19:38" 中提取出日期 "2026-06-08" 和月份 "2026-06"
    const date = publishTime ? publishTime.split(' ')[0] : '未知';
    const month = date !== '未知' ? date.substring(0, 7) : '未知';
    
    uniqueRecords.set(noteLink, {
      publishTime, date, month,
      title: row['笔记标题'] || row['标题'] || '无标题',
      noteForm: row['笔记形式'] || row['形式'] || '图文',
      reportedBrand: row['报备合作品牌'] || row['品牌'] || '未报备',
      noteType: row['笔记类型'] || row['类型'] || '未知', // 如果空白，记为未知
      noteLink,
      interactions: getNum(row['互动量']),
      likes: getNum(row['点赞']),
      comments: getNum(row['评论']),
      collects: getNum(row['收藏']),
      shares: getNum(row['分享']),
      influencerName: row['达人昵称'] || row['昵称'] || '未知达人',
      influencerId: row['达人ID'] || row['小红书号'] || Math.random().toString(),
      followers: getNum(row['粉丝数']),
      influencerType: row['达人属性'] || '未知属性',
      tags: row['达人标签(前5)'] || row['达人标签'] || '',
      estimatedCost: getNum(row['预估投放金额'] || row['投放金额']),
    });
  });

  const records = Array.from(uniqueRecords.values());
  if (records.length === 0) return getEmptyData();

  const totalNotes = records.length;
  const totalInteractions = records.reduce((s, r) => s + r.interactions, 0);
  const totalCost = records.reduce((s, r) => s + r.estimatedCost, 0);
  
  const months = Array.from(new Set(records.map(r => r.month))).filter(m => m !== '未知').sort();
  const brands = Array.from(new Set(records.map(r => r.reportedBrand))).filter(b => b !== '未报备').sort();

  return {
    records, totalNotes, totalInteractions, totalCost,
    influencerCount: new Set(records.map(r => r.influencerId)).size,
    brands, months
  };
}

export function getEmptyData(): ParsedData {
  return { records: [], totalNotes: 0, totalInteractions: 0, totalCost: 0, influencerCount: 0, brands: [], months: [] };
}
