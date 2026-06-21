/**
 * Proprietarios.jsx
 * Localização: src/pages/Proprietarios.jsx
 *
 * Página de controlo e monitorização de proprietários e frotas.
 * Otimizado com:
 * - Filtros rápidos e ordenação integrada.
 * - Sincronização e criação inline de condutores de frotas.
 * - Injeção de Título e Botão "Novo Proprietário" via React Portal diretamente no Header.
 * - [NOVO] Mini-Dashboard analítico super compacto com KPIs de frotas em tempo real.
 * - [NOVO] Remoção da barra de pesquisa redundante para máximo ganho de espaço vertical.
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom'; // Importado para suporte a Portais dinâmicos no Header
import { useLocation } from 'react-router-dom';
// Adicionados os ícones para os mini-cards do Dashboard de frotas
import { Plus, Loader2, Building2, UserCheck, Users } from 'lucide-react';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import JustificacaoModal from '../components/ui/JustificacaoModal';
import TicketModal from '../components/ui/TicketModal';
import ProprietariosList from '../features/proprietarios/ProprietariosList';
import ProprietarioForm from '../features/proprietarios/ProprietarioForm';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { generateNextCode } from '../utils/idGenerator';
import { logAcaoGlobal } from '../utils/logger';
import { 
  collection, addDoc, getDocs, query, 
  doc, deleteDoc, updateDoc, arrayUnion 
} from 'firebase/firestore';

export default function Proprietarios() {
  const { userData } = useAuth();
  const location = useLocation();
  
  // Estado didático de montagem para garantir integridade do Portal React
  const [mounted, setMounted] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isJustifyModalOpen, setIsJustifyModalOpen] = useState(false);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  
  const [proprietarios, setProprietarios] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingProp, setEditingProp] = useState(null);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [tempDados, setTempDados] = useState(null);
  const [lastSavedItem, setLastSavedItem] = useState(null);

  // Ativa a montagem segura do portal no mount inicial do componente
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  /**
   * FUNÇÃO DE LIMPEZA: Impede erros de "undefined" no Firestore
   */
  const limparDadosParaFirebase = (obj) => {
    const novoObj = { ...obj };
    delete novoObj.id; 
    Object.keys(novoObj).forEach(key => {
      if (novoObj[key] === undefined || novoObj[key] === null) {
        novoObj[key] = ""; 
      }
    });
    return novoObj;
  };

  /**
   * CALLBACK: Criar Motorista em linha (Inline)
   */
  const handleCriarMotorista = async (dadosMinimos) => {
    try {
      const codigo = await generateNextCode('motoristas', 'MOT');
      const docRef = await addDoc(collection(db, 'motoristas'), {
        nome: dadosMinimos.nome || '',
        nif: dadosMinimos.nif || '',
        iban: dadosMinimos.iban || '',
        telemovel: dadosMinimos.telemovel || '',
        email: dadosMinimos.email || '',
        codigoInterno: codigo,
        status: 'Ativo',
        criadoViaProprietario: true,
        dataCriacao: new Date().toISOString()
      });
      await logAcaoGlobal(userData?.nome, 'Criação Automática', 'Motoristas', dadosMinimos.nome, docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Erro ao criar motorista em linha:', error);
      return null;
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [snapP, snapU] = await Promise.all([
        getDocs(query(collection(db, "proprietarios"))),
        getDocs(query(collection(db, "usuarios")))
      ]);

      const listaProprietarios = snapP.docs.map(d => ({ id: d.id, ...d.data() }));
      setProprietarios(listaProprietarios);
      setFuncionarios(snapU.docs.map(d => ({ id: d.id, ...d.data() })));

      const params = new URLSearchParams(location.search);
      const targetId = params.get('id');
      if (targetId) {
        const propTarget = listaProprietarios.find(p => p.id === targetId);
        if (propTarget) {
          handleEditClick(propTarget, false);
        }
      }
      
    } catch (error) { 
      console.error("Erro ao carregar dados:", error); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { 
    fetchData(); 
  }, [location.search]);

  const handleSave = async (dados) => {
    if (editingProp && !isViewOnly) {
      setTempDados(dados);
      setIsJustifyModalOpen(true);
    } else {
      try {
        setLoading(true);
        const novoCodigo = await generateNextCode("proprietarios", "PRO");
        const dadosLimpos = limparDadosParaFirebase(dados);
        
        const docRef = await addDoc(collection(db, "proprietarios"), {
          ...dadosLimpos,
          codigoInterno: novoCodigo,
          criadoPor: userData?.nome || 'Sistema',
          dataCriacao: new Date().toISOString(),
          historico: []
        });

        await logAcaoGlobal(userData?.nome, "Criação", "Proprietários", dadosLimpos.nome, docRef.id);

        setLastSavedItem({ id: docRef.id, nome: dadosLimpos.nome, codigo: novoCodigo });
        fecharModal();
        fetchData();
        setIsTicketModalOpen(true);
      } catch (error) { 
        console.error("Erro ao criar proprietário:", error);
        alert("Erro ao salvar novo proprietário."); 
      } finally {
        setLoading(false);
      }
    }
  };

  const confirmarSalvamentoComLog = async (motivo) => {
    try {
      setLoading(true);
      const docRef = doc(db, "proprietarios", editingProp.id);
      const dadosLimpos = limparDadosParaFirebase(tempDados);
      
      const novoLog = {
        usuario: userData?.nome || 'Utilizador',
        data: new Date().toISOString(),
        descricao: motivo
      };

      await updateDoc(docRef, {
        ...dadosLimpos,
        historico: arrayUnion(novoLog)
      });

      await logAcaoGlobal(userData?.nome, "Edição", "Proprietários", dadosLimpos.nome, editingProp.id);

      setLastSavedItem({ 
        id: editingProp.id, 
        nome: dadosLimpos.nome, 
        codigo: editingProp.codigoInterno || 'PRO-XXXX' 
      });

      setIsJustifyModalOpen(false);
      fecharModal();
      fetchData();
      setIsTicketModalOpen(true);
    } catch (error) {
      console.error("Erro ao atualizar proprietário:", error);
      alert("Erro ao atualizar registo.");
    } finally {
      setLoading(false);
    }
  };

  const handleEnviarTicket = async (ticketDados) => {
    try {
      if (!lastSavedItem) {
        alert("Erro: Referência não encontrada.");
        return;
      }

      const ticketLimpo = limparDadosParaFirebase(ticketDados);

      const docRef = await addDoc(collection(db, "tickets"), {
        ...ticketLimpo,
        remetente: userData?.nome || 'Sistema',
        dataCriacao: new Date().toISOString(),
        status: 'pendente',
        vinculoId: lastSavedItem.id,
        vinculoNome: lastSavedItem.nome,
        vinculoCodigo: lastSavedItem.codigo || '',
        modulo: 'proprietarios'
      });

      await logAcaoGlobal(
        userData?.nome, 
        "Envio de Ticket", 
        "Workflow", 
        `Para: ${ticketLimpo.atribuidoA} (Ref: ${lastSavedItem.nome})`, 
        docRef.id
      );

      setIsTicketModalOpen(false);
      alert("Tarefa encaminhada com sucesso!");
    } catch (error) { 
      console.error("Erro ao enviar ticket:", error);
      alert("Erro ao enviar ticket."); 
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Eliminar este proprietário permanentemente?")) {
      try {
        await deleteDoc(doc(db, "proprietarios", id));
        await logAcaoGlobal(userData?.nome, "Eliminação", "Proprietários", "ID: "+id, id);
        fetchData();
      } catch (error) {
        console.error("Erro ao eliminar:", error);
        alert("Erro ao eliminar.");
      }
    }
  };

  const handleEditClick = (prop, viewOnly = false) => {
    setEditingProp(prop);
    setIsViewOnly(viewOnly);
    setIsModalOpen(true);
  };

  const fecharModal = () => {
    setIsModalOpen(false);
    setEditingProp(null);
    setIsViewOnly(false);
    setTempDados(null);
  };

  // Cálculos dinâmicos e atómicos para os mini-cards do Dashboard de Proprietários
  const totalCount = proprietarios.length;
  const activeCount = proprietarios.filter(p => p.status === 'Ativo').length;
  const inactiveCount = totalCount - activeCount;

  return (
    <div className="space-y-4">
      
      {/* 
        [ATUALIZADO] PORTAL DINÂMICO DE CABEÇALHO PARA PROPRIETÁRIOS:
        Injeta o título "Proprietários" e o botão "+ Novo Proprietário" diretamente no
        slot dinâmico do Header global do topo, poupando espaço vertical valioso!
      */}
      {mounted && document.getElementById('header-dynamic-slot') && createPortal(
        <div className="flex items-center gap-3 animate-in fade-in duration-200">
          <div className="h-4 w-[1.5px] bg-slate-200 hidden lg:block select-none" /> {/* Separador discreto */}
          <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider hidden sm:block select-none">Proprietários</h2>
          <Button 
            onClick={() => setIsModalOpen(true)}
            className="text-[10px] font-black uppercase py-1 px-2.5 h-8 gap-1 shadow-sm shrink-0"
          >
            <Plus size={12} /> Novo Proprietário
          </Button>
        </div>,
        document.getElementById('header-dynamic-slot')
      )}

      {/* Subtítulo Discreto e compacto no topo da página de conteúdo */}
      <p className="text-slate-500 text-xs font-medium select-none -mt-1 pb-1">
        Gestão de parceiros e frotas de veículos.
      </p>

      {/* [NOVO] DASHBOARD DE KPIs ANALÍTICO E SUPER COMPACTO PARA PROPRIETÁRIOS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 select-none">
        {/* Card 1: Registados */}
        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-2 bg-slate-50 text-slate-400 rounded-lg shrink-0">
            <Building2 size={16} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Registados</p>
            <p className="text-base font-black text-slate-800 leading-tight">{totalCount}</p>
          </div>
        </div>

        {/* Card 2: Ativos */}
        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-2 bg-emerald-50 text-emerald-500 rounded-lg shrink-0">
            <UserCheck size={16} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Ativos</p>
            <p className="text-base font-black text-emerald-600 leading-tight">{activeCount}</p>
          </div>
        </div>

        {/* Card 3: Inativos */}
        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-2 bg-slate-50 text-slate-400 rounded-lg shrink-0">
            <UserCheck size={16} className="opacity-40" />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Inativos</p>
            <p className="text-base font-black text-slate-500 leading-tight">{inactiveCount}</p>
          </div>
        </div>
      </div>

      {loading && proprietarios.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="animate-spin mb-2" size={40} />
          <p className="text-xs sm:text-sm font-semibold">A carregar parceiros...</p>
        </div>
      ) : (
        <div className="w-full overflow-x-auto rounded-2xl border border-slate-100 shadow-sm bg-white">
          <ProprietariosList 
            proprietarios={proprietarios} 
            onEdit={handleEditClick} 
            onDelete={handleDelete} 
          />
        </div>
      )}

      <Modal 
        isOpen={isModalOpen} 
        onClose={fecharModal} 
        title={isViewOnly ? "Consulta de Proprietário" : (editingProp ? "Editar Proprietário" : "Novo Proprietário")}
      >
        <ProprietarioForm 
          onSubmit={handleSave} 
          onCancel={fecharModal} 
          initialData={editingProp || {}} 
          isReadOnly={isViewOnly}
          onCriarMotorista={handleCriarMotorista}
        />
      </Modal>

      <JustificacaoModal 
        isOpen={isJustifyModalOpen}
        onCancel={() => setIsJustifyModalOpen(false)}
        onConfirm={confirmarSalvamentoComLog}
      />

      <TicketModal 
        isOpen={isTicketModalOpen}
        onCancel={() => setIsTicketModalOpen(false)}
        onConfirm={handleEnviarTicket}
        funcionarios={funcionarios}
        contexto={lastSavedItem?.nome}
      />
    </div>
  );
}