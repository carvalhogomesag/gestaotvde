/**
 * MotoristasList.jsx
 * Localização: src/features/motoristas/MotoristasList.jsx
 *
 * Listagem tabular compacta de motoristas.
 * Otimizado com:
 * - Interruptor de estado (Ativo/Inativo) com trava de segurança para pendentes [1, 2].
 * - Auto-corretor em segundo plano para manter conformidade de estado no Firestore [1].
 * - Filtros rápidos no cabeçalho integrados [2].
 */

import React, { useState, useEffect } from 'react';
import { 
  Edit, Trash2, User, FileText, CreditCard, 
  ShieldAlert, BadgeCheck, Home, Eye, AlertCircle, 
  Sparkles 
} from 'lucide-react';
import { db } from '../../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { logAcaoGlobal } from '../../utils/logger';
import { useAuth } from '../../context/AuthContext';

export default function MotoristasList({ motoristas, onEdit, onDelete }) {
  const { userData } = useAuth();

  // ESTADOS LOCAIS PARA OS FILTROS DE CADA COLUNA
  const [filterNome, setFilterNome] = useState('');
  const [filterContacto, setFilterContacto] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [filterDocs, setFilterDocs] = useState('todos');

  /**
   * Determina a cor do ícone baseada na validade do documento
   */
  const checkStatusColor = (data) => {
    if (!data) return 'text-slate-300 bg-slate-50 border-slate-200'; 
    const hoje = new Date();
    const validade = new Date(data);
    const diffEmDias = Math.floor((validade - hoje) / (1000 * 60 * 60 * 24));
    if (diffEmDias < 0) return 'text-red-600 bg-red-50 border-red-200 animate-pulse'; 
    if (diffEmDias <= 30) return 'text-orange-600 bg-orange-50 border-orange-200'; 
    return 'text-green-600 bg-green-50 border-green-200'; 
  };

  /**
   * Verifica se a ficha tem campos obrigatórios em falta
   */
  const isProfileIncomplete = (m) => {
    const camposObrigatorios = [
      'email', 'telemovel', 'nif', 'iban', 'numID', 'numTVDE',
      'docIDFront', 'docIDBack', 'docCartaFront', 'docCartaBack', 'docCertificadoTVDE', 'docRegistoCriminal'
    ];
    return camposObrigatorios.some(campo => !m[campo] || m[campo] === '');
  };

  /**
   * Verifica se existem campos preenchidos por IA aguardando validação
   */
  const needsAIValidation = (m) => {
    return Object.keys(m).some(key => key.startsWith('ai_filled_') && m[key] === true);
  };

  // ◄ ADICIONADO: Auto-corretor de conformidade regulamentar em segundo plano [1]
  useEffect(() => {
    motoristas.forEach(async (m) => {
      if (isProfileIncomplete(m) && m.status === 'Ativo') {
        try {
          const docRef = doc(db, "motoristas", m.id);
          await updateDoc(docRef, { status: "Inativo" });
          await logAcaoGlobal("Sistema", "Auto-Correção", "Motoristas", `Estado de ${m.nome} forçado a Inativo por documentação pendente`, m.id);
        } catch (e) {
          console.error("Erro ao auto-corrigir estado de conformidade:", e);
        }
      }
    });
  }, [motoristas]);

  // ◄ ADICIONADO: Função para alternar o estado diretamente na lista [1, 2]
  const handleToggleStatus = async (motoristaId, nome, currentStatus, incomplete) => {
    if (incomplete) {
      alert("Operação bloqueada: Não é possível ativar um motorista com documentação pendente.");
      return;
    }

    const novoEstado = currentStatus === 'Ativo' ? 'Inativo' : 'Ativo';
    
    try {
      const docRef = doc(db, "motoristas", motoristaId);
      await updateDoc(docRef, { status: novoEstado });
      await logAcaoGlobal(userData?.nome || 'Sistema', "Alteração de Estado", "Motoristas", `Status de ${nome} alterado para ${novoEstado}`, motoristaId);
    } catch (error) {
      console.error("Erro ao alterar estado do motorista:", error);
      alert("Erro ao alterar o estado do motorista.");
    }
  };

  // Ordenação Alfabética Nativa por Defeito + Filtragem Multi-Coluna
  const sortedAndFilteredMotoristas = [...motoristas]
    .sort((a, b) => {
      const nomeA = a.nome || '';
      const nomeB = b.nome || '';
      return nomeA.localeCompare(nomeB, 'pt', { sensitivity: 'base' });
    })
    .filter((m) => {
      const incomplete = isProfileIncomplete(m);
      const effectiveStatus = incomplete ? 'Inativo' : (m.status || 'Inativo');

      // 1. Filtragem por Nome ou Código
      const queryNome = filterNome.toLowerCase();
      const matchesNome = 
        (m.nome || '').toLowerCase().includes(queryNome) ||
        (m.codigoInterno || '').toLowerCase().includes(queryNome);

      // 2. Filtragem por Telemóvel ou NIF
      const queryContacto = filterContacto.toLowerCase();
      const matchesContacto = 
        (m.telemovel || '').toLowerCase().includes(queryContacto) ||
        (m.nif || '').toLowerCase().includes(queryContacto);

      // 3. Filtragem por Status (Alinhado com a trava de pendentes)
      const matchesStatus = filterStatus === 'todos' || effectiveStatus === filterStatus;

      // 4. Filtragem pelo Estado dos Documentos
      let matchesDocs = true;
      if (filterDocs === 'pendente') {
        matchesDocs = incomplete;
      } else if (filterDocs === 'completo') {
        matchesDocs = !incomplete;
      } else if (filterDocs === 'ia') {
        matchesDocs = needsAIValidation(m);
      }

      return matchesNome && matchesContacto && matchesStatus && matchesDocs;
    });

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-x-auto w-full custom-scrollbar">
      <table className="w-full text-left border-collapse min-w-[750px]">
        <thead>
          {/* Cabeçalho de Títulos Principal */}
          <tr className="bg-slate-50 border-b border-slate-100">
            <th className="p-4 font-semibold text-slate-600 text-sm">Motorista</th>
            <th className="p-4 font-semibold text-slate-600 text-sm">Contacto / NIF</th>
            <th className="p-4 font-semibold text-slate-600 text-sm">Status</th>
            <th className="p-4 font-semibold text-slate-600 text-sm">Documentos</th>
            <th className="p-4 font-semibold text-slate-600 text-sm text-right">Ações</th>
          </tr>
          
          {/* Linha de Filtros Dinâmicos Individuais por Coluna */}
          <tr className="bg-slate-50/50 border-b border-slate-100">
            {/* Filtro: Motorista */}
            <td className="px-4 py-2">
              <input 
                type="text" 
                placeholder="🔍 Pesquisar por nome/ID..." 
                value={filterNome} 
                onChange={(e) => setFilterNome(e.target.value)}
                className="w-full p-1.5 border border-slate-200 rounded-lg text-[11px] outline-none focus:ring-1 focus:ring-tvde-primary text-slate-700 bg-white font-medium"
              />
            </td>
            {/* Filtro: Contacto / NIF */}
            <td className="px-4 py-2">
              <input 
                type="text" 
                placeholder="🔍 Pesquisar tlf/NIF..." 
                value={filterContacto} 
                onChange={(e) => setFilterContacto(e.target.value)}
                className="w-full p-1.5 border border-slate-200 rounded-lg text-[11px] outline-none focus:ring-1 focus:ring-tvde-primary text-slate-700 bg-white font-medium"
              />
            </td>
            {/* Filtro: Status */}
            <td className="px-4 py-2">
              <select 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full p-1.5 border border-slate-200 rounded-lg text-[11px] outline-none focus:ring-1 focus:ring-tvde-primary text-slate-700 bg-white font-medium cursor-pointer"
              >
                <option value="todos">Todos</option>
                <option value="Ativo">Ativo</option>
                <option value="Inativo">Inativo</option>
              </select>
            </td>
            {/* Filtro: Documentos */}
            <td className="px-4 py-2">
              <select 
                value={filterDocs} 
                onChange={(e) => setFilterDocs(e.target.value)}
                className="w-full p-1.5 border border-slate-200 rounded-lg text-[11px] outline-none focus:ring-1 focus:ring-tvde-primary text-slate-700 bg-white font-medium cursor-pointer"
              >
                <option value="todos">Todos</option>
                <option value="pendente">Pendente</option>
                <option value="completo">Completo</option>
                <option value="ia">Revisão IA</option>
              </select>
            </td>
            <td className="px-4 py-2"></td>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {sortedAndFilteredMotoristas.map((m) => {
            const incomplete = isProfileIncomplete(m);
            const aiReview = needsAIValidation(m);
            const isDriverActive = m.status === 'Ativo' && !incomplete;
            
            return (
              <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    {m.fotoPerfil ? (
                      <img src={m.fotoPerfil} alt="" className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-sm" />
                    ) : (
                      <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                        <User size={20} />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="bg-slate-800 text-white text-[10px] font-black px-1.5 py-0.5 rounded shadow-sm tracking-wider font-mono">
                          {m.codigoInterno || 'S/ID'}
                        </span>
                        <p className="font-bold text-slate-800">{m.nome}</p>
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono uppercase tracking-tighter">ID Sistema: {m.id.substring(0, 5)}...</p>
                    </div>
                  </div>
                </td>
                <td className="p-4 text-sm text-slate-600">
                  <p className="font-medium">{m.telemovel || '---'}</p>
                  <p className="text-[10px] text-slate-400 font-bold">NIF: {m.nif || '---'}</p>
                </td>
                
                {/* ◄ ALTERADO: Coluna de Status Interativa (Toggle Switch) com Trava de Segurança */}
                <td className="p-4">
                  <div className="flex flex-col gap-1.5 text-left justify-center">
                    <div className="flex items-center gap-2.5">
                      {/* Botão Interruptor (Switch) */}
                      <button
                        type="button"
                        disabled={incomplete}
                        onClick={() => handleToggleStatus(m.id, m.nome, m.status, incomplete)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          incomplete 
                            ? 'bg-slate-200 cursor-not-allowed opacity-50' 
                            : (isDriverActive ? 'bg-emerald-500' : 'bg-slate-300')
                        }`}
                        title={incomplete ? "Bloqueado: Documentação Pendente" : `Alternar para ${isDriverActive ? 'Inativo' : 'Ativo'}`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            isDriverActive ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                      
                      {/* Texto de Estado */}
                      <span className={`text-[10px] font-black uppercase tracking-wider ${
                        incomplete 
                          ? 'text-red-500 font-extrabold' 
                          : (isDriverActive ? 'text-emerald-600' : 'text-slate-500')
                      }`}>
                        {incomplete ? 'Inativo (Pendente)' : m.status}
                      </span>
                    </div>
                    
                    {/* INDICADOR DE REVISÃO IA */}
                    {aiReview && (
                      <span className="flex items-center gap-1 text-[9px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md font-black uppercase border border-blue-100 animate-pulse w-fit mt-1">
                        <Sparkles size={10} /> Revisão IA
                      </span>
                    )}
                  </div>
                </td>
                
                <td className="p-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-3">
                      <div className="flex -space-x-2">
                        {(m.docIDFront || m.docIDBack) && (
                          <a href={m.docIDFront || m.docIDBack} target="_blank" rel="noreferrer" 
                            className={`w-8 h-8 rounded-full border flex items-center justify-center shadow-sm z-10 transition-all ${checkStatusColor(m.validadeID)}`} 
                            title="ID">
                            <User size={14} />
                          </a>
                        )}
                        {(m.docCartaFront || m.docCartaBack) && (
                          <a href={m.docCartaFront || m.docCartaBack} target="_blank" rel="noreferrer" 
                            className={`w-8 h-8 rounded-full border flex items-center justify-center shadow-sm z-20 transition-all ${checkStatusColor(m.validadeCarta)}`} 
                            title="Carta">
                            <FileText size={14} />
                          </a>
                        )}
                      </div>

                      <div className="flex -space-x-2">
                        {m.docCertificadoTVDE} {
                          m.docCertificadoTVDE && (
                            <a href={m.docCertificadoTVDE} target="_blank" rel="noreferrer" 
                              className={`w-8 h-8 rounded-full border flex items-center justify-center shadow-sm z-10 transition-all ${checkStatusColor(m.validadeTVDE)}`} title="TVDE">
                              <BadgeCheck size={14} />
                            </a>
                          )
                        }
                        {m.docRegistoCriminal && (
                          <a href={m.docRegistoCriminal} target="_blank" rel="noreferrer" 
                            className={`w-8 h-8 rounded-full border flex items-center justify-center shadow-sm z-20 ${checkStatusColor(m.validadeCriminal)}`} title="Criminal">
                            <ShieldAlert size={14} />
                          </a>
                        )}
                      </div>

                      <div className="flex -space-x-2">
                        {m.docIBAN && <a href={m.docIBAN} target="_blank" className="w-8 h-8 flex items-center justify-center bg-slate-50 border border-slate-100 rounded-full text-slate-400 hover:text-tvde-primary transition" title="Comprovativo IBAN"><Wallet size={12} /></a>}
                        {m.docMorada && <a href={formData.docMorada} target="_blank" rel="noreferrer" className="w-8 h-8 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-full text-slate-400 hover:text-indigo-500 transition" title="Comprovativo Morada"><Home size={12} /></a>}
                      </div>
                    </div>

                    {incomplete && (
                      <span className="flex items-center gap-1 text-[9px] bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded-md font-black uppercase border border-orange-100 w-fit">
                        <AlertCircle size={10} /> Pendente
                      </span>
                    )}
                  </div>
                </td>

                <td className="p-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => onEdit(m, true)} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors bg-slate-50 rounded-lg hover:bg-indigo-50 cursor-pointer" title="Visualizar"><Eye size={18} /></button>
                    <button onClick={() => onEdit(m, false)} className="p-2 text-slate-400 hover:text-tvde-primary transition-colors bg-slate-50 rounded-lg hover:bg-blue-50 cursor-pointer" title="Editar"><Edit size={18} /></button>
                    <button onClick={() => onDelete(m.id)} className="p-2 text-slate-400 hover:text-tvde-danger transition-colors bg-slate-50 rounded-lg hover:bg-red-50 cursor-pointer" title="Eliminar"><Trash2 size={18} /></button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {sortedAndFilteredMotoristas.length === 0 && (
        <div className="p-10 text-center text-slate-400 text-sm italic">
          Nenhum motorista corresponde aos critérios de pesquisa ou seleção.
        </div>
      )}
    </div>
  );
}