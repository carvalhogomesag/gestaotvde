/**
 * Veiculos.jsx
 * Localização: src/pages/Veiculos.jsx
 *
 * Página de controlo e monitorização de veículos da frota.
 * Otimizado com:
 * - Filtros rápidos e ordenação integrada.
 * - Sincronização bidirecional dupla robusta (Turno A e Turno B).
 * - Remoção definitiva da sementeira automática de frota em lote.
 * - Injeção de Título e Botão "Novo Veículo" via React Portal diretamente no Header.
 * - Mini-Dashboard analítico super compacto com KPIs da frota em tempo real.
 * - [ATUALIZADO] Leitura em tempo real do limite de idade parametrizado no Firebase.
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom'; // Importado para suporte a Portais dinâmicos no Header
import { useLocation } from 'react-router-dom';
// Adicionados os ícones para os mini-cards do Dashboard
import { Plus, Search, Loader2, Car, CheckCircle2, AlertCircle, Play, Pause } from 'lucide-react';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import JustificacaoModal from '../components/ui/JustificacaoModal';
import TicketModal from '../components/ui/TicketModal';
import VeiculosList from '../features/veiculos/VeiculosList';
import VeiculoForm from '../features/veiculos/VeiculoForm';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { generateNextCode } from '../utils/idGenerator';
import { logAcaoGlobal } from '../utils/logger';
import { alternarEstadoAnuncioViatura } from '../services/veiculoService';
import { 
  collection, addDoc, getDocs, query, 
  doc, deleteDoc, updateDoc, arrayUnion, writeBatch, onSnapshot 
} from 'firebase/firestore';

/**
 * Função Auxiliar didática para calcular viaturas com dados em falta no Dashboard
 */
const isVehicleIncomplete = (v) => {
  const camposEssenciais = ['marca', 'modelo', 'docSeguro', 'docIPO'];
  const regime = v.tipoAluguer || 'integral';
  
  const temMotoristaDiurno = !!v.motoristaId;
  const temAlgumMotorista = v.motoristaId || v.motoristaId2;
  
  const regimeValido = regime === 'turnos' ? temAlgumMotorista : temMotoristaDiurno;
  
  return camposEssenciais.some(campo => !v[campo] || v[campo] === '') || !regimeValido;
};

export default function Veiculos() {
  const { userData } = useAuth();
  const location = useLocation();
  
  // Estado didático de montagem para garantir integridade do Portal React
  const [mounted, setMounted] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isJustifyModalOpen, setIsJustifyModalOpen] = useState(false);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  
  const [veiculos, setVeiculos] = useState([]);
  const [motoristas, setMotoristas] = useState([]);
  const [proprietarios, setProprietarios] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [cartoes, setCartoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingVeiculo, setEditingVeiculo] = useState(null);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [tempDados, setTempDados] = useState(null);
  const [lastSavedItem, setLastSavedItem] = useState(null);
  const [limiteAnosTVDE, setLimiteAnosTVDE] = useState(7); // [NOVO] Estado para limite legal parametrizado (padrão: 7)

  // Ativa a montagem segura do portal no mount inicial do componente
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  /**
   * [NOVO] Sincronização em tempo real do limite legal parametrizado no Firestore
   */
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "configuracoes", "veiculos"), (docSnap) => {
      if (docSnap.exists()) {
        setLimiteAnosTVDE(docSnap.data().limiteAnosTVDE || 7);
      }
    });
    return () => unsubscribe();
  }, []);

  /**
   * FUNÇÃO DE LIMPEZA: Impede erros de "undefined" no Firestore.
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
   * CALLBACK: Criar Proprietário Inline
   */
  const handleCriarProprietarioInline = async (dadosMinimos) => {
    try {
      const codigo = await generateNextCode('proprietarios', 'PRO');
      const docRef = await addDoc(collection(db, 'proprietarios'), {
        nome: dadosMinimos.nome || '',
        nif: dadosMinimos.nif || '',
        telemovel: dadosMinimos.telemovel || '',
        codigoInterno: codigo,
        status: 'Ativo',
        criadoViaVeiculo: true,
        dataCriacao: new Date().toISOString()
      });
      await logAcaoGlobal(userData?.nome, 'Criação Automática', 'Proprietários', dadosMinimos.nome, docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Erro ao criar proprietário inline:', error);
      return null;
    }
  };

  /**
   * CALLBACK: Criar Motorista Inline
   */
  const handleCriarMotoristaInline = async (dadosMinimos) => {
    try {
      const codigo = await generateNextCode('motoristas', 'MOT');
      const docRef = await addDoc(collection(db, 'motoristas'), {
        nome: dadosMinimos.nome || '',
        nif: dadosMinimos.nif || '',
        telemovel: dadosMinimos.telemovel || '',
        codigoInterno: codigo,
        status: 'Ativo',
        criadoViaVeiculo: true,
        dataCriacao: new Date().toISOString()
      });
      await logAcaoGlobal(userData?.nome, 'Criação Automática', 'Motoristas', dadosMinimos.nome, docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Erro ao criar motorista inline:', error);
      return null;
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [snapV, snapM, snapP, snapC, snapU] = await Promise.all([
        getDocs(query(collection(db, "veiculos"))),
        getDocs(query(collection(db, "motoristas"))),
        getDocs(query(collection(db, "proprietarios"))),
        getDocs(query(collection(db, "cartoes"))),
        getDocs(query(collection(db, "usuarios")))
      ]);

      const listaVeiculos = snapV.docs.map(d => ({ id: d.id, ...d.data() }));
      setVeiculos(listaVeiculos);
      setMotoristas(snapM.docs.map(d => ({ id: d.id, ...d.data() })));
      setProprietarios(snapP.docs.map(d => ({ id: d.id, ...d.data() })));
      setCartoes(snapC.docs.map(d => ({ id: d.id, ...d.data() })));
      setFuncionarios(snapU.docs.map(d => ({ id: d.id, ...d.data() })));

      const params = new URLSearchParams(location.search);
      const targetId = params.get('id');
      if (targetId) {
        const veiculoTarget = listaVeiculos.find(v => v.id === targetId);
        if (veiculoTarget) {
          handleEditClick(veiculoTarget, false);
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

  /**
   * SINCRONIZAÇÃO REVERSA BIDIRECIONAL DUPLA (TURNO DIA E NOITE)
   * Sincroniza a associação do carro nos documentos do condutor diurno e noturno.
   */
  const syncMotoristaParaVeiculo = async (veiculoId, novosDados, antigosDados = null) => {
    const batch = writeBatch(db);

    const antigoMotoristaId = antigosDados?.motoristaId || '';
    const novoMotoristaId = novosDados.motoristaId || '';
    
    const antigoMotoristaId2 = antigosDados?.motoristaId2 || '';
    const novoMotoristaId2 = novosDados.motoristaId2 || '';

    const matricula = novosDados.matricula || '';
    const marca = novosDados.marca || '';
    const modelo = novosDados.modelo || '';

    const dadosMudaram = antigosDados && (
      antigosDados.matricula !== matricula ||
      antigosDados.marca !== matricula || // Mantido por salvaguarda
      antigosDados.modelo !== modelo
    );

    // 1. Sincronização do Motorista do Turno A (Diurno)
    if (antigoMotoristaId !== novoMotoristaId) {
      if (antigoMotoristaId) {
        const antigoRef = doc(db, "motoristas", antigoMotoristaId);
        batch.update(antigoRef, {
          veiculoId: "",
          veiculoMatricula: "",
          veiculoMarca: "",
          veiculoModelo: ""
        });
      }
      if (novoMotoristaId) {
        const novoRef = doc(db, "motoristas", novoMotoristaId);
        batch.update(novoRef, {
          veiculoId: veiculoId,
          veiculoMatricula: matricula,
          veiculoMarca: marca,
          veiculoModelo: modelo
        });
      }
    } else if (novoMotoristaId && dadosMudaram) {
      const motoristaRef = doc(db, "motoristas", novoMotoristaId);
      batch.update(motoristaRef, {
        veiculoMatricula: matricula,
        veiculoMarca: marca,
        veiculoModelo: modelo
      });
    }

    // 2. Sincronização do Motorista do Turno B (Noturno)
    if (antigoMotoristaId2 !== novoMotoristaId2) {
      if (antigoMotoristaId2) {
        const antigoRef2 = doc(db, "motoristas", antigoMotoristaId2);
        batch.update(antigoRef2, {
          veiculoId: "",
          veiculoMatricula: "",
          veiculoMarca: "",
          veiculoModelo: ""
        });
      }
      if (novoMotoristaId2) {
        const novoRef2 = doc(db, "motoristas", novoMotoristaId2);
        batch.update(novoRef2, {
          veiculoId: veiculoId,
          veiculoMatricula: matricula,
          veiculoMarca: marca,
          veiculoModelo: modelo
        });
      }
    } else if (novoMotoristaId2 && dadosMudaram) {
      const motoristaRef2 = doc(db, "motoristas", novoMotoristaId2);
      batch.update(motoristaRef2, {
        veiculoMatricula: matricula,
        veiculoMarca: marca,
        veiculoModelo: modelo
      });
    }

    await batch.commit();
  };

  const handleSave = async (dados) => {
    if (editingVeiculo && !isViewOnly) {
      setTempDados(dados);
      setIsJustifyModalOpen(true);
    } else {
      try {
        setLoading(true);
        const novoCodigo = await generateNextCode("veiculos", "VEI");
        const dadosLimpos = limparDadosParaFirebase(dados);
        
        const docRef = await addDoc(collection(db, "veiculos"), {
          ...dadosLimpos,
          codigoInterno: novoCodigo,
          criadoPor: userData?.nome || 'Sistema',
          dataCriacao: new Date().toISOString(),
          historico: []
        });

        // Sincronizar o motorista ao criar um veículo
        await syncMotoristaParaVeiculo(docRef.id, dadosLimpos);

        await logAcaoGlobal(userData?.nome, "Criação", "Veículos", dadosLimpos.matricula, docRef.id);

        setLastSavedItem({ id: docRef.id, nome: dadosLimpos.matricula, codigo: novoCodigo });
        fecharModal();
        fetchData();
        setIsTicketModalOpen(true);
      } catch (error) { 
        console.error("Erro ao criar veículo:", error);
        alert("Erro ao salvar novo veículo."); 
      } finally {
        setLoading(false);
      }
    }
  };

  // Handler transacional para ativar/pausar o anúncio público no catálogo
  const handleToggleAnuncio = async (veiculoId, novoEstado, matricula) => {
    try {
      setLoading(true);
      const alteradoPor = userData?.nome || 'Utilizador';
      const resultado = await alternarEstadoAnuncioViatura(
        db, 
        veiculoId, 
        novoEstado, 
        matricula, 
        alteradoPor
      );

      if (resultado.sucesso) {
        alert(resultado.msg);
        fetchData(); 
      } else {
        alert(resultado.msg);
      }
    } catch (err) {
      console.error("Erro ao alternar anúncio da viatura:", err);
      alert("Não foi possível atualizar o estado do anúncio.");
    } finally {
      setLoading(false);
    }
  };

  const confirmarSalvamentoComLog = async (motivo) => {
    try {
      setLoading(true);
      const docRef = doc(db, "veiculos", editingVeiculo.id);
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

      // Sincronizar motoristas ao salvar as alterações do veículo (Turno A e B)
      await syncMotoristaParaVeiculo(editingVeiculo.id, dadosLimpos, editingVeiculo);

      await logAcaoGlobal(userData?.nome, "Edição", "Veículos", dadosLimpos.matricula, editingVeiculo.id);

      setLastSavedItem({ 
        id: editingVeiculo.id, 
        nome: dadosLimpos.matricula, 
        codigo: editingVeiculo.codigoInterno || 'VEI-XXXX' 
      });

      setIsJustifyModalOpen(false);
      fecharModal();
      fetchData();
      setIsTicketModalOpen(true);
    } catch (error) {
      console.error("Erro ao atualizar veículo:", error);
      alert("Erro ao atualizar veículo.");
    } finally {
      setLoading(false);
    }
  };

  const handleEnviarTicket = async (ticketDados) => {
    try {
      if (!lastSavedItem) {
        alert("Erro: Referência do veículo não encontrada.");
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
        modulo: 'veiculos'
      });

      await logAcaoGlobal(
        userData?.nome, 
        "Envio de Ticket", 
        "Workflow", 
        `Para: ${ticketLimpo.atribuidoA} (Veículo: ${lastSavedItem.nome})`, 
        docRef.id
      );

      setIsTicketModalOpen(false);
      alert("Tarefa encaminhada com sucesso!");
    } catch (error) { 
      console.error("Erro ao enviar ticket:", error);
      alert("Erro ao enviar ticket. Verifique a consola."); 
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Eliminar este veículo permanentemente?")) {
      try {
        await deleteDoc(doc(db, "veiculos", id));
        await logAcaoGlobal(userData?.nome, "Eliminação", "Veículos", "ID: "+id, id);
        fetchData();
      } catch (error) {
        console.error("Erro ao eliminar:", error);
        alert("Erro ao eliminar o veículo.");
      }
    }
  };

  const handleEditClick = (veiculo, viewOnly = false) => {
    setEditingVeiculo(veiculo);
    setIsViewOnly(viewOnly);
    setIsModalOpen(true);
  };

  const fecharModal = () => {
    setIsModalOpen(false);
    setEditingVeiculo(null);
    setIsViewOnly(false);
    setTempDados(null);
  };

  // Cálculos dinâmicos e atómicos para os mini-cards analíticos do veículo
  const totalCount = veiculos.length;
  const incompleteCount = veiculos.filter(isVehicleIncomplete).length;
  const completeCount = totalCount - incompleteCount;
  const activeAdsCount = veiculos.filter(v => v.anuncioAtivo === true).length;
  const pausedAdsCount = totalCount - activeAdsCount;

  return (
    <div className="space-y-4">
      
      {/* PORTAL DINÂMICO DE CABEÇALHO PARA VEÍCULOS */}
      {mounted && document.getElementById('header-dynamic-slot') && createPortal(
        <div className="flex items-center gap-3 animate-in fade-in duration-200">
          <div className="h-4 w-[1.5px] bg-slate-200 hidden lg:block select-none" /> {/* Separador discreto */}
          <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider hidden sm:block select-none">Veículos</h2>
          <Button 
            onClick={() => setIsModalOpen(true)}
            className="text-[10px] font-black uppercase py-1 px-2.5 h-8 gap-1 shadow-sm shrink-0"
          >
            <Plus size={12} /> Novo Veículo
          </Button>
        </div>,
        document.getElementById('header-dynamic-slot')
      )}

      {/* Subtítulo Discreto e compacto no topo da página de conteúdo */}
      <p className="text-slate-500 text-xs font-medium select-none -mt-1 pb-1">
        Gestão da frota, condutores e tarefas.
      </p>

      {/* DASHBOARD DE KPIs ANALÍTICO E SUPER COMPACTO PARA VEÍCULOS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 select-none">
        {/* Card 1: Registados */}
        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-2 bg-slate-50 text-slate-400 rounded-lg shrink-0">
            <Car size={16} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Registados</p>
            <p className="text-base font-black text-slate-800 leading-tight">{totalCount}</p>
          </div>
        </div>

        {/* Card 2: Documentos Completos */}
        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-2 bg-emerald-50 text-emerald-500 rounded-lg shrink-0">
            <CheckCircle2 size={16} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Docs Completos</p>
            <p className="text-base font-black text-emerald-600 leading-tight">{completeCount}</p>
          </div>
        </div>

        {/* Card 3: Documentos em Falta */}
        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-2 bg-orange-50 text-orange-500 rounded-lg shrink-0">
            <AlertCircle size={16} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Docs em Falta</p>
            <p className="text-base font-black text-orange-600 leading-tight">{incompleteCount}</p>
          </div>
        </div>

        {/* Card 4: Anúncios Ativos */}
        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-2 bg-blue-50 text-tvde-primary rounded-lg shrink-0">
            <Play size={16} className="fill-current text-tvde-primary" />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Anúncios Ativos</p>
            <p className="text-base font-black text-tvde-primary leading-tight">{activeAdsCount}</p>
          </div>
        </div>

        {/* Card 5: Anúncios Pausados */}
        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-2 bg-slate-50 text-slate-400 rounded-lg shrink-0">
            <Pause size={16} className="fill-current text-slate-400" />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Anúncios Pausados</p>
            <p className="text-base font-black text-slate-500 leading-tight">{pausedAdsCount}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-4 bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-slate-100">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Procurar veículo por matrícula ou marca..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-tvde-primary/20 text-xs sm:text-sm"
          />
        </div>
      </div>

      {loading && veiculos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="animate-spin mb-2" size={40} />
          <p className="text-xs sm:text-sm font-semibold">A carregar frota...</p>
        </div>
      ) : (
        <div className="w-full overflow-x-auto rounded-2xl border border-slate-100 shadow-sm bg-white">
          <VeiculosList 
            veiculos={veiculos} 
            cartoes={cartoes}
            onEdit={handleEditClick}
            onDelete={handleDelete} 
            onToggleAnuncio={handleToggleAnuncio} 
          />
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={fecharModal} title={isViewOnly ? "Ficha do Veículo" : (editingVeiculo ? "Editar Veículo" : "Novo Veículo")}>
        <VeiculoForm 
          onSubmit={handleSave} 
          onCancel={fecharModal} 
          initialData={editingVeiculo || {}} 
          motoristas={motoristas}
          proprietarios={proprietarios}
          cartoes={cartoes}
          veiculos={veiculos}
          limiteAnosTVDE={limiteAnosTVDE} // [NOVO] Limite regulamentar do Firebase
          isReadOnly={isViewOnly}
          onCriarProprietario={handleCriarProprietarioInline}
          onCriarMotorista={handleCriarMotoristaInline}
        />
      </Modal>

      <JustificacaoModal isOpen={isJustifyModalOpen} onCancel={() => setIsJustifyModalOpen(false)} onConfirm={confirmarSalvamentoComLog} />

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