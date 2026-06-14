/**
 * VeiculosList.jsx
 * Localização: src/features/veiculos/VeiculosList.jsx
 *
 * Lista de veículos da frota em formato de tabela.
 * Atualizado com suporte responsivo autocapsulado (Horizontal Scroll-Safe)
 */

import React from 'react';
import { Edit, Trash2, Car, User, Building2, FileText, ShieldCheck, ClipboardCheck, CreditCard, Eye, AlertCircle } from 'lucide-react';
import { formatMatricula } from '../../utils/formatters';

export default function VeiculosList({ 
  veiculos, 
  cartoes = [], 
  onEdit, 
  onDelete,
  onToggleAnuncio // Nova prop integrada para alternar anúncios
}) {
  
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

  return (
    // ◄ ALTERADO: Contentor agora é auto-rolável mantendo os cantos arredondados do cartão
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-x-auto w-full custom-scrollbar">
      {/* ◄ ALTERADO: min-w-[850px] adicionado para proteger colunas em telemóveis */}
      <table className="w-full text-left border-collapse min-w-[850px]">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-100">
            <th className="p-4 font-semibold text-slate-600 text-sm">Veículo</th>
            <th className="p-4 font-semibold text-slate-600 text-sm text-center">Matrícula</th>
            <th className="p-4 font-semibold text-slate-600 text-sm">Motorista / Prop.</th>
            <th className="p-4 font-semibold text-slate-600 text-sm">Cartões (Nº)</th>
            <th className="p-4 font-semibold text-slate-600 text-sm">Documentos</th>
            <th className="p-4 font-semibold text-slate-600 text-sm text-center">Anúncio</th> {/* Nova coluna de controlo */}
            <th className="p-4 font-semibold text-slate-600 text-sm text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {veiculos.map((v) => {
            const cartoesDoVeiculo = cartoes.filter(c => c.veiculoId === v.id);
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
                
                <td className="p-4 text-center">
                  <span className="inline-block px-3 py-1 border-2 border-slate-800 rounded text-xs font-black tracking-[0.1em] bg-white shadow-sm font-mono">
                    {formatMatricula(v.matricula)}
                  </span>
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
                  <div className="flex flex-col gap-1 max-w-[180px]">
                    {cartoesDoVeiculo.length > 0 ? (
                      cartoesDoVeiculo.map(c => (
                        <span 
                          key={c.id} 
                          className={`flex items-center gap-2 px-2 py-1 rounded-lg text-[10px] font-bold border font-mono ${
                            c.tipo === 'combustivel' 
                            ? 'bg-orange-50 text-orange-600 border-orange-100' 
                            : 'bg-blue-50 text-blue-600 border-blue-100'
                          }`}
                          title={`Fornecedor: ${c.fornecedor}`}
                        >
                          <CreditCard size={10} />
                          {c.numero}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-slate-300 italic">Nenhum</span>
                    )}
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

                {/* 🟢 COLUNA DO INTERRUPTOR DE ANÚNCIO DO CATÁLOGO PÚBLICO [NOVO] */}
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
                    <button onClick={() => onEdit(v, true)} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors bg-slate-50 rounded-lg hover:bg-indigo-50 cursor-pointer" title="Visualizar Ficha"><Eye size={18} /></button>
                    <button onClick={() => onEdit(v, false)} className="p-2 text-slate-400 hover:text-tvde-primary transition-colors bg-slate-50 rounded-lg hover:bg-blue-50 cursor-pointer" title="Editar"><Edit size={18} /></button>
                    <button onClick={() => onDelete(v.id)} className="p-2 text-slate-400 hover:text-tvde-danger transition-colors bg-slate-50 rounded-lg hover:bg-red-50 cursor-pointer" title="Eliminar"><Trash2 size={18} /></button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}