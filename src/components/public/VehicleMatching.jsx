/**
 * VehicleMatching.jsx
 * Localização: src/components/public/VehicleMatching.jsx
 *
 * Secção pública modular que apresenta os serviços de aluguer de viaturas TVDE
 * licenciadas e recolhe leads de motoristas à procura de carro para trabalhar.
 */

import React, { useState } from 'react';
import { 
  Car, Check, Loader2, Mail, Smartphone, User, AlertCircle, CheckCircle2 
} from 'lucide-react';
import { registarLeadPública } from '../../services/leadService';

export default function VehicleMatching() {
  const [leadCarro, setLeadCarro] = useState({ 
    nome: '', 
    email: '', 
    telemovel: '', 
    regiao: 'Lisboa', 
    mensagem: '' 
  });
  const [loadingCarro, setLoadingCarro] = useState(false);
  const [feedbackCarro, setFeedbackCarro] = useState(null);

  const handleSubmeterCarro = async (e) => {
    e.preventDefault();
    setLoadingCarro(true);
    setFeedbackCarro(null);

    try {
      console.log("[VehicleMatching] A iniciar submissão de lead de aluguer...");
      
      const res = await registarLeadPública({
        nome: leadCarro.nome,
        email: leadCarro.email,
        telemovel: leadCarro.telemovel,
        origem: 'procura_viatura',
        mensagemAdicional: `Procura viatura em: ${leadCarro.regiao}. Preferências: ${leadCarro.mensagem}`
      });

      setFeedbackCarro(res);

      if (res.sucesso) {
        // Limpar formulário se gravado com sucesso no Firestore
        setLeadCarro({ 
          nome: '', 
          email: '', 
          telemovel: '', 
          regiao: 'Lisboa', 
          mensagem: '' 
        });
      }
    } catch (err) {
      console.error("[VehicleMatching] Erro técnico na submissão:", err);
      setFeedbackCarro({ 
        sucesso: false, 
        msg: "Não foi possível registar o seu pedido neste momento. Tente de novo." 
      });
    } finally {
      setLoadingCarro(false);
    }
  };

  return (
    <section id="aluguer" className="bg-slate-900 text-white py-20 px-6">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        {/* Lado Esquerdo: Proposta de Valor da Frota Parceira */}
        <div className="lg:col-span-7 space-y-6 text-left animate-in fade-in duration-300">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
            <Car size={12} />
            Frota Licenciada & Disponível
          </div>
          <h2 className="text-3xl md:text-4xl font-black leading-tight tracking-tight">
            Procura uma viatura certificada para trabalhar?
          </h2>
          <p className="text-slate-300 text-sm md:text-base leading-relaxed max-w-xl font-medium">
            Através da nossa rede de operadores parceiros licenciados pelo IMT, facilitamos o acesso a viaturas prontas a operar nas plataformas Uber e Bolt, preparadas com toda a cobertura e conformidade legal necessária em Portugal.
          </p>
          
          {/* Vantagens operacionais específicas do ecossistema PT */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold text-slate-200">
            <div className="flex items-center gap-2">
              <Check size={14} className="text-emerald-500 shrink-0" />
              <span>Manutenções a cargo do operador</span>
            </div>
            <div className="flex items-center gap-2">
              <Check size={14} className="text-emerald-500 shrink-0" />
              <span>Seguros TVDE de passageiros incluídos</span>
            </div>
            <div className="flex items-center gap-2">
              <Check size={14} className="text-emerald-500 shrink-0" />
              <span>Via Verde ativa em todas as viaturas</span>
            </div>
            <div className="flex items-center gap-2">
              <Check size={14} className="text-emerald-500 shrink-0" />
              <span>Descontos em cartões de combustível/elétrico</span>
            </div>
          </div>
        </div>

        {/* Lado Direito: Formulário de Captação para Aluguer */}
        <div className="lg:col-span-5 bg-white text-slate-800 rounded-3xl p-6 shadow-xl max-w-md mx-auto w-full animate-in fade-in duration-300">
          <h4 className="text-lg font-black text-slate-900 leading-tight">Encontrar Viatura Disponível</h4>
          <p className="text-slate-500 text-xs mt-1 mb-4 leading-relaxed">
            Selecione a sua região e indique as suas preferências para que possamos apresentar-lhe as viaturas de frota disponíveis na sua zona.
          </p>

          <form onSubmit={handleSubmeterCarro} className="space-y-3.5 text-left">
            {/* Nome */}
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                required 
                placeholder="Nome completo"
                value={leadCarro.nome}
                onChange={e => setLeadCarro({ ...leadCarro, nome: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            {/* Email */}
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="email" 
                required 
                placeholder="Endereço de email"
                value={leadCarro.email}
                onChange={e => setLeadCarro({ ...leadCarro, email: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Telemóvel */}
              <div className="relative">
                <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="tel" 
                  required 
                  placeholder="Telemóvel contactável"
                  value={leadCarro.telemovel}
                  onChange={e => setLeadCarro({ ...leadCarro, telemovel: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {/* Região PT */}
              <div className="flex flex-col justify-center">
                <select 
                  value={leadCarro.regiao}
                  onChange={e => setLeadCarro({ ...leadCarro, regiao: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  <option value="Lisboa">Grande Lisboa</option>
                  <option value="Porto">Grande Porto</option>
                  <option value="Braga">Minho / Braga</option>
                  <option value="Algarve">Algarve</option>
                </select>
              </div>
            </div>

            {/* Mensagem / Preferências de Viaturas */}
            <textarea 
              placeholder="Preferência de modelo ou regime (ex: Renault Zoe, Nissan Leaf, Dacia Jogger GPL, Full-time)..."
              value={leadCarro.mensagem}
              onChange={e => setLeadCarro({ ...leadCarro, mensagem: e.target.value })}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 h-16 resize-none"
            />

            {/* Submissão */}
            <button 
              type="submit"
              disabled={loadingCarro}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-40 cursor-pointer"
            >
              {loadingCarro ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Car size={14} />
              )}
              Solicitar Viatura de Aluguer
            </button>
          </form>

          {/* Feedback Reativo do Firebase */}
          {feedbackCarro && (
            <div className={`mt-4 flex items-center gap-2 text-xs font-semibold rounded-xl px-3 py-2.5 border ${
              feedbackCarro.sucesso 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                : 'bg-red-50 text-red-700 border-red-100'
            }`}>
              {feedbackCarro.sucesso ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
              {feedbackCarro.msg}
            </div>
          )}
        </div>

      </div>
    </section>
  );
}