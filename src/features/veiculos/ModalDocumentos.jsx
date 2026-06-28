import React from 'react';
import { X, Eye, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import Button from '../../components/ui/Button';
import FileUpload from '../../components/ui/FileUpload';
import DatePicker from '../../components/ui/DatePicker';

export default function ModalDocumentos({ isOpen, onClose, formData, setFormData, isReadOnly }) {
  const DocumentCardLocal = ({ label, fileUrl, dateField, folder, uploadField }) => (
    <div className={`p-3 rounded-2xl border transition-all text-left flex flex-col h-full ${fileUrl ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50 border-dashed border-slate-300'}`}>
      <div className="flex justify-between items-start mb-2 shrink-0">
        <div className="flex items-center gap-2">
          {fileUrl ? <CheckCircle2 size={14} className="text-green-500" /> : <AlertCircle size={14} className="text-slate-300" />}
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-tight">{label}</span>
        </div>
        {fileUrl && (
          <div className="flex gap-1 select-none">
            <a href={fileUrl} target="_blank" rel="noreferrer" className="p-1 text-slate-400 hover:text-tvde-primary hover:bg-slate-100 rounded transition-all"><Eye size={12} /></a>
            {!isReadOnly && <button type="button" onClick={() => { if (window.confirm("Remover ficheiro?")) setFormData({...formData, [uploadField]: ''}); }} className="p-1 text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded transition-all"><Trash2 size={12} /></button>}
          </div>
        )}
      </div>
      
      {fileUrl && uploadField === "fotoUrl" && (
        <div className="my-2 w-full h-24 rounded-xl overflow-hidden border border-slate-100 bg-slate-100 flex items-center justify-center shrink-0">
          <img src={fileUrl} alt="Viatura" className="w-full h-full object-cover" />
        </div>
      )}

      <div className="mt-auto space-y-2">
        {!isReadOnly && !fileUrl && <FileUpload label="Carregar" folder={folder} onUploadComplete={(url) => setFormData({...formData, [uploadField]: url})} />}
        {dateField && <div className="pt-1.5 border-t border-slate-100"><DatePicker label="Validade" value={formData[dateField]} onChange={(val) => setFormData({...formData, [dateField]: val})} isReadOnly={isReadOnly} /></div>}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-white rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden p-6 sm:p-8 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 text-left">
        <button type="button" onClick={onClose} className="absolute top-4 right-4 p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600 rounded-full transition-all cursor-pointer"><X size={18} /></button>
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-4 border-b border-slate-100 pb-3 select-none"><FileText size={18} className="text-blue-500" /> Documentação & Foto da Viatura</h3>
        
        <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <DocumentCardLocal label="DUA" folder="veiculos/dua" uploadField="docDUA" fileUrl={formData.docDUA} />
            <DocumentCardLocal label="Seguro" folder="veiculos/seguros" uploadField="docSeguro" fileUrl={formData.docSeguro} dateField="validadeSeguro" />
            <DocumentCardLocal label="IPO" folder="veiculos/ipo" uploadField="docIPO" fileUrl={formData.docIPO} dateField="validadeIPO" />
            <DocumentCardLocal label="Foto da Viatura" folder="veiculos/fotos" uploadField="fotoUrl" fileUrl={formData.fotoUrl} />
          </div>
        </div>
        <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end shrink-0">
          <Button type="button" onClick={onClose} className="px-6 h-10 text-xs shadow-md">Confirmar e Fechar</Button>
        </div>
      </div>
    </div>
  );
}