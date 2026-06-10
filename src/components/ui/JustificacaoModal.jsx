import React, { useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import Button from './Button';

export default function JustificacaoModal({ isOpen, onConfirm, onCancel }) {
  const [motivo, setMotivo] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center gap-3 mb-4 text-tvde-primary">
          <div className="p-2 bg-blue-50 rounded-lg">
            <MessageSquare size={20} />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Justificar Alteração</h3>
        </div>
        
        <p className="text-sm text-slate-500 mb-4">
          Para prosseguir, descreva brevemente o que foi alterado e o motivo.
        </p>

        <textarea
          autoFocus
          required
          className="w-full p-3 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-tvde-primary/20 bg-slate-50 min-h-[100px] text-sm"
          placeholder="Ex: Atualização da data de validade da carta após renovação..."
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
        />

        <div className="flex gap-3 mt-6">
          <Button variant="secondary" className="flex-1" onClick={onCancel}>Cancelar</Button>
          <Button 
            className="flex-1" 
            disabled={!motivo.trim()} 
            onClick={() => { onConfirm(motivo); setMotivo(''); }}
          >
            <Send size={16} /> Confirmar
          </Button>
        </div>
      </div>
    </div>
  );
}