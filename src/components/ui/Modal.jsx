/**
 * Modal.jsx
 * Localização: src/components/ui/Modal.jsx
 *
 * Contentor universal para janelas pop-up e formulários do ERP.
 * Atualizado com suporte responsivo:
 * - Centro do ecrã com largura máxima de 4xl no desktop
 * - Bottom-sheet deslizável (gaveta de ecrã parcial de 90vh) com scroll interno no mobile
 */

import React from 'react';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
    // ◄ ALTERADO: Alinhamento fluido (ao fundo no mobile, ao centro no computador)
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      
      {/* ◄ ADICIONADO: Área clicável de segurança para fechar o modal ao clicar fora */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* ◄ ALTERADO: Formato da gaveta responsiva, limites de altura máxima e animação */}
      <div className="relative bg-white rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[90vh] sm:max-h-[92vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
        
        {/* Cabeçalho do Modal (Fixo no topo) */}
        <div className="flex justify-between items-center p-5 sm:p-6 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <h3 className="text-base sm:text-lg font-black text-slate-800 truncate pr-4">{title}</h3>
          <button 
            type="button"
            onClick={onClose} 
            className="p-2 hover:bg-white rounded-full text-slate-400 hover:text-slate-600 transition-all shadow-sm border border-transparent hover:border-slate-200 cursor-pointer shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* ◄ ALTERADO: Scroll Y dedicado e padding otimizado para ecrãs pequenos */}
        <div className="p-4 sm:p-8 overflow-y-auto flex-1 custom-scrollbar">
          {children}
        </div>

      </div>
    </div>
  );
}