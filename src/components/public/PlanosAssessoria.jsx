/**
 * PlanosAssessoria.jsx
 * Localização: src/components/public/PlanosAssessoria.jsx
 *
 * Secção pública com pacotes e Construtor de Pacotes Personalizados (Carrinho de Compras).
 * Totalmente integrada com o Firestore, otimizada para Tailwind v4 e com visual premium.
 */

import React, { useState, useEffect } from 'react';
import { 
  Check, ShieldCheck, Loader2, ShoppingBag, Trash2, Sparkles, 
  Plus, CheckSquare, Square, Gift, FileBadge, Brain, KeyRound, 
  Award, GraduationCap, Compass, CircleCheck, Info
} from 'lucide-react';
import { db } from '../../firebase';
import { obterPlanosAssessoria } from '../../services/assessoriaService';
import { formatCurrency } from '../../utils/formatters';

// Checklists estáticas padrão para pacotes fechados
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

// Micro-benefícios que enriquecem o valor visual de cada serviço avulso
const MINI_BENEFICIOS_AVULSOS = {
  's-formacao': [
    'Articulação prioritária com escolas',
    'Parceiros com elevadas taxas de aprovação',
    'Processo 100% acompanhado'
  ],
  's-psico': [
    'Clínicas certificadas na sua região',
    'Agendamento rápido em 24/48 horas',
    'Emissão direta para a base do IMT'
  ],
  's-criminal': [
    'Pedido seguro feito de forma online',
    'Sem necessidade de deslocação física',
    'Triagem exata para enquadramento TVDE'
  ],
  's-imt': [
    'Instrução minuciosa de dossiê legal',
    'Submissão eletrónica sem filas de espera',
    'Acompanhamento ativo até emissão de licença'
  ],
  's-contas': [
    'Perfil Uber e Bolt parametrizado sem erros',
    'Configuração imediata de documentos de viatura',
    'Sincronização correta com o operador'
  ],
  's-aplicacoes': [
    'Dicas práticas de maximização de faturamento',
    'Leitura profissional de mapas térmicos',
    'Estratégias de turnos e aceitação inteligente'
  ]
};

export default function PlanosAssessoria({ onEscolherPlano }) {
  const [planos, setPlanos] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Estado para armazenar os IDs dos serviços avulsos adicionados ao carrinho
  const [carrinhoIds, setCarrinhoIds] = useState([]);

  useEffect(() => {
    const carregarPlanos = async () => {
      try {
        const todos = await obterPlanosAssessoria(db);
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

  const pacotes = planos.filter(p => p.tipo === 'pacote');
  const servicosAvulsos = planos.filter(p => p.tipo === 'avulso');

  // Adiciona ou remove itens do carrinho
  const toggleServicoNoCarrinho = (id) => {
    setCarrinhoIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const limparCarrinho = () => {
    setCarrinhoIds([]);
  };

  // Lógica de cálculo financeiro e combo de descontos (Vendas cruzadas)
  const precoBaseCarrinho = carrinhoIds.reduce((soma, id) => {
    const servico = servicosAvulsos.find(s => s.id === id);
    return soma + (servico ? servico.preco : 0);
  }, 0);

  // Se o utilizador selecionar 2 ou mais serviços, ganha 15% de desconto promocional
  const temDescontoCombo = carrinhoIds.length >= 2;
  const percentagemDesconto = temDescontoCombo ? 15 : 0;
  const valorDesconto = (precoBaseCarrinho * percentagemDesconto) / 100;
  const precoTotalCarrinho = precoBaseCarrinho - valorDesconto;

  const handleEscolherPacotePredefinido = (pacote) => {
    onEscolherPlano(pacote.nome, {
      itensSelecionados: pacote.itens || [],
      precoTotal: pacote.preco
    });
  };

  const handleSubmeterPacotePersonalizado = () => {
    if (carrinhoIds.length === 0) return;

    const nomesItens = carrinhoIds
      .map(id => servicosAvulsos.find(s => s.id === id)?.nome)
      .filter(Boolean)
      .join(', ');

    onEscolherPlano('Pacote Personalizado', {
      itensSelecionados: carrinhoIds,
      precoTotal: precoTotalCarrinho,
      mensagemSuporte: `Trâmites pretendidos: ${nomesItens} (Combo de Desconto Aplicado: ${percentagemDesconto}%)`
    });
  };

  // Resolve os ícones específicos para cada ID de serviço para tornar o visual rico
  const obterDadosIcone = (id) => {
    switch (id) {
      case 's-formacao':
        return { Icone: GraduationCap, cor: 'text-indigo-600', corBg: 'bg-indigo-50 border-indigo-100/50' };
      case 's-psico':
        return { Icone: Brain, cor: 'text-teal-600', corBg: 'bg-teal-50 border-teal-100/50' };
      case 's-criminal':
        return { Icone: FileBadge, cor: 'text-rose-600', corBg: 'bg-rose-50 border-rose-100/50' };
      case 's-imt':
        return { Icone: Award, cor: 'text-blue-600', corBg: 'bg-blue-50 border-blue-100/50' };
      case 's-contas':
        return { Icone: KeyRound, cor: 'text-amber-600', corBg: 'bg-amber-50 border-amber-100/50' };
      case 's-aplicacoes':
        return { Icone: Compass, cor: 'text-violet-600', corBg: 'bg-violet-50 border-violet-100/50' };
      default:
        return { Icone: Sparkles, cor: 'text-indigo-600', corBg: 'bg-indigo-50 border-indigo-100/50' };
    }
  };

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
    <section id="planos" className="py-16 md:py-24 px-4 sm:px-6 max-w-6xl mx-auto space-y-16 border-t border-slate-200">
      
      {/* Cabeçalho de Secção com Badge de Novidade */}
      <div className="text-center space-y-3.5 max-w-xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100 text-[10px] font-black uppercase tracking-wider mx-auto w-fit">
          <Sparkles size={11} className="animate-pulse" />
          <span>Assessoria Documental Inteligente</span>
        </div>
        <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight">
          Pacotes de Apoio à sua medida
        </h2>
        <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
          Escolha um dos nossos pacotes completos ou utilize o nosso construtor interativo em baixo para agendar trâmites regulatórios de forma isolada.
        </p>
      </div>

      {loading && planos.length === 0 ? (
        <div className="flex justify-center items-center py-20 text-slate-400 gap-2.5">
          <Loader2 size={20} className="animate-spin text-blue-600" />
          <span className="text-xs font-bold uppercase tracking-wider">A carregar soluções estruturadas...</span>
        </div>
      ) : (
        <div className="space-y-24">
          
          {/* ─── 1. PACOTES COMPLETOS PREDEFINIDOS ───────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {pacotes.map((plano) => {
              const eAvançado = plano.id === 'p-avancado' || plano.nome.toLowerCase().includes('avançado');
              const itens = obterItensChecklist(plano);

              return (
                <div 
                  key={plano.id}
                  className={`bg-white rounded-3xl p-6 sm:p-7 flex flex-col justify-between space-y-6 select-none relative transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                    eAvançado 
                      ? 'border-2 border-blue-600 shadow-lg' 
                      : 'border border-slate-200 shadow-xs'
                  }`}
                >
                  {eAvançado && (
                    <span className="absolute top-0 right-6 -translate-y-1/2 bg-blue-600 text-white text-[9px] font-black px-3.5 py-1.5 rounded-full uppercase tracking-widest shadow-md">
                      Mais Solicitado
                    </span>
                  )}

                  <div className="space-y-4 text-left">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                      {eAvançado ? 'RECOMENDADO' : 'COBERTURA INTEGRAL'}
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                      {plano.nome}
                    </h3>
                    <p className="text-slate-500 text-xs leading-relaxed min-h-[48px]">
                      {plano.descricao}
                    </p>
                    
                    <ul className="space-y-2.5 pt-4 border-t border-slate-50 text-xs text-slate-600 font-medium">
                      {itens.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 leading-tight">
                          <CircleCheck className="text-blue-600 shrink-0 mt-0.5" size={15} /> 
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="text-left relative mt-auto pt-4 border-t border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Taxa de Adesão Única</p>
                    <p className={`text-3xl font-black tracking-tight ${eAvançado ? 'text-blue-600' : 'text-slate-950'}`}>
                      {formatCurrency(plano.preco)}
                    </p>
                    
                    <button
                      type="button"
                      onClick={() => handleEscolherPacotePredefinido(plano)}
                      className={`w-full mt-4 py-3 font-black rounded-xl text-xs transition-all duration-200 cursor-pointer uppercase tracking-widest ${
                        eAvançado 
                          ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200' 
                          : 'bg-slate-950 hover:bg-blue-600 text-white shadow-xs'
                      }`}
                    >
                      Solicitar Plano
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ─── 2. CONSTRUTOR DE PACOTES PERSONALIZADOS (CARRINHO DE COMPRAS) ── */}
          {servicosAvulsos.length > 0 && (
            <div className="pt-10 border-t border-slate-200 space-y-8">
              
              {/* Header do Construtor */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 text-left">
                <div className="space-y-1.5">
                  <span className="text-[9px] font-black tracking-widest text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full uppercase w-fit block">
                    100% Customizável
                  </span>
                  <h4 className="text-2xl font-black text-slate-950 flex items-center gap-2 tracking-tight">
                    <ShieldCheck className="text-indigo-600" size={24} />
                    <span>Construa o seu Pacote Personalizado</span>
                  </h4>
                  <p className="text-slate-400 text-xs max-w-2xl leading-relaxed">
                    Personalize a sua assessoria. Selecione os trâmites avulsos que deseja. Ative descontos progressivos automáticos à medida que escolhe mais trâmites.
                  </p>
                </div>

                {/* Badge promocional de Combo */}
                <div className="bg-emerald-50 border border-emerald-200/50 rounded-2xl p-3 flex items-center gap-2.5 max-w-xs shrink-0 self-start md:self-auto select-none animate-pulse">
                  <Gift size={20} className="text-emerald-600 shrink-0" />
                  <div className="text-xs">
                    <p className="font-black text-emerald-800 leading-none">Super Combo TVDE!</p>
                    <p className="text-[10px] text-emerald-600 font-bold mt-0.5">Selecione 2 ou mais serviços e ganhe <span className="underline">15% de desconto</span>.</p>
                  </div>
                </div>
              </div>

              {/* Grelha de Serviços Individuais Ultra-Premium */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {servicosAvulsos.map((servico) => {
                  const estaSelecionado = carrinhoIds.includes(servico.id);
                  const metaIcone = obterDadosIcone(servico.id);
                  const IconeServico = metaIcone.Icone;
                  const itensDestaque = MINI_BENEFICIOS_AVULSOS[servico.id] || [];

                  return (
                    <div 
                      key={servico.id}
                      onClick={() => toggleServicoNoCarrinho(servico.id)}
                      className={`group border-2 rounded-3xl p-5 flex flex-col justify-between min-h-[300px] cursor-pointer transition-all duration-300 relative select-none ${
                        estaSelecionado 
                          ? 'border-indigo-600 bg-gradient-to-br from-indigo-50/20 to-white shadow-lg shadow-indigo-100/40 -translate-y-0.5' 
                          : 'bg-white border-slate-100 hover:border-slate-300 hover:shadow-md'
                      }`}
                    >
                      {/* Checkbox circular ultra tátil */}
                      <div className="absolute top-4 right-4">
                        {estaSelecionado ? (
                          <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-white scale-110 duration-200 transition-transform">
                            <Check size={12} className="stroke-[4px]" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-slate-200 bg-slate-50 group-hover:border-slate-400 duration-200" />
                        )}
                      </div>

                      {/* Corpo do Cartão */}
                      <div className="space-y-4 text-left">
                        {/* Wrapper do ícone colorido */}
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border shrink-0 ${metaIcone.corBg}`}>
                          <IconeServico size={20} className={metaIcone.cor} />
                        </div>

                        <div className="space-y-1">
                          <h5 className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {servico.nome}
                          </h5>
                          <p className="text-slate-400 text-[11px] leading-relaxed">
                            {servico.descricao}
                          </p>
                        </div>

                        {/* Lista de Micro-Benefícios que agregam valor ao cartão */}
                        <ul className="space-y-1.5 pt-3.5 border-t border-slate-100 text-[10px] text-slate-500 font-bold">
                          {itensDestaque.map((item, i) => (
                            <li key={i} className="flex items-center gap-1.5">
                              <Check className="text-indigo-600 shrink-0" size={10} className="stroke-[3px]" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Secção de Preços do Cartão */}
                      <div className="flex items-end justify-between pt-4 border-t border-slate-100 mt-5">
                        <div className="text-left">
                          <span className="text-[9px] text-slate-400 block font-black uppercase tracking-wider">Taxa de Serviço</span>
                          <span className={`text-md font-black ${estaSelecionado ? 'text-indigo-700' : 'text-slate-900'}`}>
                            {formatCurrency(servico.preco)}
                          </span>
                        </div>
                        <span className={`text-[10px] font-black px-3.5 py-1.5 rounded-xl transition-all duration-200 ${
                          estaSelecionado 
                            ? 'bg-indigo-600 text-white shadow-xs' 
                            : 'bg-slate-50 border border-slate-200 text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-700 group-hover:border-indigo-100'
                        }`}>
                          {estaSelecionado ? 'Selecionado' : 'Adicionar'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 3. DOCK FLUTUANTE DE RESUMO DO CARRINHO (DESIGN ESTILO APPLE) */}
              {carrinhoIds.length > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-4xl bg-slate-950/95 backdrop-blur-xl text-white rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-6 animate-in slide-in-from-bottom duration-300 text-left border border-slate-800">
                  
                  {/* Informações de Compra */}
                  <div className="space-y-1.5">
                    <div className="flex items-center flex-wrap gap-2.5">
                      <ShoppingBag size={18} className="text-indigo-400 animate-bounce" />
                      <span className="text-xs font-black uppercase tracking-wider text-indigo-300">
                        O seu Pacote Personalizado
                      </span>
                      <span className="bg-indigo-900 text-indigo-200 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-indigo-700/50">
                        {carrinhoIds.length} {carrinhoIds.length === 1 ? 'Serviço' : 'Serviços'}
                      </span>
                      
                      {temDescontoCombo && (
                        <span className="bg-emerald-900/60 text-emerald-300 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-emerald-700/50 flex items-center gap-1">
                          <Gift size={11} /> Combo Ativo (15% Off)
                        </span>
                      )}
                    </div>
                    
                    {/* Lista Horizontal de Serviços Adicionados */}
                    <p className="text-xs text-slate-300 leading-relaxed font-semibold max-w-xl truncate" title={carrinhoIds.map(id => servicosAvulsos.find(s => s.id === id)?.nome).join(', ')}>
                      Inclui: {carrinhoIds.map(id => servicosAvulsos.find(s => s.id === id)?.nome).join(' + ')}
                    </p>
                  </div>

                  {/* Detalhes Financeiros & Ações do Dock */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-5 shrink-0 justify-between md:justify-end">
                    <div className="text-left md:text-right">
                      <span className="text-[9px] text-slate-400 block font-black uppercase tracking-wider">Subtotal com Desconto</span>
                      <div className="flex items-baseline gap-2">
                        {temDescontoCombo && (
                          <span className="text-xs font-bold text-slate-500 line-through">
                            {formatCurrency(precoBaseCarrinho)}
                          </span>
                        )}
                        <span className="text-2xl font-black text-indigo-400 tracking-tight">
                          {formatCurrency(precoTotalCarrinho)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={limparCarrinho}
                        className="p-3 bg-slate-900 hover:bg-red-950 text-slate-400 hover:text-red-400 rounded-xl transition-all cursor-pointer border border-slate-800"
                        title="Esvaziar Seleção"
                      >
                        <Trash2 size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={handleSubmeterPacotePersonalizado}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl text-xs uppercase tracking-widest shadow-md shadow-blue-500/10 transition-all flex items-center gap-2 cursor-pointer animate-pulse"
                      >
                        <Sparkles size={13} />
                        Confirmar Pacote
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