import React from 'react';
import ReactDOM from 'react-dom/client';

function App() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center">
        <h1 className="text-2xl font-bold text-indigo-600 mb-2">🚀 Vercel 部署通关！</h1>
        <p className="text-slate-500">底层框架已搭建完毕，随时可以开始注入业务代码。</p>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
