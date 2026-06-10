import React from 'react';
import { FileText, Calendar, Eye, UploadCloud, CheckCircle2, AlertCircle } from 'lucide-react';
import FileUpload from './FileUpload';

export default function DocumentCard({ 
  label, 
  fileUrl, 
  expiryDate, 
  onUpload, 
  onDateChange, 
  isReadOnly,
  folder 
}) {
  const hasFile = !!fileUrl;

  return (
    <div className={`group relative p-4 rounded-2xl border transition-all duration-200 ${
      hasFile ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50/50 border-dashed border-slate-300'
    }`}>
      {/* Cabeçalho do Card */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${hasFile ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
            {hasFile ? <CheckCircle2 size={18} /> : <FileText size={18} />}
          </div>
          <span className="text-sm font-bold text-slate-700">{label}</span>
        </div>
        
        {hasFile && (
          <a 
            href={fileUrl} 
            target="_blank" 
            rel="noreferrer"
            className="p-1.5 text-tvde-primary hover:bg-blue-50 rounded-lg transition-colors"
            title="Visualizar"
          >
            <Eye size={18} />
          </a>
        )}
      </div>

      {/* Área de Conteúdo */}
      <div className="space-y-3">
        {/* Se não houver ficheiro e não for apenas leitura, mostra o upload */}
        {!hasFile && !isReadOnly ? (
          <FileUpload 
            label="Carregar Ficheiro" 
            folder={folder} 
            onUploadComplete={onUpload}
          />
        ) : hasFile && !isReadOnly ? (
          <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
             <span>Ficheiro guardado</span>
             <FileUpload 
                label={<span className="text-tvde-primary hover:underline cursor-pointer font-bold">Substituir</span>}
                folder={folder} 
                onUploadComplete={onUpload}
                showStatus={false}
              />
          </div>
        ) : null}

        {/* Campo de Data (se aplicável) */}
        {onDateChange !== undefined && (
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2 mb-1">
              <Calendar size={12} className="text-slate-400" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Validade</span>
            </div>
            <input 
              type="date" 
              readOnly={isReadOnly}
              className={`w-full p-2 text-xs rounded-xl border outline-none transition-all ${
                isReadOnly 
                ? 'bg-transparent border-transparent font-bold text-slate-700' 
                : 'bg-white border-slate-200 focus:ring-2 focus:ring-tvde-primary/20'
              }`}
              value={expiryDate || ''} 
              onChange={(e) => onDateChange(e.target.value)} 
            />
          </div>
        )}
      </div>
    </div>
  );
}