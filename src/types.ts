export interface NoteRecord {
  publishTime: string;
  date: string;       // 新增：精确到天 (YYYY-MM-DD)
  month: string;      // 精确到月 (YYYY-MM)
  title: string;
  noteForm: string;
  reportedBrand: string;
  noteType: string;
  noteLink: string;
  interactions: number;
  likes: number;
  comments: number;
  collects: number;
  shares: number;
  influencerName: string;
  influencerId: string;
  followers: number;
  influencerType: string;
  tags: string;
  estimatedCost: number;
}

export interface ParsedData {
  records: NoteRecord[];
  totalNotes: number;
  totalInteractions: number;
  totalCost: number;
  influencerCount: number;
  brands: string[];
  months: string[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}
