/**
 * PlanoModal.jsx
 * Localização: src/components/public/PlanoModal.jsx
 *
 * Gaveta/Modal de checkout de assessoria TVDE adaptado para suportar carrinhos de compras.
 */

import React, { useState, useEffect } from 'react';
import { X, ArrowRight, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { registarLeadPública } from '../../services/leadService';
import { formatCurrency } from '../../utils/formatters';

export default function PlanoModal({ isOpen, onClose, plano, dadosCarrinho }) {
  const [leadPlano, setLeadPlano] = useState({ 
    nome: '', 
    email: '', 
    telemovel: '', 
    mensagem: '' 
  });
  const [loadingPlano, setLoadingPlano] = useState(false);
  const [feedbackPlano, setFeedbackPlano] = useState(null);

  // Preenche a mensagem padrão dinamicamente sempre que o plano selecionado muda ou o modal abre
  useEffect(() => {
    if (isOpen && plano) {
      // Caso seja um pacote construído de forma personalizada pelo carrinho
      const msgInicial = dadosCarrinho?.mensagemSuporte
        ? `Solicito orçamento e validação para o meu pacote personalizado. ${dadosCarrinho.mensagemSuporte}`
        : `Gostaria de obter informações detalhadas para aderir ao vosso ${plano}.`;

      setLeadPlano({
        nome: '',
        email: '',
        telemovel: '',
        mensagem: msgInicial
      });
      setFeedbackPlano(null);
    }
  }, [isOpen, plano, dadosCarrinho]);

  const handleSubmeterLeadPlano = async (e) => {
    e.preventDefault();
    setLoadingPlano(true);
    setFeedbackPlano(null);

    try {
      const res = await registarLeadPública({
        nome: leadPlano.nome,
        email: leadPlano.email,
        telemovel: leadPlano.telemovel,
        origem: 'servicos_assessoria', // Filtro automático para CRM de Assessoria
        mensagemAdicional: leadPlano.mensagem,
        itensSelecionados: dadosCarrinho?.itensSelecionados || [], // Passagem do carrinho de IDs
        precoTotal: dadosCarrinho?.precoTotal || null              // Preço total para processamento futuro Stripe
      });

      setFeedbackPlano(res);
      if (res.sucesso) {
        setLeadPlano({ nome: '', email: '', telemovel: '', mensagem: '' });
        // Fecha o modal suavemente após 2.2 segundos para dar tempo ao feedback de sucesso
        setTimeout(() => {
          onClose();
        }, 2200);
      }
    } catch (err) {
      console.error('[PlanoModal] Erro ao submeter lead de assessoria:', err);
      setFeedbackPlano({ sucesso: false, msg: "Erro técnico de rede. Tente de novo." });
    } finally {
      setLoadingPlano(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-fade-in">
      {/* Backdrop Clicável */}
      <div className="absolute inset-0" onClick={onClose} />
      
      {/* Caixa do Modal (Gaveta responsiva móvel / modal desktop) */}
      <div className="relative bg-white rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 p-6 sm:p-8 text-slate-800 text-left">
        
        {/* Botão de Fechar */}
        <button 
          type="button" 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Cabeçalho */}
        <div className="space-y-2 mb-6">
          <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full">
            {dadosCarrinho?.itensSelecionados ? 'Checkout Carrinho' : 'Reservar Assessoria'}
          </span>
          <h3 className="text-xl font-black text-slate-950 pt-2 leading-tight flex items-center justify-between gap-2">
            <span>{plano}</span>
            {dadosCarrinho?.precoTotal > 0 && (
              <span className="text-lg font-black text-indigo-600 shrink-0 bg-indigo-50 px-2.5 py-1 rounded-xl">
                {formatCurrency(dadosCarrinho.precoTotal)}
              </span>
            )}
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Preencha os seus dados de contacto abaixo para validarmos o seu processo documental e darmos início à sua preparação TVDE.
          </p>
        </div>

        {/* Formulário CRM dedicado a Serviços */}
        <form onSubmit={handleSubmeterLeadPlano} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">O seu nome *</label>
            <input 
              type="text" 
              required 
              placeholder="Nome completo"
              value={leadPlano.nome}
              onChange={e => setLeadPlano({ ...leadPlano, nome: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Telemóvel *</label>
              <input 
                type="tel" 
                required 
                placeholder="ex: 912 345 678"
                value={leadPlano.telemovel}
                onChange={e => setLeadPlano({ ...leadPlano, telemovel: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Email *</label>
              <input 
                type="email" 
                required 
                placeholder="Endereço de email"
                value={leadPlano.email}
                onChange={e => setLeadPlano({ ...leadPlano, email: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Questão / Detalhes (Opcional)</label>
            <textarea 
              value={leadPlano.mensagem}
              onChange={e => setLeadPlano({ ...leadPlano, mensagem: e.target.value })}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 h-20 resize-none transition-all"
            />
          </div>

          <button 
            type="submit"
            disabled={loadingPlano}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-40 cursor-pointer"
          >
            {loadingPlano ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <ArrowRight size={14} />
            )}
            Enviar
          </button>
        </form>

        {/* Feedback */}
        {feedbackPlano && (
          <div className={`mt-4 flex items-center gap-2 text-xs font-semibold rounded-xl px-3 py-3 border ${
            feedbackPlano.sucesso 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
              : 'bg-red-50 text-red-700 border-red-100'
          }`}>
            {feedbackPlano.sucesso ? <CheckCircle2 size={14} className="shrink-0" /> : <AlertCircle size={14} className="shrink-0" />}
            <span className="leading-tight text-[11px]">{feedbackPlano.msg}</span>
          </div>
        )}

      </div>
    </div>
  );
}