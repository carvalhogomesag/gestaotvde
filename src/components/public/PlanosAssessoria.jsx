/**
 * PlanosAssessoria.jsx
 * Localização: src/components/public/PlanosAssessoria.jsx
 *
 * Secção pública com os pacotes e serviços individuais de assessoria regulatória TVDE.
 * Totalmente integrado com a base de dados Firestore em tempo real.
 */

import React, { useState, useEffect } from 'react';
import { Check, ShieldCheck, Loader2 } from 'lucide-react';
import { db } from '../../firebase';
import { obterPlanosAssessoria } from '../../services/assessoriaService';
import { formatCurrency } from '../../utils/formatters';

// Checklists estáticas padrão associadas aos IDs de inicialização (Seed)
const CHECKLISTS_PADRAO = {
  'p-essencial': [
    'Apoio na escolha de Escolas TVDE',
    'Orientação para Psicotécnicos',
    'Guia de instrução para as aplicações'
  ],
  'p-avancado': [
    'Apoio para providenciar exames de Grupo 2',
    'Organização de ficheiros e submissão no IMT',
    'Instrução de averbamento do código 997'
  ],
  'p-premium': [
    'Todo o apoio documental e IMT incluído',
    'Apoio na criação de contas Uber e Bolt',
    'Instrução prática do funcionamento das aplicações'
  ]
};

export default function PlanosAssessoria({ onEscolherPlano }) {
  const [planos, setPlanos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const carregarPlanos = async () => {
      try {
        const todos = await obterPlanosAssessoria(db);
        // Filtra apenas os planos e serviços ativos no ERP
        const ativos = todos.filter(p => p.ativo !== false);
        setPlanos(ativos);
      } catch (err) {
        console.error('[PlanosAssessoria] Erro ao obter planos do Firestore:', err);
      } finally {
        setLoading(false);
      }
    };
    carregarPlanos();
  }, []);

  // Separa os pacotes dos trâmites avulsos
  const pacotes = planos.filter(p => p.tipo === 'pacote');
  const servicosAvulsos = planos.filter(p => p.tipo === 'avulso');

  // Determina qual a checklist a exibir para cada pacote de forma resiliente
  const obterItensChecklist = (plano) => {
    if (CHECKLISTS_PADRAO[plano.id]) {
      return CHECKLISTS_PADRAO[plano.id];
    }
    // Caso o administrador crie um pacote novo personalizado, tentamos extrair pontos
    if (plano.descricao) {
      const frases = plano.descricao.split(/[.,;]/).map(f => f.trim()).filter(f => f.length > 5);
      if (frases.length >= 2) return frases.slice(0, 3);
    }
    // Fallback genérico caso a descrição seja curta
    return [
      'Apoio técnico e regulatório personalizado',
      'Validação documental completa',
      'Suporte prioritário via WhatsApp / Email'
    ];
  };

  return (
    <section id="planos" className="py-16 md:py-20 px-4 sm:px-6 max-w-6xl mx-auto space-y-12 md:space-y-16 border-t border-slate-200">
      
      {/* Cabeçalho de Secção */}
      <div className="text-center space-y-2 max-w-xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-black text-slate-900">Pacotes de Apoio à sua medida</h2>
        <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
          Escolha o nível de assessoria e acompanhamento ideal para estruturar a sua formação, organizar documentos no IMT e ativar as suas contas [1].
        </p>
      </div>

      {loading && planos.length === 0 ? (
        <div className="flex justify-center items-center py-12 text-slate-400 gap-2">
          <Loader2 size={18} className="animate-spin text-blue-600" />
          <span className="text-xs font-bold">A sincronizar preços e pacotes com a base de dados...</span>
        </div>
      ) : (
        <div className="space-y-16">
          
          {/* 1. Grelha de Pacotes Principais */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {pacotes.map((plano) => {
              // O Plano Avançado é destacado como "Mais Solicitado"
              const eAvançado = plano.id === 'p-avancado' || plano.nome.toLowerCase().includes('avançado');
              const itens = obterItensChecklist(plano);

              return (
                <div 
                  key={plano.id}
                  className={`bg-white rounded-2xl p-5 sm:p-6 flex flex-col justify-between space-y-6 select-none relative ${
                    eAvançado 
                      ? 'border-2 border-blue-600 shadow-sm' 
                      : 'border border-slate-200 hover:shadow-md transition-shadow'
                  }`}
                >
                  {eAvançado && (
                    <span className="absolute top-0 right-6 -translate-y-1/2 bg-blue-600 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-xs">
                      Mais Solicitado
                    </span>
                  )}

                  <div className="space-y-4 text-left">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      {eAvançado ? 'Plano Avançado' : 'Assessoria Regulamentar'}
                    </span>
                    <h3 className="text-xl font-black text-slate-900">{plano.nome}</h3>
                    <p className="text-slate-500 text-xs leading-relaxed min-h-[48px]">
                      {plano.descricao}
                    </p>
                    
                    <ul className="space-y-2 pt-2 text-xs text-slate-600 font-medium">
                      {itens.map((item, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <Check className="text-blue-500 shrink-0" size={14} /> 
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="text-left relative mt-auto pt-4 border-t border-slate-50">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Investimento único</p>
                    <p className={`text-2xl font-black ${eAvançado ? 'text-blue-600' : 'text-slate-900'}`}>
                      {formatCurrency(plano.preco)}
                    </p>
                    
                    <button
                      type="button"
                      onClick={() => onEscolherPlano(plano.nome)}
                      className={`w-full mt-3 py-2.5 font-bold rounded-xl text-xs transition-colors cursor-pointer uppercase tracking-wider ${
                        eAvançado 
                          ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                          : 'bg-slate-900 hover:bg-blue-600 text-white'
                      }`}
                    >
                      Tenho Interesse
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 2. Secção de Serviços Individuais / Avulsos */}
          {servicosAvulsos.length > 0 && (
            <div className="pt-6 border-t border-slate-100 space-y-6">
              <div className="text-left max-w-xl">
                <h4 className="text-md font-black text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="text-indigo-600" size={18} />
                  Serviços Individuais & Trâmites Avulsos
                </h4>
                <p className="text-slate-400 text-xs mt-1">
                  Não necessita de um pacote completo? Oferecemos apoio focado para trâmites burocráticos individuais em Portugal [1].
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
                {servicosAvulsos.map((servico) => (
                  <div 
                    key={servico.id}
                    className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col justify-between space-y-3 hover:bg-white hover:border-slate-200 hover:shadow-xs transition-all"
                  >
                    <div className="space-y-1">
                      <h5 className="text-xs font-black text-slate-900">{servico.nome}</h5>
                      <p className="text-slate-400 text-[11px] leading-relaxed line-clamp-2">
                        {servico.descricao}
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100/50">
                      <div>
                        <span className="text-[9px] text-slate-400 block font-bold uppercase">Taxa Única</span>
                        <span className="text-xs font-black text-indigo-600">{formatCurrency(servico.preco)}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onEscolherPlano(servico.nome)}
                        className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 text-slate-600 text-[10px] font-black rounded-lg transition-colors uppercase tracking-wider cursor-pointer"
                      >
                        Solicitar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </section>
  );
}