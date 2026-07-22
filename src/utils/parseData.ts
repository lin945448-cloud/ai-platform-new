import { NoteRecord, ParsedData } from '../types';

const getNum = (val: any): number => {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  const parsed = parseFloat(val.toString().replace(/,/g, ''));
  return isNaN(parsed) ? 0 : parsed;
};

const getFanTier = (followers: number): string => {
  if (followers < 30000) return '3万以下';
  if (followers < 50000) return '3-5万';
  if (followers < 100000) return '5-10万';
  if (followers < 300000) return '10-30万';
  return '30万以上';
};

export function analyzeData(rawRows: any[]): ParsedData {
  if (!rawRows || rawRows.length === 0) return getEmptyData();

  const uniqueRecords = new Map<string, NoteRecord>();
  
  rawRows.forEach(row => {
    const noteLink = row['笔记链接'] || row['链接'] || Math.random().toString();
    if (uniqueRecords.has(noteLink)) return;

    const publishTime = row['笔记发布时间'] || row['发布时间'] || '';
    const month = publishTime ? publishTime.substring(0, 7) : '未知';
    
    uniqueRecords.set(noteLink, {
      publishTime, month,
      title: row['笔记标题'] || row['标题'] || '无标题',
      noteForm: row['笔记形式'] || row['形式'] || '图文',
      reportedBrand: row['报备合作品牌'] || row['品牌'] || '未报备',
      noteType: row['笔记类型'] || row['类型'] || '其他',
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
    brands, months,
    fanTiers: [], creatorTypes: [], topCreator: null, repeatedCreators: 0,
    cpe: totalInteractions > 0 ? totalCost / totalInteractions : 0,
    cpf: 0, medianCost: 0, videoCount: 0, imageCount: 0, brandStats: []
  };
}

export function getEmptyData(): ParsedData {
  return {
    records: [], totalNotes: 0, totalInteractions: 0, totalCost: 0, influencerCount: 0,
    brands: [], months: [], fanTiers: [], creatorTypes: [], topCreator: null, repeatedCreators: 0,
    cpe: 0, cpf: 0, medianCost: 0, videoCount: 0, imageCount: 0, brandStats: []
  };
}
