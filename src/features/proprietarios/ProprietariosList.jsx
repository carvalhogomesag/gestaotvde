import React from 'react';
import { Edit, Trash2, Building2, Phone, Mail, Eye, AlertCircle } from 'lucide-react';

export default function ProprietariosList({ proprietarios, onEdit, onDelete }) {
  
  // Função para verificar se o registo está incompleto
  const isProfileIncomplete = (p) => {
    const camposEssenciais = ['nif', 'email', 'telemovel'];
    return camposEssenciais.some(campo => !p[campo] || p[campo] === '');
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-100">
            <th className="p-4 font-semibold text-slate-600 text-sm">Proprietário / Empresa</th>
            <th className="p-4 font-semibold text-slate-600 text-sm">ID Interno</th>
            <th className="p-4 font-semibold text-slate-600 text-sm">NIF / NIPC</th>
            <th className="p-4 font-semibold text-slate-600 text-sm">Contacto</th>
            <th className="p-4 font-semibold text-slate-600 text-sm text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {proprietarios.map((p) => {
            const incomplete = isProfileIncomplete(p);

            return (
              <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100">
                      <Building2 size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{p.nome}</p>
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">{p.cidade || 'Portugal'}</p>
                    </div>
                  </div>
                </td>

                {/* NOVA COLUNA: ID INTERNO */}
                <td className="p-4">
                  <span className="bg-slate-800 text-white text-[10px] font-black px-2 py-1 rounded shadow-sm tracking-wider font-mono">
                    {p.codigoInterno || 'S/ID'}
                  </span>
                </td>

                <td className="p-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-mono text-slate-600 font-medium">
                      {p.nif || <span className="text-slate-300 italic">Não registado</span>}
                    </span>
                    {incomplete && (
                      <span className="flex items-center gap-1 text-[9px] bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded-md font-black uppercase border border-orange-100 w-fit">
                        <AlertCircle size={10} /> Incompleto
                      </span>
                    )}
                  </div>
                </td>

                <td className="p-4 text-sm text-slate-600">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <Mail size={12} className="text-slate-400" /> 
                      {p.email || '---'}
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone size={12} className="text-slate-400" /> 
                      {p.telemovel ? `+351 ${p.telemovel}` : '---'}
                    </div>
                  </div>
                </td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => onEdit(p, true)} 
                      className="p-2 text-slate-400 hover:text-indigo-600 transition-colors bg-slate-50 rounded-lg hover:bg-indigo-50"
                      title="Visualizar Ficha"
                    >
                      <Eye size={18} />
                    </button>
                    <button 
                      onClick={() => onEdit(p, false)} 
                      className="p-2 text-slate-400 hover:text-tvde-primary transition-colors bg-slate-50 rounded-lg hover:bg-blue-50"
                      title="Editar"
                    >
                      <Edit size={18} />
                    </button>
                    <button 
                      onClick={() => onDelete(p.id)} 
                      className="p-2 text-slate-400 hover:text-tvde-danger transition-colors bg-slate-50 rounded-lg hover:bg-red-50"
                      title="Eliminar"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {proprietarios.length === 0 && (
        <div className="p-10 text-center text-slate-400 text-sm italic">
          Nenhum proprietário registado no sistema.
        </div>
      )}
    </div>
  );
}