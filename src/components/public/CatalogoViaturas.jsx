/**
 * CatalogoViaturas.jsx
 * Localização: src/components/public/CatalogoViaturas.jsx
 *
 * Catálogo interativo de viaturas com:
 * - Filtros rápidos por categoria (Standard, Green, Comfort, XL, Black)
 * - Carrossel de rolagem suave (Smooth Scroll) controlado por Refs
 * - Exibição total da frota: anúncios ativos/disponíveis e anúncios pausados/indisponíveis
 */

import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Gauge, Users, Settings, Loader2 } from 'lucide-react';

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

  // 1. Carrega todas as viaturas dinamicamente da base de dados (Firestore)
  useEffect(() => {
    const carregarDadosDoFirestore = async () => {
      try {
        setLoading(true);
        const dados = await obterViaturasParaCatalogo(db);
        
        // Exibimos sempre todos os carros da base de dados, sem filtrar por anúncio ativo
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
              onClick={() => setCategoriaAtiva(cat.id)}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
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
                  // Determina se a viatura está verdadeiramente disponível para ser alugada
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
                        
                        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                          <span className="text-[10px] font-black tracking-wider uppercase bg-slate-900/80 backdrop-blur-md text-white px-2.5 py-1 rounded-lg">
                            {viatura.categoria.split(' / ')[0]}
                          </span>
                        </div>

                        {/* Distintivo de Disponibilidade Automático */}
                        <div className="absolute top-3 right-3">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-sm ${
                            isDisponivel
                              ? 'bg-emerald-500 text-white'
                              : 'bg-slate-400 text-white'
                          }`}>
                            {isDisponivel ? 'Disponível' : 'Indisponível'}
                          </span>
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
                          <p className="text-xs text-slate-400 mt-1">Matrícula: {viatura.matricula}</p>
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

                        {/* Preço de Aluguer */}
                        <div className="flex items-center justify-between pt-1">
                          <div>
                            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Preço Semanal</p>
                            <div className="flex items-baseline gap-1">
                              <span className="text-xl font-black text-blue-600">{viatura.precoSemanal}€</span>
                              <span className="text-xs font-semibold text-slate-400">/semana</span>
                            </div>
                          </div>
                          
                          {/* Botão de WhatsApp Adaptável */}
                          <a
                            href={`https://wa.me/351900000000?text=Olá! Gostaria de obter mais informações sobre a viatura ${viatura.marca} ${viatura.modelo} (${viatura.matricula}) vista no catálogo público.`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1 ${
                              isDisponivel
                                ? 'bg-slate-900 text-white hover:bg-blue-600'
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            }`}
                            onClick={(e) => !isDisponivel && e.preventDefault()}
                          >
                            {isDisponivel ? 'Alugar' : 'Indisponível'}
                          </a>
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