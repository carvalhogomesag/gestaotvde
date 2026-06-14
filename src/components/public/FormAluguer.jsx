/**
 * FormAluguer.jsx
 * Localização: src/components/public/FormAluguer.jsx
 *
 * Secção de captação de leads para aluguer operativo de viaturas TVDE.
 * Contém o escutador de eventos para cliques efetuados no Catálogo de Viaturas.
 */

import React, { useState, useEffect } from 'react';
import { 
  Car, Check, User, Smartphone, Mail, Loader2, 
  CheckCircle2, AlertCircle 
} from 'lucide-react';
import { registarLeadPública } from '../../services/leadService';

export default function FormAluguer() {
  const [leadCarro, setLeadCarro] = useState({ 
    nome: '', 
    email: '', 
    telemovel: '', 
    regiao: 'Lisboa', 
    mensagem: '' 
  });
  const [loadingCarro, setLoadingCarro] = useState(false);
  const [feedbackCarro, setFeedbackCarro] = useState(null);

  // Escuta cliques efetuados no catálogo de veículos para preencher automaticamente o formulário
  useEffect(() => {
    const lidarComSelecaoVeiculo = (e) => {
      const modeloPretendido = e.detail;
      if (modeloPretendido) {
        setLeadCarro(prev => ({
          ...prev,
          mensagem: `Gostaria de solicitar informações de aluguer para a viatura selecionada no vosso catálogo: ${modeloPretendido}`
        }));
        
        // Foca suavemente no formulário ou desloca o ecrã até ele
        const seccaoAluguer = document.getElementById('aluguer');
        if (seccaoAluguer) {
          seccaoAluguer.scrollIntoView({ behavior: 'smooth' });
        }
      }
    };

    window.addEventListener('selecionarVeiculoCatalogo', lidarComSelecaoVeiculo);
    return () => {
      window.removeEventListener('selecionarVeiculoCatalogo', lidarComSelecaoVeiculo);
    };
  }, []);

  const handleSubmeterCarro = async (e) => {
    e.preventDefault();
    setLoadingCarro(true);
    setFeedbackCarro(null);

    try {
      const res = await registarLeadPública({
        nome: leadCarro.nome,
        email: leadCarro.email,
        telemovel: leadCarro.telemovel,
        origem: 'procura_viatura',
        mensagemAdicional: `Procura carro em: ${leadCarro.regiao}. Observações: ${leadCarro.mensagem}`
      });

      setFeedbackCarro(res);
      if (res.sucesso) {
        setLeadCarro({ 
          nome: '', 
          email: '', 
          telemovel: '', 
          regiao: 'Lisboa', 
          mensagem: '' 
        });
      }
    } catch (err) {
      console.error(err);
      setFeedbackCarro({ sucesso: false, msg: "Erro técnico de rede. Tente de novo." });
    } finally {
      setLoadingCarro(false);
    }
  };

  return (
    <section id="aluguer" className="bg-slate-900 text-white py-16 md:py-20 px-4 sm:px-6 border-t border-slate-800">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        
        {/* Lado Esquerdo: Informações de Parcerias */}
        <div className="lg:col-span-6 space-y-6 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
            <Car size={12} />
            Frota de Viaturas TVDE Disponível
          </div>
          <h2 className="text-2xl md:text-3xl font-black leading-tight">Procura uma viatura para trabalhar?</h2>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-xl">
            Asseguramos contacto com operadores licenciados que disponibilizam viaturas em conformidade regulatória nas plataformas, equipadas com seguros TVDE específicos (responsabilidade civil e passageiros), Via Verde e cartões de desconto de combustível.
          </p>
          <div className="space-y-3 text-xs font-semibold text-slate-200">
            <p className="flex items-center gap-2">
              <Check size={14} className="text-emerald-500 shrink-0" /> 
              <span>Manutenção e Oficina a cargo do Operador parceiro</span>
            </p>
            <p className="flex items-center gap-2">
              <Check size={14} className="text-emerald-500 shrink-0" /> 
              <span>Cobertura total de Seguros de Passageiros e Ocupantes</span>
            </p>
            <p className="flex items-center gap-2">
              <Check size={14} className="text-emerald-500 shrink-0" /> 
              <span>Modelos económicos e elétricos de alta autonomia</span>
            </p>
          </div>
        </div>

        {/* Lado Direito: Formulário de Procura */}
        <div className="lg:col-span-6 bg-white text-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl max-w-md mx-auto w-full">
          <h4 className="text-lg font-black text-slate-900">Encontrar Viatura Disponível</h4>
          <p className="text-slate-400 text-xs mt-1 mb-4 leading-relaxed">
            Diga-nos em que zona do país pretende trabalhar para encontrarmos as melhores viaturas de operadores parceiros disponíveis na sua região.
          </p>

          <form onSubmit={handleSubmeterCarro} className="space-y-3.5 text-left">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                required 
                placeholder="Nome completo"
                value={leadCarro.nome}
                onChange={e => setLeadCarro({ ...leadCarro, nome: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="relative">
                <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="tel" 
                  required 
                  placeholder="Telemóvel"
                  value={leadCarro.telemovel}
                  onChange={e => setLeadCarro({ ...leadCarro, telemovel: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div className="flex flex-col justify-center">
                <select 
                  value={leadCarro.regiao}
                  onChange={e => setLeadCarro({ ...leadCarro, regiao: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="Lisboa">Grande Lisboa</option>
                  <option value="Porto">Grande Porto</option>
                  <option value="Braga">Braga / Minho</option>
                  <option value="Algarve">Algarve</option>
                </select>
              </div>
            </div>

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="email" 
                required 
                placeholder="Endereço de email"
                value={leadCarro.email}
                onChange={e => setLeadCarro({ ...leadCarro, email: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <textarea 
              placeholder="Observações ou preferência de modelo (ex: Renault Leaf, Zoe, Dacia Jogger)..."
              value={leadCarro.mensagem}
              onChange={e => setLeadCarro({ ...leadCarro, mensagem: e.target.value })}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 h-16 resize-none"
            />

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

          {feedbackCarro && (
            <div className={`mt-4 flex items-center gap-2 text-xs font-semibold rounded-xl px-3 py-2 border ${
              feedbackCarro.sucesso 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                : 'bg-red-50 text-red-700 border-red-100'
            }`}>
              {feedbackCarro.sucesso ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
              <span>{feedbackCarro.msg}</span>
            </div>
          )}
        </div>

      </div>
    </section>
  );
}