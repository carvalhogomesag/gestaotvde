/**
 * Motoristas.jsx
 * Localização: src/pages/Motoristas.jsx
 *
 * Página de gestão de Motoristas do ERP.
 * Atualizado com:
 * - Filtros integrados, mini-dashboard analítico (KPIs) compacto.
 * - Sincronização bidirecional em tempo real do Firestore.
 * - [NOVO] Injeção de Título e Botão "Novo Motorista" via React Portal diretamente no Header.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom'; // Importado para suporte a Portais dinâmicos no Header
import { useLocation } from 'react-router-dom';
import { Plus, Search, Loader2, Users, UserCheck, AlertCircle } from 'lucide-react';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import JustificacaoModal from '../components/ui/JustificacaoModal';
import TicketModal from '../components/ui/TicketModal';
import MotoristasList from '../features/motoristas/MotoristasList';
import MotoristaForm from '../features/motoristas/MotoristaForm';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { generateNextCode } from '../utils/idGenerator';
import { logAcaoGlobal } from '../utils/logger';
import { 
  collection, addDoc, getDocs, query, 
  doc, deleteDoc, updateDoc, arrayUnion, onSnapshot, writeBatch 
} from 'firebase/firestore';

/**
 * Função Auxiliar: Formata o nome em Title Case para exibição 
 * uniforme no título do Modal de Edição.
 */
const formatTitleCase = (str) => {
  if (!str) return '';
  const preposicoes = ['de', 'da', 'do', 'das', 'dos', 'e', 'em'];
  return str
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word, index) => {
      if (preposicoes.includes(word) && index !== 0) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
};

/**
 * Função Auxiliar didática para calcular motoristas pendentes de documentação
 */
const isProfileIncomplete = (m) => {
  const camposObrigatorios = [
    'email', 'telemovel', 'nif', 'iban', 'numID', 'numTVDE',
    'docIDFront', 'docIDBack', 'docCartaFront', 'docCartaBack', 'docCertificadoTVDE', 'docRegistoCriminal'
  ];
  return camposObrigatorios.some(campo => !m[campo] || m[campo] === '');
};

export default function Motoristas() {
  const { userData } = useAuth();
  const location = useLocation();
  
  // Estado didático de montagem para garantir integridade do Portal React
  const [mounted, setMounted] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isJustifyModalOpen, setIsJustifyModalOpen] = useState(false);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  
  const [motoristas, setMotoristas] = useState([]);
  const [veiculos, setVeiculos] = useState([]);
  const [cartoes, setCartoes] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [tempDados, setTempDados] = useState(null);
  const [lastSavedItem, setLastSavedItem] = useState(null);

  // Ativa a montagem segura do portal no mount inicial do componente
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // useCallback para evitar que handleEditClick seja recriada
  const handleEditClick = useCallback((motorista, viewOnly = false) => {
    setEditingId(motorista.id);
    setIsViewOnly(viewOnly);
    setIsModalOpen(true);
  }, []);

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

  useEffect(() => {
    const qM = query(collection(db, "motoristas"));
    const unsubscribe = onSnapshot(qM, (snapshot) => {
      const lista = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setMotoristas(lista);
      setLoading(false);

      // Deep linking via URL ?id=
      const params = new URLSearchParams(location.search);
      const targetId = params.get('id');
      if (targetId && !editingId) {
        const motoristaTarget = lista.find(m => m.id === targetId);
        if (motoristaTarget) handleEditClick(motoristaTarget, false);
      }
    });

    // Subscrever lista de veículos para atribuição
    const unsubscribeVeiculos = onSnapshot(query(collection(db, "veiculos")), (snapshot) => {
      setVeiculos(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Subscrever lista de cartões para atribuição
    const unsubscribeCartoes = onSnapshot(query(collection(db, "cartoes")), (snapshot) => {
      setCartoes(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    getDocs(query(collection(db, "usuarios"))).then(snapU => {
      setFuncionarios(snapU.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubscribe();
      unsubscribeVeiculos();
      unsubscribeCartoes();
    };
  }, [location.search, editingId, handleEditClick]);

  /**
   * ATUALIZAÇÃO BIDIRECIONAL (BATCH)
   * Garante que quando um motorista recebe um veículo ou cartão, 
   * a base de dados vai ao respetivo veículo/cartão e escreve que agora pertence a este motorista.
   */
  const syncRelacoesMotorista = async (motoristaId, motoristaNome, novosDados, antigosDados = null) => {
    const batch = writeBatch(db);
    const nomeMudou = antigosDados && antigosDados.nome !== motoristaNome;

    // 1. Sincronização do Cartão de Abastecimento
    const antigoAbastId = antigosDados?.cartaoAbastecimentoId || '';
    const novoAbastId = novosDados.cartaoAbastecimentoId || '';

    if (antigoAbastId !== novoAbastId) {
      if (antigoAbastId) {
        const antigoRef = doc(db, "cartoes", antigoAbastId);
        batch.update(antigoRef, { motoristaId: "", motoristaNome: "" });
      }
      if (novoAbastId) {
        const novoRef = doc(db, "cartoes", novoAbastId);
        batch.update(novoRef, { motoristaId, motoristaNome });
      }
    } else if (novoAbastId && nomeMudou) {
      const cartaoRef = doc(db, "cartoes", novoAbastId);
      batch.update(cartaoRef, { motoristaNome });
    }

    // 2. Sincronização do Cartão de Carregamento
    const antigoCarregId = antigosDados?.cartaoCarregamentoId || '';
    const novoCarregId = novosDados.cartaoCarregamentoId || '';

    if (antigoCarregId !== novoCarregId) {
      if (antigoCarregId) {
        const antigoRef = doc(db, "cartoes", antigoCarregId);
        batch.update(antigoRef, { motoristaId: "", motoristaNome: "" });
      }
      if (novoCarregId) {
        const novoRef = doc(db, "cartoes", novoCarregId);
        batch.update(novoRef, { motoristaId, motoristaNome });
      }
    } else if (novoCarregId && nomeMudou) {
      const cartaoRef = doc(db, "cartoes", novoCarregId);
      batch.update(cartaoRef, { motoristaNome });
    }

    // 3. Sincronização do Veículo
    const antigoVeiculoId = antigosDados?.veiculoId || '';
    const novoVeiculoId = novosDados.veiculoId || '';

    if (antigoVeiculoId !== novoVeiculoId) {
      if (antigoVeiculoId) {
        // Remove a atribuição do veículo antigo
        const antigoRef = doc(db, "veiculos", antigoVeiculoId);
        batch.update(antigoRef, { motoristaId: "", motoristaNome: "" });
      }
      if (novoVeiculoId) {
        // Atribui o veículo novo ao motorista
        const novoRef = doc(db, "veiculos", novoVeiculoId);
        batch.update(novoRef, { motoristaId: "", motoristaNome: "" }); // Limpa o anterior do veículo se houver
        batch.update(novoRef, { motoristaId, motoristaNome });
      }
    } else if (novoVeiculoId && nomeMudou) {
      const veiculoRef = doc(db, "veiculos", novoVeiculoId);
      batch.update(veiculoRef, { motoristaNome });
    }

    await batch.commit();
  };

  // Recalcula reativamente a cada update do onSnapshot
  const motoristaEmEdicao = motoristas.find(m => m.id === editingId) || null;

  const handleCriarProprietario = async (dadosMinimos) => {
    try {
      const codigo = await generateNextCode('proprietarios', 'PRO');
      const docRef = await addDoc(collection(db, 'proprietarios'), {
        nome: dadosMinimos.nome || '',
        nif: dadosMinimos.nif || '',
        iban: dadosMinimos.iban || '',
        telemovel: dadosMinimos.telemovel || '',
        email: dadosMinimos.email || '',
        codigoInterno: codigo,
        status: 'Ativo',
        criadoViaMotorista: true,
        dataCriacao: new Date().toISOString()
      });
      await logAcaoGlobal(userData?.nome, 'Criação Automática', 'Proprietários', dadosMinimos.nome, docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Erro ao criar proprietário em linha:', error);
      return null;
    }
  };

  const handleSaveMotorista = async (dados, enviarLink = false) => {
    if (editingId && !isViewOnly) {
      setTempDados(dados);
      setIsJustifyModalOpen(true);
    } else {
      try {
        setLoading(true);
        const novoCodigo = await generateNextCode("motoristas", "MOT");
        const dadosLimpos = limparDadosParaFirebase(dados);

        const docRef = await addDoc(collection(db, "motoristas"), {
          ...dadosLimpos,
          codigoInterno: novoCodigo,
          criadoPor: userData?.nome || 'Sistema',
          dataCriacao: new Date().toISOString(),
          historico: []
        });

        // Sincronizar bidirecionalmente Veículos e Cartões
        await syncRelacoesMotorista(docRef.id, dados.nome, dados);

        await logAcaoGlobal(userData?.nome, "Criação", "Motoristas", dados.nome, docRef.id);

        setLastSavedItem({ id: docRef.id, nome: dados.nome, codigo: novoCodigo });
        fecharModal();
        
        if (!enviarLink) setIsTicketModalOpen(true);
      } catch (error) {
        console.error("Erro ao criar motorista:", error);
        alert("Erro ao salvar novo registo.");
      } finally {
        setLoading(false);
      }
    }
  };

  const confirmarSalvamentoComLog = async (motivo) => {
    if (!motivo || !motivo.trim()) {
      alert("Operação bloqueada: É estritamente obrigatório indicar uma justificação para guardar as alterações.");
      return;
    }

    try {
      setLoading(true);
      const docRef = doc(db, "motoristas", editingId);
      const dadosLimpos = limparDadosParaFirebase(tempDados);
      
      await updateDoc(docRef, {
        ...dadosLimpos,
        historico: arrayUnion({
          usuario: userData?.nome || 'Utilizador',
          data: new Date().toISOString(), 
          descricao: motivo
        })
      });

      // Sincronizar bidirecionalmente Veículos e Cartões
      await syncRelacoesMotorista(editingId, tempDados.nome, tempDados, motoristaEmEdicao);

      await logAcaoGlobal(userData?.nome, "Edição", "Motoristas", dadosLimpos.nome, editingId);

      setLastSavedItem({ 
        id: editingId, 
        nome: dadosLimpos.nome, 
        codigo: motoristaEmEdicao?.codigoInterno 
      });
      setIsJustifyModalOpen(false);
      fecharModal();
      setIsTicketModalOpen(true);
    } catch (error) {
      console.error("Erro ao atualizar:", error);
      alert("Erro ao atualizar o registo.");
    } finally {
      setLoading(false);
    }
  };

  const handleEnviarTicket = async (ticketDados) => {
    try {
      const ticketLimpo = limparDadosParaFirebase(ticketDados);
      await addDoc(collection(db, "tickets"), {
        ...ticketLimpo,
        remetente: userData?.nome || 'Sistema',
        dataCriacao: new Date().toISOString(),
        status: 'pendente',
        vinculoId: lastSavedItem?.id,
        vinculoNome: lastSavedItem?.nome,
        vinculoCodigo: lastSavedItem?.codigo,
        modulo: 'motoristas'
      });
      await logAcaoGlobal(userData?.nome, "Envio de Ticket", "Workflow", `Para: ${ticketLimpo.atribuidoA} (Ref: ${lastSavedItem?.nome})`, lastSavedItem?.id);
      setIsTicketModalOpen(false);
      alert("Ticket enviado com sucesso!");
    } catch (error) {
      console.error("Erro ao enviar ticket:", error);
      alert("Erro ao encaminhar tarefa.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Tem certeza que deseja eliminar este motorista?")) {
      try {
        await deleteDoc(doc(db, "motoristas", id));
        await logAcaoGlobal(userData?.nome, "Eliminação", "Motoristas", "ID: " + id, id);
      } catch (error) {
        console.error("Erro ao eliminar:", error);
        alert("Não foi possível eliminar o registo.");
      }
    }
  };

  const fecharModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setIsViewOnly(false);
    setTempDados(null);
  };

  // Cálculos dinâmicos e atómicos para os mini-cards analíticos
  const totalCount = motoristas.length;
  const pendingDocsCount = motoristas.filter(isProfileIncomplete).length;
  const activeCount = motoristas.filter(m => m.status === 'Ativo' && !isProfileIncomplete(m)).length;
  const inactiveCount = totalCount - activeCount;

  return (
    <div className="space-y-4">
      
      {/* 
        [ATUALIZADO] PORTAL DINÂMICO DE CABEÇALHO:
        Injeta o título e o botão de ação principal diretamente no cabeçalho global do topo (Header.jsx)
        quando a página de motoristas é montada, poupando imenso espaço vertical!
      */}
      {mounted && document.getElementById('header-dynamic-slot') && createPortal(
        <div className="flex items-center gap-3 animate-in fade-in duration-200">
          <div className="h-4 w-[1.5px] bg-slate-200 hidden lg:block select-none" /> {/* Separador discreto de barra */}
          <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider hidden sm:block select-none">Motoristas</h2>
          <Button 
            onClick={() => { setEditingId(null); setIsModalOpen(true); }}
            className="text-[10px] font-black uppercase py-1 px-2.5 h-8 gap-1 shadow-sm shrink-0"
          >
            <Plus size={12} /> Novo Motorista
          </Button>
        </div>,
        document.getElementById('header-dynamic-slot')
      )}

      {/* Subtítulo Discreto e compacto que fica no topo da página de conteúdo */}
      <p className="text-slate-500 text-xs font-medium select-none -mt-1 pb-1">
        Gestão de condutores e fluxo de trabalho.
      </p>

      {/* DASHBOARD DE KPIs ANALÍTICO E SUPER COMPACTO */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 select-none">
        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-2 bg-slate-50 text-slate-400 rounded-lg shrink-0">
            <Users size={16} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Registados</p>
            <p className="text-base font-black text-slate-800 leading-tight">{totalCount}</p>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-2 bg-emerald-50 text-emerald-500 rounded-lg shrink-0">
            <UserCheck size={16} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Ativos</p>
            <p className="text-base font-black text-emerald-600 leading-tight">{activeCount}</p>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-2 bg-slate-50 text-slate-400 rounded-lg shrink-0">
            <UserCheck size={16} className="opacity-40" />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Inativos</p>
            <p className="text-base font-black text-slate-500 leading-tight">{inactiveCount}</p>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-2 bg-orange-50 text-orange-500 rounded-lg shrink-0">
            <AlertCircle size={16} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Pendente Docs</p>
            <p className="text-base font-black text-orange-600 leading-tight">{pendingDocsCount}</p>
          </div>
        </div>
      </div>

      {loading && motoristas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="animate-spin mb-2" size={40} />
          <p className="text-xs sm:text-sm font-semibold">A carregar motoristas...</p>
        </div>
      ) : (
        <div className="w-full overflow-x-auto rounded-2xl border border-slate-100 shadow-sm bg-white">
          <MotoristasList 
            motoristas={motoristas} 
            onEdit={handleEditClick} 
            onDelete={handleDelete} 
          />
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={fecharModal}
        title={isViewOnly ? "Consulta de Motorista" : (editingId ? `Ficha de ${formatTitleCase(motoristaEmEdicao?.nome)}` : "Novo Motorista")}
      >
        <MotoristaForm 
          onSubmit={handleSaveMotorista} 
          onCancel={fecharModal} 
          initialData={motoristaEmEdicao || {}}
          isReadOnly={isViewOnly} 
          onCriarProprietario={handleCriarProprietario}
          veiculos={veiculos}
          cartoes={cartoes}
          motoristas={motoristas}
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