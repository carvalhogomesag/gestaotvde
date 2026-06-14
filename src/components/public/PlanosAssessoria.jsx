/**
 * PlanosAssessoria.jsx
 * Localização: src/components/public/PlanosAssessoria.jsx
 *
 * Secção pública com pacotes e Construtor de Pacotes Personalizados (Carrinho de Compras).
 * Totalmente dinâmico, integrado com o Firestore e preparado para checkout Stripe.
 */

import React, { useState, useEffect } from 'react';
import { 
  Check, ShieldCheck, Loader2, ShoppingBag, Trash2, Sparkles, Plus, CheckSquare, Square 
} from 'lucide-react';
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
  
  // Estado para gerir o carrinho de compras de serviços avulsos selecionados pelo utilizador
  const [carrinhoIds, setCarrinhoIds] = useState([]);

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

  // Adiciona ou remove um serviço avulso do carrinho de compras
  const toggleServicoNoCarrinho = (id) => {
    setCarrinhoIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Limpa toda a seleção do carrinho personalizado
  const limparCarrinho = () => {
    setCarrinhoIds([]);
  };

  // Calcula o valor total dos serviços atualmente no carrinho
  const precoTotalCarrinho = carrinhoIds.reduce((soma, id) => {
    const servico = servicosAvulsos.find(s => s.id === id);
    return soma + (servico ? servico.preco : 0);
  }, 0);

  // Gatilho para submeter um pacote predefinido
  const handleEscolherPacotePredefinido = (pacote) => {
    // Comunica ao modal o nome do pacote e passa os metadados dos seus itens e preço
    onEscolherPlano(pacote.nome, {
      itensSelecionados: pacote.itens || [],
      precoTotal: pacote.preco
    });
  };

  // Gatilho para submeter o pacote personalizado (carrinho)
  const handleSubmeterPacotePersonalizado = () => {
    if (carrinhoIds.length === 0) return;

    // Gera um nome composto descritivo para o plano personalizado
    const nomesItens = carrinhoIds
      .map(id => servicosAvulsos.find(s => s.id === id)?.nome)
      .filter(Boolean)
      .join(', ');

    onEscolherPlano('Pacote Personalizado', {
      itensSelecionados: carrinhoIds,
      precoTotal: precoTotalCarrinho,
      mensagemSuporte: `Trâmites pretendidos: ${nomesItens}`
    });
  };

  // Determina qual a checklist a exibir para cada pacote de forma resiliente
  const obterItensChecklist = (plano) => {
    if (CHECKLISTS_PADRAO[plano.id]) {
      return CHECKLISTS_PADRAO[plano.id];
    }
    if (plano.descricao) {
      const frases = plano.descricao.split(/[.,;]/).map(f => f.trim()).filter(f => f.length > 5);
      if (frases.length >= 2) return frases.slice(0, 3);
    }
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
          Escolha um dos nossos pacotes recomendados ou monte o seu próprio pacote personalizado selecionando os serviços individuais abaixo de forma flexível.
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
                      onClick={() => handleEscolherPacotePredefinido(plano)}
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

          {/* 2. Secção de Serviços Individuais (Construtor / Carrinho) */}
          {servicosAvulsos.length > 0 && (
            <div className="pt-8 border-t border-slate-200 space-y-6">
              <div className="text-left max-w-xl">
                <h4 className="text-md font-black text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="text-indigo-600" size={18} />
                  <span>Construa o seu Pacote Personalizado</span>
                </h4>
                <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                  Selecione um ou mais trâmites avulsos. Os preços somam-se automaticamente e poderá avançar com um pedido totalmente personalizado.
                </p>
              </div>

              {/* Grelha de Serviços Individuais Interativos (Cofre de Checkboxes) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
                {servicosAvulsos.map((servico) => {
                  const estaSelecionado = carrinhoIds.includes(servico.id);

                  return (
                    <div 
                      key={servico.id}
                      onClick={() => toggleServicoNoCarrinho(servico.id)}
                      className={`border rounded-2xl p-4 flex flex-col justify-between space-y-4 cursor-pointer transition-all select-none ${
                        estaSelecionado 
                          ? 'border-indigo-600 bg-indigo-50/40 shadow-xs' 
                          : 'bg-slate-50 border-slate-200 hover:bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-start gap-2">
                          <h5 className="text-xs font-black text-slate-900 group-hover:text-indigo-600">
                            {servico.nome}
                          </h5>
                          <div className="shrink-0 text-indigo-600">
                            {estaSelecionado ? (
                              <CheckSquare size={16} className="fill-indigo-100" />
                            ) : (
                              <Square size={16} className="text-slate-300" />
                            )}
                          </div>
                        </div>
                        <p className="text-slate-400 text-[11px] leading-relaxed line-clamp-3">
                          {servico.descricao}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <div>
                          <span className="text-[9px] text-slate-400 block font-bold uppercase">Preço Unitário</span>
                          <span className={`text-xs font-black ${estaSelecionado ? 'text-indigo-700' : 'text-slate-700'}`}>
                            {formatCurrency(servico.preco)}
                          </span>
                        </div>
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg transition-colors ${
                          estaSelecionado 
                            ? 'bg-indigo-600 text-white' 
                            : 'bg-white border border-slate-200 text-slate-600'
                        }`}>
                          {estaSelecionado ? 'Selecionado' : 'Adicionar'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 3. Caixa Flutuante/Fixa de Resumo do Carrinho de Compras */}
              {carrinhoIds.length > 0 && (
                <div className="bg-indigo-950 text-white rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-6 animate-in slide-in-from-bottom duration-200 text-left border border-indigo-900">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <ShoppingBag size={18} className="text-indigo-400" />
                      <span className="text-xs font-black uppercase tracking-wider text-indigo-300">
                        O seu Pacote Personalizado
                      </span>
                      <span className="bg-indigo-800 text-indigo-200 text-[9px] font-bold px-2 py-0.5 rounded-full">
                        {carrinhoIds.length} {carrinhoIds.length === 1 ? 'item' : 'itens'}
                      </span>
                    </div>
                    
                    {/* Lista Curta de Itens Selecionados */}
                    <p className="text-xs text-slate-300 leading-relaxed font-semibold max-w-xl">
                      Selecionado: {carrinhoIds.map(id => servicosAvulsos.find(s => s.id === id)?.nome).join(', ')}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 shrink-0">
                    <div className="text-left md:text-right">
                      <span className="text-[9px] text-indigo-300 block font-black uppercase tracking-wider">Subtotal Acumulado</span>
                      <span className="text-2xl font-black text-white">{formatCurrency(precoTotalCarrinho)}</span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={limparCarrinho}
                        className="p-3 bg-indigo-900/40 hover:bg-red-950/40 text-indigo-300 hover:text-red-400 rounded-xl transition-all cursor-pointer"
                        title="Limpar seleção"
                      >
                        <Trash2 size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={handleSubmeterPacotePersonalizado}
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-md transition-all flex items-center gap-2 cursor-pointer"
                      >
                        <Sparkles size={14} />
                        Solicitar Pacote
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>
      )}
    </section>
  );
}