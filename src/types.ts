export interface NoteRecord {
  publishTime: string;
  month: string;
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
  fanTiers: { name: string; value: number }[];
  creatorTypes: { name: string; value: number }[];
  topCreator: NoteRecord | null;
  repeatedCreators: number;
  cpe: number;
  cpf: number;
  medianCost: number;
  videoCount: number;
  imageCount: number;
  brandStats: any[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}
