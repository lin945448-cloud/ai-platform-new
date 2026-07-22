import React, { useRef, useState, useCallback } from 'react';
import { Upload, CheckCircle, AlertCircle, FileSpreadsheet, Layers } from 'lucide-react';
import * as XLSX from 'xlsx';
import { ParsedData } from '../types';
import { analyzeData, getEmptyData } from '../utils/parseData';

interface Props {
  onDataLoaded: (data: ParsedData) => void;
  currentData: ParsedData;
}

export const UploadBar: React.FC<Props> = ({ onDataLoaded, currentData }) => {
  const [state, setState] = useState<'idle' | 'dragging' | 'processing' | 'success' | 'error'>('idle');
  const [info, setInfo] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(async (files: FileList | File[]) => {
    if (files.length === 0) return;
    setState('processing');
    setInfo(`正在读取 ${files.length} 个文件...`);

    try {
      let allRows: any[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        allRows = [...allRows, ...jsonData];
      }

      if (allRows.length === 0) throw new Error('表格中没有数据');

      // 这里就是调用我们刚刚写的翻译官！
      const analyzed = analyzeData(allRows);
      onDataLoaded(analyzed);
      
      setState('success');
      setInfo(`成功解析 ${files.length} 个文件`);
    } catch (e: any) {
      setState('error');
      setInfo(e.message || '文件解析失败，请检查格式');
      onDataLoaded(getEmptyData());
    }
  }, [onDataLoaded]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setState('idle');
    if (e.dataTransfer.files.length > 0) processFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setState('dragging');
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(e.target.files);
  };

  return (
    <div
      className={`relative flex items-center gap-4 px-6 py-4 rounded-2xl border-2 transition-all duration-300 ${
        state === 'dragging' ? 'border-indigo-400 bg-indigo-50/50 scale-[1.01]' : 
        state === 'success' ? 'border-emerald-200 bg-emerald-50/50' : 
        state === 'error' ? 'border-red-200 bg-red-50/50' : 
        'border-dashed border-indigo-200 bg-white/60 hover:bg-indigo-50/30'
      }`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={() => state === 'dragging' && setState('idle')}
    >
      <input ref={fileInputRef} type="file" multiple accept=".csv,.xls,.xlsx" className="hidden" onChange={handleFileInput} />

      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm transition-all ${
        state === 'success' ? 'bg-gradient-to-br from-emerald-400 to-teal-500' : 
        state === 'error' ? 'bg-gradient-to-br from-red-400 to-rose-500' : 
        'bg-gradient-to-br from-indigo-500 to-violet-600'
      }`}>
        {state === 'success' ? <CheckCircle size={24} className="text-white" /> : 
         state === 'error' ? <AlertCircle size={24} className="text-white" /> : 
         state === 'processing' ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 
         <Upload size={24} className="text-white" />}
      </div>

      <div className="flex-1 min-w-0">
        {state === 'idle' && (
          <div>
            <p className="text-[15px] font-bold text-slate-700">拖放或点击上传 Excel / CSV 数据文件</p>
            <p className="text-xs text-slate-400 mt-1">支持多文件合并分析 · 本地浏览器解析，数据绝不上传，安全私密</p>
          </div>
        )}
        {state === 'processing' && <p className="text-[15px] font-bold text-slate-700">{info}</p>}
        {state === 'success' && (
          <div>
            <div className="flex items-center gap-2">
              <p className="text-[15px] font-bold text-slate-700">数据载入就绪！</p>
              <span className="text-[11px] font-medium bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full flex items-center gap-1"><Layers size={10} /> {info}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              本次共分析 <strong className="text-indigo-600">{currentData.totalNotes}</strong> 篇笔记 · 涉及 <strong className="text-violet-600">{currentData.influencerCount}</strong> 位达人
            </p>
          </div>
        )}
        {state === 'error' && <p className="text-[15px] font-bold text-red-600">{info}</p>}
      </div>

      <div className="flex-shrink-0">
        <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 text-sm text-white bg-slate-800 hover:bg-slate-900 px-5 py-2.5 rounded-xl transition-all shadow-md font-medium">
          <FileSpreadsheet size={16} /> 选择表格
        </button>
      </div>
    </div>
  );
};
