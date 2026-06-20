/**
 * JustificacaoModal.jsx
 * Localização: src/components/ui/JustificacaoModal.jsx
 *
 * Janela flutuante (modal) de justificação para logs de histórico e segurança.
 * Otimizado com:
 * - Correção de persistência indesejada limpando o estado ao cancelar.
 * - [NOVO] Bloqueio contra justificações vazias ou insignificantes (Mínimo de 5 caracteres).
 * - [NOVO] Contador visual interativo e estilização de botão desativado para UX profissional.
 */

import React, { useState } from 'react';
import { MessageSquare, Send, AlertCircle } from 'lucide-react';
import Button from './Button';

export default function JustificacaoModal({ isOpen, onConfirm, onCancel }) {
  const [motivo, setMotivo] = useState('');
  
  // Mínimo de caracteres exigido para que o log tenha utilidade na auditoria [2]
  const minLength = 5; 

  if (!isOpen) return null;

  /**
   * Executa a confirmação de forma segura limpando o formulário
   */
  const handleConfirm = () => {
    if (motivo.trim().length >= minLength) {
      onConfirm(motivo);
      setMotivo(''); // Limpa o estado para a próxima utilização
    }
  };

  /**
   * Limpa o texto ao cancelar para evitar "herdar" lixo na próxima edição
   */
  const handleCancel = () => {
    setMotivo(''); 
    onCancel();
  };

  const isInvalid = motivo.trim().length < minLength;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center gap-3 mb-4 text-tvde-primary">
          <div className="p-2 bg-blue-50 rounded-lg">
            <MessageSquare size={20} />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Justificar Alteração</h3>
        </div>
        
        <p className="text-sm text-slate-500 mb-4 text-left">
          Para prosseguir, descreva brevemente o que foi alterado e o motivo. O registo é obrigatório e será anexado ao histórico de auditoria [2].
        </p>

        <div className="relative">
          <textarea
            autoFocus
            required
            className={`w-full p-3 border rounded-2xl outline-none transition-all bg-slate-50 min-h-[110px] text-sm ${
              motivo.length > 0 && isInvalid 
                ? 'border-orange-300 focus:ring-orange-500/20' 
                : 'border-slate-200 focus:ring-tvde-primary/20'
            }`}
            placeholder="Ex: Atualização da data de validade da carta após renovação..."
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
          
          {/* Contador de Caracteres Dinâmico e Informativo */}
          <div className="absolute bottom-3 right-3 text-[10px] font-bold select-none">
            {isInvalid ? (
              <span className="text-orange-500 flex items-center gap-1">
                <AlertCircle size={11} /> Mínimo {motivo.trim().length}/{minLength} caracteres
              </span>
            ) : (
              <span className="text-emerald-500">Pronto para guardar!</span>
            )}
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="secondary" className="flex-1 text-xs" onClick={handleCancel}>Cancelar</Button>
          <Button 
            className={`flex-1 text-xs transition-all ${
              isInvalid 
                ? 'opacity-40 cursor-not-allowed bg-slate-200 text-slate-400 border-slate-200' 
                : 'bg-tvde-primary hover:bg-tvde-dark text-white'
            }`}
            disabled={isInvalid} 
            onClick={handleConfirm}
          >
            <Send size={14} /> Confirmar
          </Button>
        </div>
      </div>
    </div>
  );
}