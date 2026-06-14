/**
 * ServicosTabs.jsx
 * Localização: src/components/public/ServicosTabs.jsx
 *
 * Seletor de abas interativo para os serviços dedicados a motoristas e proprietários.
 */

import React, { useState } from 'react';
import { BookOpen, Car } from 'lucide-react';

export default function ServicosTabs() {
  const [abaServicos, setAbaServicos] = useState('motoristas'); // 'motoristas' | 'proprietarios'

  return (
    <section id="servicos" className="py-16 md:py-20 px-4 sm:px-6 max-w-6xl mx-auto space-y-10">
      <div className="text-center space-y-2 max-w-xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-black text-slate-900">Nossos Serviços</h2>
        <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
          Soluções completas desenhadas para apoiar tanto quem conduz profissionalmente como quem gere frotas parceiras em Portugal.
        </p>
      </div>

      {/* Seletor de Abas de Serviços (Responsivo) */}
      <div className="flex justify-center gap-3 bg-slate-100 p-1.5 rounded-2xl w-fit mx-auto select-none shrink-0">
        <button
          type="button"
          onClick={() => setAbaServicos('motoristas')}
          className={`px-5 sm:px-6 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            abaServicos === 'motoristas' 
              ? 'bg-slate-950 text-white shadow-md' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          🙋‍♂️ Para Motoristas
        </button>
        <button
          type="button"
          onClick={() => setAbaServicos('proprietarios')}
          className={`px-5 sm:px-6 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            abaServicos === 'proprietarios' 
              ? 'bg-slate-950 text-white shadow-md' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          🏢 Para Proprietários
        </button>
      </div>

      {/* Conteúdo Aba A: Motoristas */}
      {abaServicos === 'motoristas' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 text-center space-y-6 max-w-3xl mx-auto relative overflow-hidden animate-in fade-in duration-300">
          <div className="absolute top-4 right-4 bg-amber-100 text-amber-800 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider shrink-0">
            Em Breve
          </div>
          <div className="max-w-md mx-auto space-y-4">
            <BookOpen size={40} className="text-blue-600 mx-auto" />
            <h3 className="text-xl font-black text-slate-900">Área Dedicada ao Motorista</h3>
            <p className="text-slate-500 text-xs sm:text-sm leading-relaxed text-center">
              Estamos a estruturar um portal de apoio onde poderá submeter faturas semanais de combustível, gerir despesas operacionais de portagens, acompanhar quitações e depósitos de caução parametrizados como crédito, e aceder a relatórios automatizados.
            </p>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-[11px] font-semibold text-slate-500">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping shrink-0"></span>
              Fase de modelagem técnica e regulatória
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo Aba B: Proprietários */}
      {abaServicos === 'proprietarios' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 text-center space-y-6 max-w-3xl mx-auto relative overflow-hidden animate-in fade-in duration-300">
          <div className="absolute top-4 right-4 bg-amber-100 text-amber-800 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider shrink-0">
            Em Breve
          </div>
          <div className="max-w-md mx-auto space-y-4">
            <Car size={40} className="text-indigo-600 mx-auto" />
            <h3 className="text-xl font-black text-slate-900">Portal de Gestão de Frotas (Operadores)</h3>
            <p className="text-slate-500 text-xs sm:text-sm leading-relaxed text-center">
              Um painel administrativo para proprietários de frotas parceiras acompanharem a rentabilidade operacional, controlo técnico de manutenção, processamentos financeiros semanais e atribuição automática de cartões de abastecimento e Via Verde.
            </p>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-[11px] font-semibold text-slate-500">
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping shrink-0"></span>
              Fase de modelagem técnica e regulatória
            </div>
          </div>
        </div>
      )}
    </section>
  );
}