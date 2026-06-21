/**
 * Configuracoes.jsx
 * Localização: src/pages/Configuracoes.jsx
 *
 * Página de controlo e parametrização geral do ERP.
 * Otimizado com:
 * - Gestão de acessos à equipa administrativa.
 * - Injeção de Título e Botão dinâmicos via React Portal.
 * - [NOVO] Painel de configuração de frotas ("Veículos") para parametrizar limite de anos TVDE.
 * - [NOVO] Integração de listeners em tempo real para carregamento rápido e robusto.
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Loader2, ShieldCheck, Car, Key, Save, Sparkles, AlertCircle } from 'lucide-react';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import UsuarioForm from '../features/usuarios/UsuarioForm';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { logAcaoGlobal } from '../utils/logger';
import { 
  collection, addDoc, getDocs, query, doc, 
  deleteDoc, updateDoc, onSnapshot, setDoc 
} from 'firebase/firestore';

export default function Configuracoes() {
  const { userData } = { userData: useAuth().userData }; // Preserva contexto de autenticação

  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState('acessos'); // 'acessos' ou 'veiculos'
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUsuario, setEditingUsuario] = useState(null);

  // [NOVO] Estados para as parametrizações de frotas
  const [limiteAnosTVDE, setLimiteAnosTVDE] = useState(7);
  const [savingConfig, setSavingConfig] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Carrega e sincroniza em tempo real a listagem de utilizadores e configurações gerais
  useEffect(() => {
    setLoading(true);
    
    // 1. Escuta utilizadores
    const qUsuarios = query(collection(db, "usuarios"));
    const unsubUsuarios = onSnapshot(qU, (snap) => {
      setMotoristas(snap.docs.map(d => ({ id: d.id, ...d.data() }))); // Mantido caso o seu ERP dependa do mapeamento
      setFuncionarios(snap.docs.map(d => ({ id: d.id, ...d.data() }))); // Sincroniza estado de utilizadores
    }, (error) => console.error("Erro ao carregar utilizadores:", error));

    // 2. Escuta limites de idade TVDE
    const unsubConfig = onSnapshot(doc(db, "configuracoes", "veiculos"), (docSnap) => {
      if (docSnap.exists()) {
        setLimiteAnosTVDE(docSnap.data().limiteAnosTVDE || 7);
      }
    });

    setLoading(false);
    return () => {
      unsubscribe();
      unsubConfig();
    };
  }, []);

  const fetchConfiguracoesEUsuarios = async () => {
    setLoading(true);
    try {
      const snapU = await getDocs(query(collection(db, "usuarios")));
      setFuncionarios(snapU.docs.map(d => ({ id: d.id, ...d.data() })));
      
      const snapConfig = await getDocs(query(collection(db, "configuracoes")));
      const docConfig = snapConfig.docs.find(d => d.id === "veiculos");
      if (docConfig) {
        setLimiteAnosTVDE(docConfig.data().limiteAnosTVDE || 7);
      }
    } catch (e) {
      console.error("Erro ao carregar parametrizações:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveUsuario = async (dados) => {
    try {
      setLoading(true);
      if (editingUsuario) {
        const docRef = doc(db, "usuarios", editingUsuario.id);
        await updateDoc(docRef, dados);
        await logAcaoGlobal(userData?.nome, "Edição Cargo", "Configurações", dados.nome, editingVeiculo?.id || '');
      } else {
        const docRef = await addDoc(collection(db, "usuarios"), {
          ...dados,
          dataCriacao: new Date().toISOString()
        });
        await logAcaoGlobal(userData?.nome, "Criação Utilizador", "Configurações", dados.nome, docRef.id);
      }
      fecharModal();
      fetchData();
    } catch (error) {
      console.error("Erro ao salvar utilizador:", error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * [NOVO] Grava a parametrização de limite de circulação TVDE
   */
  const handleSaveConfigVeiculos = async () => {
    if (!limiteAnosTVDE || isNaN(limiteAnosTVDE) || limiteAnosTVDE < 1) {
      alert("Por favor, insira um número de anos válido.");
      return;
    }
    
    setSavingConfig(true);
    try {
      const configRef = doc(db, "configuracoes", "veiculos");
      await setDoc(configRef, {
        limiteAnosTVDE: Number(limiteAnosTVDE),
        atualizadoPor: userData?.nome || 'Sistema',
        dataAtualizacao: new Date().toISOString()
      }, { merge: true });

      await logAcaoGlobal(
        userData?.nome, 
        "Configuração Veículos", 
        "Frotas", 
        `Limite TVDE alterado para ${limiteAnosTVDE} anos`, 
        "veiculos"
      );

      alert("Parâmetros de frotas TVDE guardados com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar configuração:", error);
      alert("Erro ao registar a nova configuração.");
    } finally {
      setSavingConfig(false);
    }
  };

  const handleDeleteUsuario = async (id) => {
    if (window.confirm("Remover o acesso deste utilizador permanente?")) {
      try {
        await deleteDoc(doc(db, "usuarios", id));
        fetchData();
      } catch (error) {
        console.error("Erro ao eliminar:", error);
      }
    }
  };

  const handleEditClick = (usuario) => {
    setEditingUsuario(usuario);
    setIsModalOpen(true);
  };

  const fecharModal = () => {
    setIsModalOpen(false);
    setEditingVeiculo(null); // mantido por conformidade de limpeza
  };

  return (
    <div className="space-y-4">
      {/* PORTAL DINÂMICO DE CABEÇALHO */}
      {mounted && document.getElementById('header-dynamic-slot') && createPortal(
        <div className="flex items-center gap-3 animate-in fade-in duration-200">
          <div className="h-4 w-[1.5px] bg-slate-200 hidden lg:block select-none" />
          <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider hidden sm:block select-none">Configurações</h2>
        </div>,
        document.getElementById('header-dynamic-slot')
      )}

      {/* Navegação de Abas internas das Configurações */}
      <div className="flex border-b border-slate-100 select-none">
        <button 
          onClick={() => setModoProprietario('existente')} // Usado para mapear separador de equipe
          className={`pb-2.5 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${modoProprietario === 'existente' ? 'border-tvde-primary text-tvde-primary' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          👤 Equipa & Permissões
        </button>
        <button 
          onClick={() => setModoProprietario('novo')} // Usado para o painel de frotas
          className={`px-4 py-2 text-xs font-bold rounded transition-colors pb-3 border-b-2 flex items-center gap-2 cursor-pointer ${modoProprietario === 'novo' ? 'border-indigo-600 text-indigo-600 font-black' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          <Car size={14} /> Parametrizar Veículos
        </button>
      </div>

      {/* CONTEÚDO 1: GESTÃO DE ACESSOS (EQUIPA) */}
      {modoProprietario === 'existente' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-slate-500 text-xs font-medium -mt-1 select-none">
              Gestão de acessos à equipa administrativa.
            </p>
            <Button onClick={() => setIsModalOpen(true)} className="text-[10px] font-black uppercase h-8 py-1.5 px-3 shadow-sm">
              + Adicionar Membro
            </Button>
          </div>

          {loadingData ? (
            <div className="flex justify-center py-20">
              <Loader2 className="animate-spin text-slate-300" size={32} />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {funcionarios.map(u => (
                <div key={u.id} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-md transition-all relative group text-left">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-2xl ${u.role === 'admin' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                      <ShieldCheck size={24} />
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEditClick(u)} className="p-2 text-slate-400 hover:text-tvde-primary bg-slate-50 rounded-lg cursor-pointer">
                        <Settings size={16} />
                      </button>
                      <button onClick={() => handleDeleteUsuario(u.id)} className="p-2 text-slate-400 hover:text-red-500 bg-slate-50 rounded-lg cursor-pointer">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">{u.nome}</h3>
                    <p className="text-sm text-slate-500 truncate">{u.email}</p>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase px-3 py-1 rounded-full bg-slate-100 text-slate-600">
                        {u.role}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CONTEÚDO 2: PARAMETRIZAÇÃO DE VEÍCULOS (NOVO SEPARADOR) */}
      {modoProprietario === 'novo' && (
        <div className="animate-in fade-in duration-200 text-left max-w-2xl">
          <div className="bg-white p-6 sm:p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl shrink-0">
                <Car size={24} />
              </div>
              <div>
                <h3 className="font-black text-slate-800 text-lg">Regulamento de Frota TVDE</h3>
                <p className="text-xs text-slate-400">Configure as regras legais de idade limite para circulação das viaturas.</p>
              </div>
            </div>

            <div className="space-y-4 border-t border-slate-50 pt-4">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase mb-2 ml-1">
                  Tempo Limite de Circulação (Anos de Idade Máxima)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="25"
                    className="w-32 py-2 px-3.5 border border-slate-200 rounded-xl outline-none transition-all text-sm bg-white focus:ring-2 focus:ring-tvde-primary/20 hover:border-slate-300 font-black text-center"
                    value={limiteAnosTVDE}
                    onChange={(e) => setLimiteAnosTVDE(e.target.value)}
                  />
                  <span className="text-xs font-bold text-slate-500">Anos desde a primeira matrícula</span>
                </div>
                <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                  Este parâmetro define qual a validade máxima de circulação das viaturas nas plataformas Uber e Bolt. 
                  O ERP utiliza este limite dinamicamente para calcular e alertar em tempo real quanto tempo resta a cada veículo.
                </p>
              </div>
              
              <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-2xl flex gap-3 text-amber-700 text-xs">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Aviso Regulamentar</p>
                  <p className="mt-1 leading-relaxed opacity-90">
                    Atualmente a lei portuguesa impõe o limite estrito de <strong>7 anos</strong>. 
                    Se a nova proposta de alteração legislativa for ratificada para <strong>10 anos</strong>, mude o valor acima e guarde para atualizar de forma imediata todas as fichas de viatura do sistema.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <Button 
                onClick={handleSaveConfigVeiculos} 
                disabled={savingConfig || !limiteAnosTVDE}
                className="px-6 h-10 text-xs shadow-md"
              >
                {savingConfig ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="animate-spin" size={14} /> A Guardar...
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Save size={14} /> Guardar Parâmetros
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL UTILIZADORES */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={fecharModal} 
        title={editingUsuario ? "Editar Permissões" : "Conceder Novo Acesso"}
      >
        <UsuarioForm 
          onSubmit={handleSaveUsuario} 
          onCancel={fecharModal} 
          initialData={editingUsuario || {}} 
        />
      </Modal>
    </div>
  );
}