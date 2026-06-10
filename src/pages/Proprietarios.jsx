import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Search, Loader2 } from 'lucide-react';
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

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Proprietários</h1>
          <p className="text-slate-500 text-sm">Gestão de parceiros e fluxo de trabalho.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus size={20} /> Novo Proprietário
        </Button>
      </header>

      <div className="flex gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Procurar por nome ou NIF..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-tvde-primary/20"
          />
        </div>
      </div>

      {loading && proprietarios.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="animate-spin mb-2" size={40} />
          <p>A carregar parceiros...</p>
        </div>
      ) : (
        <ProprietariosList 
          proprietarios={proprietarios} 
          onEdit={handleEditClick} 
          onDelete={handleDelete} 
        />
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