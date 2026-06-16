/**
 * CatalogoViaturas.jsx
 * Localização: src/components/public/CatalogoViaturas.jsx
 *
 * Catálogo interativo de viaturas com:
 * - Filtros rápidos por categoria (Standard, Green, Comfort, XL, Black)
 * - Carrossel de rolagem suave (Smooth Scroll) controlado por Refs
 * - Cores vibrantes forçadas (Verde para Disponível, Vermelho para Indisponível)
 * - Matrículas protegidas/ocultas por motivos de privacidade (RGPD)
 * - Integração com Google Analytics 4 para rastreio de cliques (CRO) com proteção contra localhost [4].
 */

import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Gauge, Users, Settings, Loader2 } from 'lucide-react';
import ReactGA from 'react-ga4';

// Importações do Firebase e do Service do ERP
import { db } from '../../firebase';
import { obterViaturasParaCatalogo } from '../../services/veiculoService';

const CATEGORIAS = [
  { id: 'Todos', label: 'Todos' },
  { id: 'Standard', label: 'Standard' },
  { id: 'Green', label: 'Green / Elétricos' },
  { id: 'Comfort', label: 'Comfort' },
  { id: 'XL', label: 'Espaçosos (XL)' },
  { id: 'Black', label: 'Premium (Black)' }
];

export default function CatalogoViaturas() {
  const [categoriaAtiva, setCategoriaAtiva] = useState('Todos');
  const [todasViaturas, setTodasViaturas] = useState([]);
  const [viaturasFiltradas, setViaturasFiltradas] = useState([]);
  const [loading, setLoading] = useState(true);
  const carrosselRef = useRef(null);

  // Detecção de ambiente de desenvolvimento local (Localhost) [4]
  const isLocalhost = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1'
  );

  // 1. Carrega todas as viaturas dinamicamente da base de dados (Firestore)
  useEffect(() => {
    const carregarDadosDoFirestore = async () => {
      try {
        setLoading(true);
        const dados = await obterViaturasParaCatalogo(db);
        setTodasViaturas(dados);
      } catch (err) {
        console.error("[CatalogoViaturas] Erro ao ligar ao Firestore:", err);
      } finally {
        setLoading(false);
      }
    };

    carregarDadosDoFirestore();
  }, []);

  // 2. Filtra as viaturas com base na categoria ativa selecionada
  useEffect(() => {
    let filtrados = todasViaturas;
    if (categoriaAtiva !== 'Todos') {
      filtrados = todasViaturas.filter(v => 
        v.categoria.toLowerCase().includes(categoriaAtiva.toLowerCase())
      );
    }
    setViaturasFiltradas(filtrados);
    
    // Reset ao scroll do carrossel quando muda a tab
    if (carrosselRef.current) {
      carrosselRef.current.scrollLeft = 0;
    }
  }, [categoriaAtiva, todasViaturas]);

  // Controlo do scroll lateral (arrows)
  const scroll = (direcao) => {
    if (carrosselRef.current) {
      const { scrollLeft, clientWidth } = carrosselRef.current;
      const quantidadeScroll = clientWidth * 0.75; 
      
      carrosselRef.current.scrollTo({
        left: direcao === 'left' ? scrollLeft - quantidadeScroll : scrollLeft + quantidadeScroll,
        behavior: 'smooth'
      });
    }
  };

  /**
   * Monitoriza qual a categoria que os utilizadores clicam mais para fins estatísticos [4]
   */
  const handleCategoriaClick = (catId) => {
    setCategoriaAtiva(catId);
    if (!isLocalhost) {
      ReactGA.event({
        category: 'Filtros Catálogo',
        action: 'Selecionar Categoria',
        label: catId
      });
    }
  };

  return (
    <section id="catalogo" className="py-16 bg-slate-50 border-t border-slate-100 overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        
        {/* Cabeçalho */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1.5 rounded-full">
            A Nossa Frota Real
          </span>
          <h2 className="text-3xl font-black text-slate-900 mt-3 sm:text-4xl">
            Encontre a viatura ideal para faturar
          </h2>
          <p className="text-slate-500 mt-2 text-sm sm:text-base">
            Modelos em conformidade com as regras TVDE em Portugal. Ligue-se e comece hoje mesmo.
          </p>
        </div>

        {/* Categorias */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 scrollbar-none justify-start sm:justify-center -mx-4 px-4">
          {CATEGORIAS.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoriaClick(cat.id)} // ◄ Rastreio dinâmico no clique
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                categoriaAtiva === cat.id
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-100'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Estado de Carregamento da BD */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <Loader2 className="text-blue-600 animate-spin" size={32} />
            <p className="text-xs font-semibold text-slate-400">A carregar catálogo de frotas em tempo real...</p>
          </div>
        ) : (
          <div className="relative group">
            
            {/* Setas do Carrossel */}
            <button
              onClick={() => scroll('left')}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm border border-slate-200 shadow-lg flex items-center justify-center text-slate-700 hover:text-blue-600 hover:scale-105 active:scale-95 transition-all md:opacity-0 md:group-hover:opacity-100"
              aria-label="Anterior"
            >
              <ChevronLeft size={20} />
            </button>

            <button
              onClick={() => scroll('right')}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm border border-slate-200 shadow-lg flex items-center justify-center text-slate-700 hover:text-blue-600 hover:scale-105 active:scale-95 transition-all md:opacity-0 md:group-hover:opacity-100"
              aria-label="Seguinte"
            >
              <ChevronRight size={20} />
            </button>

            {/* Contentor do Carrossel */}
            <div
              ref={carrosselRef}
              className="flex gap-6 overflow-x-auto pb-6 pt-2 scroll-smooth snap-x snap-mandatory scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {viaturasFiltradas.length > 0 ? (
                viaturasFiltradas.map((viatura) => {
                  const isDisponivel = viatura.anuncioAtivo && viatura.estado === 'Disponível';

                  return (
                    <div
                      key={viatura.id}
                      className="snap-start shrink-0 w-[290px] sm:w-[325px] bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md hover:border-slate-200/80 flex flex-col justify-between"
                    >
                      
                      {/* Imagem do Firestore */}
                      <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                        {viatura.fotoUrl ? (
                          <img
                            src={viatura.fotoUrl}
                            alt={`${viatura.marca} ${viatura.modelo}`}
                            className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 bg-slate-100 text-xs font-semibold">
                            Sem Foto Disponível
                          </div>
                        )}
                        
                        {/* Badges Múltiplos por Viatura */}
                        <div className="absolute top-3 left-3 flex flex-wrap gap-1">
                          {viatura.categoria.split(' / ').map((cat, idx) => (
                            <span key={idx} className="text-[9px] font-black tracking-wider uppercase bg-slate-900/80 backdrop-blur-md text-white px-2.5 py-1 rounded-lg">
                              {cat}
                            </span>
                          ))}
                        </div>

                        {/* Estado com Cor Forçada via Estilo Inline */}
                        <div className="absolute top-3 right-3">
                          <span 
                            className="text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-sm"
                            style={{ 
                              backgroundColor: isDisponivel ? '#10b981' : '#94a3b8', 
                              color: '#ffffff' 
                            }}
                          >
                            {isDisponivel ? 'Disponível' : 'Indisponível'}
                          </span>
                        </div>

                        {/* Legenda "Foto ilustrativa" */}
                        <div className="absolute bottom-2 right-2 text-[8px] font-bold text-white/80 bg-slate-950/40 backdrop-blur-xs px-1.5 py-0.5 rounded select-none pointer-events-none uppercase tracking-wider">
                          * Foto ilustrativa
                        </div>
                      </div>

                      {/* Informações */}
                      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                        
                        <div>
                          <div className="flex justify-between items-start gap-1">
                            <h3 className="font-extrabold text-slate-800 text-base sm:text-lg leading-tight truncate">
                              {viatura.marca} {viatura.modelo}
                            </h3>
                            <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                              {viatura.ano}
                            </span>
                          </div>
                        </div>

                        {/* Ficha Técnica */}
                        <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-100 text-slate-600 text-xs font-semibold">
                          <div className="flex flex-col items-center justify-center p-1.5 bg-slate-50 rounded-xl">
                            <Settings size={14} className="text-slate-400 mb-1" />
                            <span className="text-[10px] text-slate-400 font-normal">Caixa</span>
                            <span className="truncate max-w-full text-[11px] mt-0.5">{viatura.transmissao}</span>
                          </div>

                          <div className="flex flex-col items-center justify-center p-1.5 bg-slate-50 rounded-xl">
                            <Gauge size={14} className="text-slate-400 mb-1" />
                            <span className="text-[10px] text-slate-400 font-normal">Autonomia</span>
                            <span className="truncate max-w-full text-[11px] mt-0.5">{viatura.autonomia}km</span>
                          </div>

                          <div className="flex flex-col items-center justify-center p-1.5 bg-slate-50 rounded-xl">
                            <Users size={14} className="text-slate-400 mb-1" />
                            <span className="text-[10px] text-slate-400 font-normal">Lotação</span>
                            <span className="truncate max-w-full text-[11px] mt-0.5">{viatura.lugares} Lug.</span>
                          </div>
                        </div>

                        {/* Preço de Aluguer e CTA Inteligente */}
                        <div className="flex items-center justify-between pt-1 gap-2">
                          <div>
                            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Preço Semanal</p>
                            <div className="flex items-baseline gap-1">
                              <span className="text-xl font-black text-blue-600">{viatura.precoSemanal}€</span>
                              <span className="text-xs font-semibold text-slate-400">/semana</span>
                            </div>
                          </div>
                          
                          {/* Botões de WhatsApp Ativos — Mapeados via ID e protegidos contra localhost */}
                          {isDisponivel ? (
                            <a
                              href={`https://wa.me/351900000000?text=Olá! Vi no vosso catálogo que a viatura ${viatura.marca} ${viatura.modelo} (Ref: ${viatura.id}) está disponível para aluguer. Gostaria de demonstrar o meu interesse e obter mais informações.`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => {
                                if (!isLocalhost) {
                                  ReactGA.event({
                                    category: 'Conversão Catálogo',
                                    action: 'Click_WhatsApp_Disponivel',
                                    label: `${viatura.marca} ${viatura.modelo} (Ref: ${viatura.id})`
                                  });
                                }
                              }}
                              className="px-3.5 py-2.5 rounded-xl text-xs font-black transition-all shadow-md flex items-center justify-center text-center shrink-0 min-w-[120px] hover:opacity-90 uppercase"
                              style={{ 
                                backgroundColor: '#10b981', 
                                color: '#ffffff' 
                              }}
                            >
                              Tenho Interesse
                            </a>
                          ) : (
                            <a
                              href={`https://wa.me/351900000000?text=Olá! Vi no vosso catálogo que a viatura ${viatura.marca} ${viatura.modelo} (Ref: ${viatura.id}) está atualmente indisponível. Gostaria de demonstrar o meu interesse em alugar uma viatura igual ou semelhante assim que houver disponibilidade.`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => {
                                if (!isLocalhost) {
                                  ReactGA.event({
                                    category: 'Conversão Catálogo',
                                    action: 'Click_WhatsApp_Indisponivel',
                                    label: `${viatura.marca} ${viatura.modelo} (Ref: ${viatura.id})`
                                  });
                                }
                              }}
                              className="px-2.5 py-2.5 rounded-xl text-[9.5px] font-black transition-all shadow-md flex items-center justify-center text-center shrink-0 min-w-[160px] hover:opacity-90 uppercase tracking-tight"
                              style={{ 
                                backgroundColor: '#ef4444', 
                                color: '#ffffff' 
                              }}
                            >
                              Tenho interesse em um igual
                            </a>
                          )}
                        </div>

                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="w-full text-center py-12 text-slate-400 text-sm">
                  Nenhuma viatura disponível nesta categoria de momento.
                </div>
              )}
            </div>
            
          </div>
        )}

        <div className="text-center mt-4 md:hidden flex items-center justify-center gap-2 text-xs text-slate-400">
          <span>Deslize para ver mais viaturas</span>
          <ChevronRight size={14} className="animate-pulse" />
        </div>

      </div>
    </section>
  );
}