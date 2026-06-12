/**
 * CatalogoViaturas.jsx
 * Localização: src/components/public/CatalogoViaturas.jsx
 *
 * Catálogo interativo de viaturas com:
 * - Filtros rápidos por categoria (Standard, Green, Comfort, XL, Black)
 * - Carrossel de rolagem suave (Smooth Scroll) controlado por Refs
 * - Totalmente responsivo e otimizado para gestos touch em dispositivos móveis
 */

import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Gauge, Users, Settings, Eye, HelpCircle } from 'lucide-react';
import { MOCK_VEICULOS } from '../../utils/mockVeiculos';

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
  const [viaturasFiltradas, setViaturasFiltradas] = useState([]);
  const carrosselRef = useRef(null);

  // Filtra as viaturas com base na categoria selecionada
  useEffect(() => {
    let filtrados = MOCK_VEICULOS;
    if (categoriaAtiva !== 'Todos') {
      filtrados = MOCK_VEICULOS.filter(v => 
        v.categoria.toLowerCase().includes(categoriaAtiva.toLowerCase())
      );
    }
    setViaturasFiltradas(filtrados);
    
    // Faz reset ao scroll do carrossel ao mudar de categoria
    if (carrosselRef.current) {
      carrosselRef.current.scrollLeft = 0;
    }
  }, [categoriaAtiva]);

  // Função para controlar o scroll através das setas esquerda/direita
  const scroll = (direcao) => {
    if (carrosselRef.current) {
      const { scrollLeft, clientWidth } = carrosselRef.current;
      // Desloca 75% da largura visível do carrossel para uma transição suave
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
        
        {/* Cabeçalho da Secção */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1.5 rounded-full">
            A Nossa Frota
          </span>
          <h2 className="text-3xl font-black text-slate-900 mt-3 sm:text-4xl">
            Encontre a viatura ideal para faturar
          </h2>
          <p className="text-slate-500 mt-2 text-sm sm:text-base">
            Modelos prontos a trabalhar nas plataformas TVDE (Uber/Bolt) com manutenção e seguro incluídos.
          </p>
        </div>

        {/* Barra de Filtros (Categorias) */}
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

        {/* Contentor do Carrossel com Controlos Visuais */}
        <div className="relative group">
          
          {/* Seta Esquerda (Oculta em Mobile se não houver hover no Desktop) */}
          <button
            onClick={() => scroll('left')}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm border border-slate-200 shadow-lg flex items-center justify-center text-slate-700 hover:text-blue-600 hover:scale-105 active:scale-95 transition-all md:opacity-0 md:group-hover:opacity-100"
            aria-label="Anterior"
          >
            <ChevronLeft size={20} />
          </button>

          {/* Seta Direita */}
          <button
            onClick={() => scroll('right')}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm border border-slate-200 shadow-lg flex items-center justify-center text-slate-700 hover:text-blue-600 hover:scale-105 active:scale-95 transition-all md:opacity-0 md:group-hover:opacity-100"
            aria-label="Seguinte"
          >
            <ChevronRight size={20} />
          </button>

          {/* Carrossel de Viaturas */}
          <div
            ref={carrosselRef}
            className="flex gap-6 overflow-x-auto pb-6 pt-2 scroll-smooth snap-x snap-mandatory scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {viaturasFiltradas.length > 0 ? (
              viaturasFiltradas.map((viatura) => (
                <div
                  key={viatura.id}
                  className="snap-start shrink-0 w-[290px] sm:w-[325px] bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md hover:border-slate-200/80 flex flex-col justify-between"
                >
                  
                  {/* Foto e Badges da Viatura */}
                  <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                    <img
                      src={viatura.imagem}
                      alt={`${viatura.marca} ${viatura.modelo}`}
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                      loading="lazy"
                    />
                    
                    {/* Badge de Categoria */}
                    <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                      <span className="text-[10px] font-black tracking-wider uppercase bg-slate-900/80 backdrop-blur-md text-white px-2.5 py-1 rounded-lg">
                        {viatura.categoria.split(' / ')[0]}
                      </span>
                    </div>

                    {/* Badge de Estado / Disponibilidade */}
                    <div className="absolute top-3 right-3">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-sm ${
                        viatura.estado === 'Disponível'
                          ? 'bg-emerald-500 text-white'
                          : viatura.estado === 'Alugado'
                          ? 'bg-amber-500 text-white'
                          : 'bg-slate-400 text-white'
                      }`}>
                        {viatura.estado}
                      </span>
                    </div>
                  </div>

                  {/* Informações Principais */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    
                    {/* Marca, Modelo e Ano */}
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

                    {/* Ficha Técnica Rápida (Especificações) */}
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

                    {/* Preços e Ações */}
                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Preço Semanal</p>
                        <div className="flex items-baseline gap-1">
                          <span className="text-xl font-black text-blue-600">{viatura.precoSemana}€</span>
                          <span className="text-xs font-semibold text-slate-400">/semana</span>
                        </div>
                      </div>
                      
                      <a
                        href={`https://wa.me/351900000000?text=Olá! Gostaria de obter mais informações sobre a viatura ${viatura.marca} ${viatura.modelo} (${viatura.matricula}).`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1 ${
                          viatura.estado === 'Disponível'
                            ? 'bg-slate-900 text-white hover:bg-blue-600'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                        onClick={(e) => viatura.estado !== 'Disponível' && e.preventDefault()}
                      >
                        {viatura.estado === 'Disponível' ? 'Alugar' : 'Indisponível'}
                      </a>
                    </div>

                  </div>
                </div>
              ))
            ) : (
              <div className="w-full text-center py-12 text-slate-400 text-sm">
                Nenhuma viatura disponível nesta categoria de momento.
              </div>
            )}
          </div>
          
        </div>

        {/* Indicador visual de deslizar (apenas mobile) */}
        <div className="text-center mt-4 md:hidden flex items-center justify-center gap-2 text-xs text-slate-400">
          <span>Deslize para ver mais viaturas</span>
          <ChevronRight size={14} className="animate-pulse" />
        </div>

      </div>
    </section>
  );
}