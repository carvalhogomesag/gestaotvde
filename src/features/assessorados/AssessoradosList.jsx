/**
 * AssessoradosList.jsx
 * Localização: src/features/assessorados/AssessoradosList.jsx
 *
 * Tabela de listagem de clientes em Assessoria de Apoio Documental TVDE.
 * Totalmente responsiva com largura mínima de segurança para evitar quebras de layout.
 */

import React from 'react';
import { Edit, Eye, User, Phone, BookOpen, Layers, Clock } from 'lucide-react';

export default function AssessoradosList({ assessorados, onEdit }) {

  /**
   * Retorna os estilos visuais de acordo com a etapa regulatória atual do cliente em Portugal
   */
  const obterEtapaBadge = (etapa) => {
    switch (etapa) {
      case 'Inscrição':
        return 'bg-blue-50 text-blue-600 border-blue-200';
      case 'Formação':
        return 'bg-amber-50 text-amber-600 border-amber-200';
      case 'IMT':
        return 'bg-purple-50 text-purple-600 border-purple-200';
      case 'Contas':
        return 'bg-indigo-50 text-indigo-600 border-indigo-200';
      case 'Vinculado':
        return 'bg-emerald-50 text-emerald-600 border-emerald-200 font-black animate-pulse';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  /**
   * Retorna as cores de acordo com o estado geral de assessoria do cliente
   */
  const obterStatusColor = (status) => {
    switch (status) {
      case 'Ativo':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'Concluído':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      case 'Cancelado':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    // Largura mínima de segurança de 800px para garantir alinhamento limpo no mobile
    <table className="w-full text-left border-collapse min-w-[800px]">
      <thead>
        <tr className="bg-slate-50 border-b border-slate-100">
          <th className="p-4 font-semibold text-slate-600 text-sm">Cliente</th>
          <th className="p-4 font-semibold text-slate-600 text-sm">Contacto / NIF</th>
          <th className="p-4 font-semibold text-slate-600 text-sm">Plano Contratado</th>
          <th className="p-4 font-semibold text-slate-600 text-sm text-center">Etapa Atual</th>
          <th className="p-4 font-semibold text-slate-600 text-sm text-center">Estado</th>
          <th className="p-4 font-semibold text-slate-600 text-sm text-right">Ações</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-50">
        {assessorados.map((a) => (
          <tr key={a.id} className="hover:bg-slate-50/50 transition-colors text-slate-700">
            
            {/* Nome e Código */}
            <td className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 text-tvde-primary rounded-xl flex items-center justify-center border border-blue-100 shrink-0">
                  <User size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="bg-slate-800 text-white text-[10px] font-black px-1.5 py-0.5 rounded shadow-sm tracking-wider font-mono shrink-0">
                      {a.codigoInterno || 'ASS-XXXX'}
                    </span>
                    <p className="font-bold text-slate-800">{a.nome}</p>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono uppercase tracking-tighter">ID: {a.id.substring(0, 8)}...</p>
                </div>
              </div>
            </td>

            {/* Telemóvel e NIF */}
            <td className="p-4 text-xs sm:text-sm font-semibold">
              <p className="flex items-center gap-1.5 text-slate-700">
                <Phone size={13} className="text-slate-400 shrink-0" />
                {a.telemovel || '---'}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">NIF: {a.nif || '---'}</p>
            </td>

            {/* Plano Contratado */}
            <td className="p-4 text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <BookOpen size={14} className="text-slate-400 shrink-0" />
                <div>
                  <p className="font-bold text-slate-800 leading-tight">
                    {a.planoNome || 'Plano Personalizado'}
                  </p>
                  <p className="text-[9px] text-slate-400 font-medium uppercase mt-0.5 tracking-wider">
                    {a.cidade || 'Lisboa'}
                  </p>
                </div>
              </div>
            </td>

            {/* Etapa Atual do Processo TVDE */}
            <td className="p-4 text-center">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border ${obterEtapaBadge(a.etapaAdicional)}`}>
                <Layers size={10} />
                {a.etapaAdicional || 'Inscrição'}
              </span>
            </td>

            {/* Estado Geral */}
            <td className="p-4 text-center">
              <span className={`inline-flex px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${obterStatusColor(a.status)}`}>
                {a.status || 'Ativo'}
              </span>
            </td>

            {/* Ações */}
            <td className="p-4 text-right">
              <div className="flex justify-end gap-2">
                <button 
                  type="button"
                  onClick={() => onEdit(a, true)} 
                  className="p-2 text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer" 
                  title="Visualizar Ficha"
                >
                  <Eye size={18} />
                </button>
                <button 
                  type="button"
                  onClick={() => onEdit(a, false)} 
                  className="p-2 text-slate-400 hover:text-tvde-primary bg-slate-50 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer" 
                  title="Editar Processo"
                >
                  <Edit size={18} />
                </button>
              </div>
            </td>

          </tr>
        ))}
      </tbody>
    </table>
  );
}