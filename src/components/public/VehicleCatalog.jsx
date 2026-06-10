/**
 * VehicleCatalog.jsx
 * Localização: src/components/public/VehicleCatalog.jsx
 *
 * Catálogo público e interativo de viaturas TVDE para visitantes.
 * Apresenta fotografias reais das viaturas carregadas no ERP, especificações técnicas,
 * badges de disponibilidade flutuantes e ação de reserva integrada.
 */

import React, { useState, useEffect } from 'react';
import { 
  Search, Car, Zap, Fuel, Calendar, Gauge, 
  CheckCircle2, XCircle, Loader2, ArrowRight, MapPin 
} from 'lucide-react';
import { db } from '../../firebase';
import { obterViaturasParaCatalogo } from '../../services/veiculoService';
import { formatCurrency } from '../../utils/formatters';

export default function VehicleCatalog() {
  const [viaturas, setViaturas] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados dos filtros de pesquisa
  const [pesquisa, setPesquisa] = useState("");
  const [filtroCombustivel, setFiltroCombustivel] = useState("todos");
  const [filtroEstado, setFiltroEstado] = useState("todos"); // 'todos', 'disponivel', 'indisponivel'

  // Carregar as viaturas do Firestore ao montar o componente
  useEffect(() => {
    const carregarViaturas = async () => {
      try {
        const dados = await obterViaturasParaCatalogo(db);
        setViaturas(dados);
      } catch (err) {
        console.error("[VehicleCatalog] Erro ao carregar viaturas no catálogo público:", err);
      } finally {
        setLoading(false);
      }
    };

    carregarViaturas();
  }, []);

  // Handler de pré-reserva com transição suave e preenchimento automático
  const handleSolicitarViatura = (marca, modelo) => {
    const modeloCompleto = `${marca} ${modelo}`;
    console.log(`[VehicleCatalog] A selecionar viatura: ${modeloCompleto}`);

    // Guarda a viatura pretendida temporariamente em memória para o formulário ler
    sessionStorage.setItem('veiculoPretendido', modeloCompleto);
    
    // Dispara um evento personalizado para atualizar o formulário na mesma página em tempo real
    window.dispatchEvent(new CustomEvent('selecionarVeiculoCatalogo', { 
      detail: modeloCompleto 
    }));

    // Desliza suavemente até à secção do formulário de aluguer
    const seccaoAluguer = document.getElementById('aluguer');
    if (seccaoAluguer) {
      seccaoAluguer.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // --- PROCESSAMENTO FILTRADO DAS VIATURAS ---
  const viaturasFiltradas = viaturas.filter(v => {
    const textoMatriculavel = `${v.marca} ${v.modelo} ${v.cidade}`.toLowerCase();
    const matchesPesquisa = textoMatriculavel.includes(pesquisa.toLowerCase());
    
    const matchesCombustivel = filtroCombustivel === "todos" 
      ? true 
      : v.combustivel.toLowerCase() === filtroCombustivel.toLowerCase();

    const matchesEstado = filtroEstado === "todos"
      ? true
      : filtroEstado === "disponivel" 
        ? v.anuncioAtivo === true 
        : v.anuncioAtivo === false;

    return matchesPesquisa && matchesCombustivel && matchesEstado;
  });

  return (
    <section id="catalogo" className="py-20 px-6 max-w-6xl mx-auto space-y-10 border-t border-slate-200">
      
      {/* Cabeçalho do Catálogo */}
      <div className="text-center space-y-3 max-w-xl mx-auto">
        <div className="inline-flex items-center gap-1.5 justify-center text-xs font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
          <Car size={14} />
          Catálogo de Frota Disponível
        </div>
        <h2 className="text-2xl md:text-3xl font-black text-slate-900">
          Encontre a viatura ideal para o seu turno
        </h2>
        <p className="text-slate-500 text-sm leading-relaxed">
          Explore as viaturas da nossa frota parceira em Portugal. Ative ou desative anúncios no ERP e veja as atualizações em tempo real aqui.
        </p>
      </div>

      {/* Barra de Filtros Interativos */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        
        {/* Barra de Pesquisa de Texto */}
        <div className="relative md:col-span-6 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text"
            placeholder="Procurar por marca, modelo, região..."
            value={pesquisa}
            onChange={e => setPesquisa(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        {/* Filtro de Combustível */}
        <div className="md:col-span-3 w-full">
          <select
            value={filtroCombustivel}
            onChange={e => setFiltroCombustivel(e.target.value)}
            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="todos">Todos os Combustíveis</option>
            <option value="gasoleo">⛽ Diesel (Gasóleo)</option>
            <option value="gasolina">⛽ Gasolina</option>
            <option value="gpl">GPL</option>
            <option value="eletrico">⚡ Elétrico</option>
            <option value="hibrido">🔋 Híbrido</option>
          </select>
        </div>

        {/* Filtro de Estado */}
        <div className="md:col-span-3 w-full">
          <select
            value={filtroEstado}
            onChange={e => setFiltroEstado(e.target.value)}
            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="todos">Todos os Estados</option>
            <option value="disponivel">🟢 Apenas Disponíveis</option>
            <option value="indisponivel">🔴 Reservados / Indisponíveis</option>
          </select>
        </div>

      </div>

      {/* Grelha de Cartões de Viaturas */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="animate-spin mb-3" size={32} />
          <p className="text-xs font-bold">A sincronizar catálogo com a frota...</p>
        </div>
      ) : viaturasFiltradas.length === 0 ? (
        <div className="text-center py-20 bg-white border border-slate-200 rounded-3xl text-slate-400 space-y-2">
          <Car size={32} className="mx-auto text-slate-300" />
          <p className="text-xs font-bold">Não encontrámos viaturas para os filtros selecionados.</p>
          <p className="text-[10px] text-slate-400 max-w-xs mx-auto">Tente alargar a sua pesquisa ou remover alguns filtros aplicados.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {viaturasFiltradas.map((viatura) => {
            const disponivel = viatura.anuncioAtivo;

            return (
              <div 
                key={viatura.id}
                className="bg-white border border-slate-200 rounded-3xl flex flex-col justify-between overflow-hidden hover:shadow-md transition-all duration-300 relative group"
              >
                
                {/* 1. Imagem no topo do cartão com Badge Flutuante [ATUALIZADO] */}
                <div className="w-full h-40 bg-slate-100 relative overflow-hidden shrink-0 border-b border-slate-100">
                  {viatura.fotoUrl ? (
                    <img 
                      src={viatura.fotoUrl} 
                      alt={`${viatura.marca} ${viatura.modelo}`} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col items-center justify-center text-slate-300 gap-1.5">
                      <Car size={36} className="text-slate-300 group-hover:scale-110 transition-transform" />
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Imagem Brevemente</span>
                    </div>
                  )}

                  {/* Badge de Estado Flutuante por cima da foto */}
                  <span className={`absolute top-3 right-3 text-[8.5px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md border shadow-sm ${
                    disponivel 
                      ? 'bg-emerald-500 text-white border-emerald-600' 
                      : 'bg-red-600 text-white border-red-700'
                  }`}>
                    {disponivel ? 'Disponível' : 'Indisponível'}
                  </span>
                </div>

                {/* 2. Corpo do Cartão com Especificações e Região */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  
                  <div className="space-y-4 text-left">
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold">
                      <MapPin size={11} className="text-slate-400" />
                      <span>{viatura.cidade}</span>
                    </div>

                    <div>
                      <h4 className="text-base font-black text-slate-900 group-hover:text-blue-600 transition-colors leading-tight">
                        {viatura.marca} {viatura.modelo}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Matrícula protegida por RGPD</p>
                    </div>

                    {/* Ficha Técnica Compacta */}
                    <div className="grid grid-cols-2 gap-x-2 gap-y-3 pt-2 text-xs font-semibold text-slate-600 border-t border-slate-50">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={13} className="text-slate-400" />
                        <span>Ano: {viatura.ano}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {viatura.combustivel.toLowerCase() === 'elétrico' ? (
                          <Zap size={13} className="text-amber-500" />
                        ) : (
                          <Fuel size={13} className="text-slate-400" />
                        )}
                        <span className="capitalize">{viatura.combustivel}</span>
                      </div>
                      <div className="flex items-center gap-1.5 col-span-2">
                        <Gauge size={13} className="text-slate-400" />
                        <span>Km: {viatura.km.toLocaleString('pt-PT')} km</span>
                      </div>
                    </div>
                  </div>

                  {/* Preços e Ações */}
                  <div className="border-t border-slate-100 pt-4 text-left flex justify-between items-end shrink-0">
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Tarifa Semanal</p>
                      <p className="text-xl font-black text-slate-900">
                        {viatura.precoSemanal > 0 ? formatCurrency(viatura.precoSemanal) : 'Sob Consulta'}
                      </p>
                    </div>

                    {disponivel ? (
                      <button
                        type="button"
                        onClick={() => handleSolicitarViatura(viatura.marca, viatura.modelo)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                      >
                        Solicitar <ArrowRight size={12} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="px-4 py-2 bg-slate-100 text-slate-400 rounded-xl text-xs font-bold border border-slate-200 cursor-not-allowed select-none"
                      >
                        Reservado
                      </button>
                    )}
                  </div>

                </div>

              </div>
            );
          })}
        </div>
      )}

    </section>
  );
}