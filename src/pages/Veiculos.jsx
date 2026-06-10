import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Search, Loader2 } from 'lucide-react';
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
import { 
  collection, addDoc, getDocs, query, 
  doc, deleteDoc, updateDoc, arrayUnion 
} from 'firebase/firestore';

export default function Veiculos() {
  const { userData } = useAuth();
  const location = useLocation();
  
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

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Veículos</h1>
          <p className="text-slate-500 text-sm">Gestão da frota, condutores e tarefas.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus size={20} /> Novo Veículo
        </Button>
      </header>

      <div className="flex gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Procurar veículo por matrícula ou marca..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-tvde-primary/20"
          />
        </div>
      </div>

      {loading && veiculos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="animate-spin mb-2" size={40} />
          <p>A carregar frota...</p>
        </div>
      ) : (
        <VeiculosList 
          veiculos={veiculos} 
          cartoes={cartoes}
          onEdit={handleEditClick}
          onDelete={handleDelete} 
        />
      )}

      <Modal isOpen={isModalOpen} onClose={fecharModal} title={isViewOnly ? "Ficha do Veículo" : (editingVeiculo ? "Editar Veículo" : "Novo Veículo")}>
        <VeiculoForm 
          onSubmit={handleSave} 
          onCancel={fecharModal} 
          initialData={editingVeiculo || {}} 
          motoristas={motoristas}
          proprietarios={proprietarios}
          cartoes={cartoes}
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