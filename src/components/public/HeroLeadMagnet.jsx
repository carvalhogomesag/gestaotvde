/**
 * HeroLeadMagnet.jsx
 * Localização: src/components/public/HeroLeadMagnet.jsx
 *
 * Secção inicial de destaque (Hero) com formulário integrado de opt-in (Lead Magnet)
 * para recolha de contactos em troca do e-book de Onboarding TVDE em Portugal.
 */

import React, { useState } from 'react';
import { 
  Shield, Check, BookOpen, User, Mail, 
  Smartphone, Loader2, FileText, AlertCircle, CheckCircle2 
} from 'lucide-react';
import { registarLeadPública } from '../../services/leadService';
import { formatCurrency } from '../../utils/formatters';

export default function HeroLeadMagnet() {
  const [lead, setLead] = useState({ nome: '', email: '', telemovel: '' });
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const handleSubmeter = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);

    try {
      console.log("[HeroLeadMagnet] A iniciar submissão de lead pública...");
      
      const res = await registarLeadPública({
        nome: lead.nome,
        email: lead.email,
        telemovel: lead.telemovel,
        origem: 'isca_ebook',
        mensagemAdicional: 'Solicitou download do e-book Guia de Onboarding.'
      });

      setFeedback(res);

      if (res.sucesso) {
        // Limpar formulário se a gravação no Firestore for bem-sucedida
        setLead({ nome: '', email: '', telemovel: '' });
      }
    } catch (err) {
      console.error("[HeroLeadMagnet] Erro ao submeter lead:", err);
      setFeedback({ 
        sucesso: false, 
        msg: "Não foi possível processar o seu pedido de momento. Tente novamente." 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <header className="relative py-16 md:py-24 px-6 bg-radial from-slate-900 to-slate-950 text-white overflow-hidden">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        {/* Lado Esquerdo: Proposta de Valor e Autoridade */}
        <div className="lg:col-span-7 space-y-6 text-left animate-in fade-in slide-in-from-left-4 duration-300">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold">
            <Shield size={12} />
            Assessoria TVDE Estruturada em Portugal
          </div>
          <h1 className="text-4xl md:text-5xl font-black leading-tight tracking-tight">
            Torne-se Motorista TVDE de forma simples e organizada
          </h1>
          <p className="text-slate-300 text-base md:text-lg font-medium leading-relaxed max-w-xl">
            Apoiamos em todas as etapas regulatórias do mercado nacional: exames médicos Grupo 2, psicotécnicos, curso certificado homologado de 50h, e averbamento do código 997 na sua carta.
          </p>
          
          {/* Indicadores e Checkpoints de Conformidade Legal */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4 text-xs font-semibold">
            <div className="flex items-center gap-2">
              <Check className="text-indigo-500 shrink-0" size={16} />
              <span>Formação Homologada IMT</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="text-indigo-500 shrink-0" size={16} />
              <span>Parceiro Licenciado Oficial</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="text-indigo-500 shrink-0" size={16} />
              <span>Integração Rápida nas Plataformas</span>
            </div>
          </div>
        </div>

        {/* Lado Direito: Formulário de Conversão e Captura (Lead Magnet) */}
        <div className="lg:col-span-5 bg-white text-slate-800 rounded-3xl p-6 shadow-2xl border border-slate-100 max-w-md mx-auto w-full animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="flex items-center gap-2 text-indigo-600 mb-2">
            <BookOpen size={20} />
            <span className="text-[10px] font-black uppercase tracking-wider">Acesso Gratuito</span>
          </div>
          <h3 className="text-lg font-black text-slate-900">Descarregue o Guia de Onboarding</h3>
          <p className="text-slate-500 text-xs mt-1 mb-4 leading-relaxed">
            Introduza o seu contacto para descarregar o manual passo a passo com todos os prazos, custos do IMT e requisitos legais para iniciar a atividade TVDE.
          </p>

          <form onSubmit={handleSubmeter} className="space-y-3.5 text-left">
            {/* Nome Completo */}
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                required 
                placeholder="O seu nome completo"
                value={lead.nome}
                onChange={e => setLead({ ...lead, nome: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            {/* Email de Contacto */}
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="email" 
                required 
                placeholder="O seu endereço de email principal"
                value={lead.email}
                onChange={e => setLead({ ...lead, email: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            {/* Telemóvel PT */}
            <div className="relative">
              <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="tel" 
                required 
                placeholder="Telemóvel (ex: 912345678)"
                value={lead.telemovel}
                onChange={e => setLead({ ...lead, telemovel: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            {/* Botão de Chamativo de Ação */}
            <button 
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-40 cursor-pointer"
            >
              {loading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <FileText size={14} />
              )}
              Descarregar Guia de Onboarding (PDF)
            </button>
          </form>

          {/* Área Reativa de Feedbacks de Validação do Firebase */}
          {feedback && (
            <div className={`mt-4 flex items-center gap-2 text-xs font-semibold rounded-xl px-3 py-2.5 border ${
              feedback.sucesso 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                : 'bg-red-50 text-red-700 border-red-100'
            }`}>
              {feedback.sucesso ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
              {feedback.msg}
            </div>
          )}
        </div>

      </div>
    </header>
  );
}