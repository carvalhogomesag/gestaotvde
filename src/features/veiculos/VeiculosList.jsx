/**
 * VeiculosList.jsx
 * Localização: src/features/veiculos/VeiculosList.jsx
 *
 * Lista de veículos da frota em formato de tabela.
 * Atualizado com suporte responsivo autocapsulado (Horizontal Scroll-Safe).
 * Otimizado com:
 * - Filtros integrados rápidos em cada cabeçalho [2].
 * - Ordenação alfabética automática por veículo [1].
 * - Remoção definitiva da coluna de cartões de combustível (migrados para motorista) [1].
 * - Renderização de placas físicas em conformidade com o formato real de matrículas portuguesas [1].
 */

import React, { useState } from 'react';
import { Edit, Trash2, Car, User, Building2, FileText, ShieldCheck, ClipboardCheck, Eye, AlertCircle } from 'lucide-react';
import { formatMatricula } from '../../utils/formatters';

export default function VeiculosList({ 
  veiculos, 
  onEdit, 
  onDelete,
  onToggleAnuncio // Propriedade para ativar ou desativar o fluxo de workflow
}) {
  
  // ESTADOS DE FILTRAGEM INDIVIDUAL POR COLUNA [1, 2]
  const [filterVeiculo, setFilterVeiculo] = useState('');
  const [filterMatricula, setFilterMatricula] = useState('');
  const [filterMotorista, setFilterMotorista] = useState('');
  const [filterDocs, setFilterDocs] = useState('todos');
  const [filterAnuncio, setFilterAnuncio] = useState('todos');

  // Função auxiliar para calcular a cor baseada na validade (Seguro e IPO)
  const checkStatusColor = (data) => {
    if (!data) return 'text-slate-300 bg-slate-50 border-slate-200';
    
    const hoje = new Date();
    const validade = new Date(data);
    const diffEmDias = Math.floor((validade - hoje) / (1000 * 60 * 60 * 24));

    if (diffEmDias < 0) {
      return 'text-red-600 bg-red-50 border-red-200 animate-pulse'; // Expirado
    }
    if (diffEmDias <= 30) {
      return 'text-orange-600 bg-orange-50 border-orange-200'; // Alerta 30 dias
    }
    return 'text-green-600 bg-green-50 border-green-200'; // OK
  };

  // Função para verificar se o registo do veículo está incompleto
  const isVehicleIncomplete = (v) => {
    const camposEssenciais = ['marca', 'modelo', 'motoristaId', 'docSeguro', 'docIPO'];
    return camposEssenciais.some(campo => !v[campo] || v[campo] === '');
  };

  // ◄ APLICADO: Ordenação Alfabética Nativa (A-Z) + Filtros por Coluna
  const sortedAndFilteredVeiculos = [...veiculos]
    .sort((a, b) => {
      const nomeA = `${a.marca || ''} ${a.modelo || ''}`.trim();
      const nomeB = b.marca || '';
      return nomeA.localeCompare(nomeB, 'pt', { sensitivity: 'base' });
    })
    .filter((v) => {
      // 1. Filtro: Veículo (Marca, Modelo, Código ou Ano)
      const qVeiculo = filterVeiculo.toLowerCase();
      const matchesVeiculo = 
        (v.marca || '').toLowerCase().includes(qVeiculo) ||
        (v.modelo || '').toLowerCase().includes(qVeiculo) ||
        (v.ano || '').toString().includes(qVeiculo) ||
        (v.codigoInterno || '').toLowerCase().includes(qVeiculo);

      // 2. Filtro: Matrícula (Com limpeza de hífenes para aceitar pesquisas simples como 'BR31')
      const qMatricula = filterMatricula.toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
      const cleanMatricula = (v.matricula || '').toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
      const matchesMatricula = cleanMatricula.includes(qMatricula);

      // 3. Filtro: Motorista / Proprietário
      const qMotorista = filterMotorista.toLowerCase();
      const matchesMotorista = 
        (v.motoristaNome || '').toLowerCase().includes(qMotorista) ||
        (v.proprietarioNome || '').toLowerCase().includes(qMotorista);

      // 4. Filtro: Documentação
      const incomplete = isVehicleIncomplete(v);
      let matchesDocs = true;
      if (filterDocs === 'pendente') {
        matchesDocs = incomplete;
      } else if (filterDocs === 'completo') {
        matchesDocs = !incomplete;
      }

      // 5. Filtro: Estado do Anúncio
      const anuncioAtivo = v.anuncioAtivo ?? false;
      let matchesAnuncio = true;
      if (filterAnuncio === 'ativo') {
        matchesAnuncio = anuncioAtivo;
      } else if (filterAnuncio === 'pausado') {
        matchesAnuncio = !anuncioAtivo;
      }

      return matchesVeiculo && matchesMatricula && matchesMotorista && matchesDocs && matchesAnuncio;
    });

  return (
    // Contentor agora é auto-rolável mantendo os cantos arredondados do cartão
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-x-auto w-full custom-scrollbar">
      {/* min-w-[850px] adicionado para proteger colunas em telemóveis */}
      <table className="w-full text-left border-collapse min-w-[850px]">
        <thead>
          {/* Cabeçalho Principal de Títulos */}
          <tr className="bg-slate-50 border-b border-slate-100">
            <th className="p-4 font-semibold text-slate-600 text-sm">Veículo</th>
            <th className="p-4 font-semibold text-slate-600 text-sm text-center">Matrícula</th>
            <th className="p-4 font-semibold text-slate-600 text-sm">Motorista / Prop.</th>
            <th className="p-4 font-semibold text-slate-600 text-sm">Documentos</th>
            <th className="p-4 font-semibold text-slate-600 text-sm text-center">Anúncio</th> 
            <th className="p-4 font-semibold text-slate-600 text-sm text-right">Ações</th>
          </tr>
          
          {/* ◄ ADICIONADO: Filtros Rápidos de Coluna */}
          <tr className="bg-slate-50/50 border-b border-slate-100">
            {/* Filtro: Veículo */}
            <td className="px-4 py-2">
              <input 
                type="text" 
                placeholder="🔍 Marca, modelo, ano..." 
                value={filterVeiculo} 
                onChange={(e) => setFilterVeiculo(e.target.value)}
                className="w-full p-1.5 border border-slate-200 rounded-lg text-[11px] outline-none focus:ring-1 focus:ring-tvde-primary text-slate-700 bg-white font-medium"
              />
            </td>
            {/* Filtro: Matrícula */}
            <td className="px-4 py-2">
              <input 
                type="text" 
                placeholder="🔍 Matrícula..." 
                value={filterMatricula} 
                onChange={(e) => setFilterMatricula(e.target.value)}
                className="w-full p-1.5 border border-slate-200 rounded-lg text-[11px] outline-none focus:ring-1 focus:ring-tvde-primary text-slate-700 bg-white font-medium text-center uppercase"
              />
            </td>
            {/* Filtro: Motorista / Prop. */}
            <td className="px-4 py-2">
              <input 
                type="text" 
                placeholder="🔍 Motorista ou prop..." 
                value={filterMotorista} 
                onChange={(e) => setFilterMotorista(e.target.value)}
                className="w-full p-1.5 border border-slate-200 rounded-lg text-[11px] outline-none focus:ring-1 focus:ring-tvde-primary text-slate-700 bg-white font-medium"
              />
            </td>
            {/* Filtro: Documentação */}
            <td className="px-4 py-2">
              <select 
                value={filterDocs} 
                onChange={(e) => setFilterDocs(e.target.value)}
                className="w-full p-1.5 border border-slate-200 rounded-lg text-[11px] outline-none focus:ring-1 focus:ring-tvde-primary text-slate-700 bg-white font-medium cursor-pointer"
              >
                <option value="todos">Todos</option>
                <option value="pendente">Pendente</option>
                <option value="completo">Completo</option>
              </select>
            </td>
            {/* Filtro: Anúncio */}
            <td className="px-4 py-2">
              <select 
                value={filterAnuncio} 
                onChange={(e) => setFilterAnuncio(e.target.value)}
                className="w-full p-1.5 border border-slate-200 rounded-lg text-[11px] outline-none focus:ring-1 focus:ring-tvde-primary text-slate-700 bg-white font-medium cursor-pointer"
              >
                <option value="todos">Todos</option>
                <option value="ativo">Ativo</option>
                <option value="pausado">Pausado</option>
              </select>
            </td>
            <td className="px-4 py-2"></td>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {sortedAndFilteredVeiculos.map((v) => {
            const incomplete = isVehicleIncomplete(v);
            const anuncioAtivo = v.anuncioAtivo ?? false;

            return (
              <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-tvde-primary shadow-sm border border-blue-100">
                      <Car size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="bg-slate-800 text-white text-[10px] font-black px-1.5 py-0.5 rounded shadow-sm tracking-wider font-mono">
                          {v.codigoInterno || 'S/ID'}
                        </span>
                        <p className="font-bold text-slate-800">{v.marca || '---'} {v.modelo}</p>
                      </div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">Ano: {v.ano || 's/f'}</p>
                    </div>
                  </div>
                </td>
                
                {/* ◄ ALTERADO: Célula renderizada como uma matrícula física real portuguesa */}
                <td className="p-4 text-center select-none">
                  <div className="inline-flex items-center border-[2.2px] border-slate-900 rounded-[4px] bg-white overflow-hidden shadow-sm h-7 text-xs font-black font-mono">
                    {/* Eurobanda Azul Portuguesa à esquerda */}
                    <div className="bg-[#003399] text-white flex flex-col items-center justify-center px-1 h-full text-[6px] shrink-0 border-r border-slate-200">
                      <span className="text-yellow-400 text-[5px] mb-0.5 font-bold leading-none">★</span>
                      <span className="font-extrabold tracking-tight leading-none scale-90">P</span>
                    </div>
                    {/* Texto com numeração da Matrícula */}
                    <span className="px-3.5 py-0.5 text-slate-900 tracking-[0.05em] uppercase text-xs font-extrabold font-mono">
                      {formatMatricula(v.matricula)}
                    </span>
                  </div>
                </td>

                <td className="p-4 text-sm text-slate-600">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 font-medium">
                      <User size={12} className="text-slate-400" /> 
                      {v.motoristaNome || <span className="text-slate-300 italic">Disponível</span>}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                      <Building2 size={10} /> 
                      {v.proprietarioNome || 'Sem Proprietário'}
                    </div>
                  </div>
                </td>
                
                <td className="p-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      {v.docDUA && (
                        <a href={v.docDUA} target="_blank" rel="noreferrer" className="p-1.5 bg-slate-50 rounded-lg text-slate-400 hover:text-blue-600 border border-slate-200 shadow-sm" title="Ver DUA">
                          <FileText size={16} />
                        </a>
                      )}
                      {v.docSeguro && (
                        <a href={v.docSeguro} target="_blank" rel="noreferrer" className={`p-1.5 rounded-lg border shadow-sm transition-all ${checkStatusColor(v.validadeSeguro)}`} title="Ver Seguro">
                          <ShieldCheck size={16} />
                        </a>
                      )}
                      {v.docIPO && (
                        <a href={v.docIPO} target="_blank" rel="noreferrer" className={`p-1.5 rounded-lg border shadow-sm transition-all ${checkStatusColor(v.validadeIPO)}`} title="Ver IPO">
                          <ClipboardCheck size={16} />
                        </a>
                      )}
                    </div>
                    
                    {incomplete && (
                      <span className="flex items-center gap-1 text-[9px] bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded-md font-black uppercase border border-orange-100 w-fit">
                        <AlertCircle size={10} /> Pendente
                      </span>
                    )}
                  </div>
                </td>

                {/* COLUNA DO INTERRUPTOR DE ANÚNCIO DO CATÁLOGO PÚBLICO */}
                <td className="p-4 text-center">
                  <button
                    type="button"
                    onClick={() => onToggleAnuncio && onToggleAnuncio(v.id, !anuncioAtivo, v.matricula)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border cursor-pointer select-none ${
                      anuncioAtivo
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                    }`}
                    title={anuncioAtivo ? "Pausar anúncio no catálogo público" : "Ativar anúncio no catálogo público"}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${anuncioAtivo ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                    {anuncioAtivo ? 'Ativo' : 'Pausado'}
                  </button>
                </td>

                <td className="p-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => onEdit(v, true)} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors bg-slate-50 rounded-lg hover:bg-indigo-50 cursor-pointer" title="Visualizar"><Eye size={18} /></button>
                    <button onClick={() => onEdit(v, false)} className="p-2 text-slate-400 hover:text-tvde-primary transition-colors bg-slate-50 rounded-lg hover:bg-blue-50 cursor-pointer" title="Editar"><Edit size={18} /></button>
                    <button onClick={() => onDelete(v.id)} className="p-2 text-slate-400 hover:text-tvde-danger transition-colors bg-slate-50 rounded-lg hover:bg-red-50 cursor-pointer" title="Eliminar"><Trash2 size={18} /></button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {sortedAndFilteredMotoristas.length === 0 && (
        <div className="p-10 text-center text-slate-400 text-sm italic">
          Nenhum veículo corresponde aos critérios de pesquisa ou seleção.
        </div>
      )}
    </div>
  );
}