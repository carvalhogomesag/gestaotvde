import React, { useState, useEffect } from 'react';
import { Plus, CreditCard, ShieldCheck, Trash2, Eye, Edit } from 'lucide-react';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import JustificacaoModal from '../components/ui/JustificacaoModal';
import TicketModal from '../components/ui/TicketModal';
import CartaoForm from '../features/cartoes/CartaoForm';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { logAcaoGlobal } from '../utils/logger';
import { 
  collection, addDoc, getDocs, query, where, 
  doc, deleteDoc, updateDoc, arrayUnion 
} from 'firebase/firestore';

export default function CartoesGestao({ tipo }) {
  const { userData } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isJustifyModalOpen, setIsJustifyModalOpen] = useState(false);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  
  const [cartoes, setCartoes] = useState([]);
  const [veiculos, setVeiculos] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingCartao, setEditingCartao] = useState(null);
  const [tempDados, setTempDados] = useState(null);
  const [lastSavedItem, setLastSavedItem] = useState(null);

  // 'tipo' vem da prop da rota: "combustivel" ou "eletrico" (lowercase, sem acento)
  // É usado directamente — sem normalização — para coincidir com o Firestore

  const fetchData = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "cartoes"), where("tipo", "==", tipo));
      const [snapC, snapV, snapU] = await Promise.all([
        getDocs(q),
        getDocs(collection(db, "veiculos")),
        getDocs(collection(db, "usuarios"))
      ]);

      setCartoes(snapC.docs.map(d => ({ id: d.id, ...d.data() })));
      setVeiculos(snapV.docs.map(d => ({ id: d.id, ...d.data() })));
      setFuncionarios(snapU.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error("Erro ao carregar cartões:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [tipo]);

  const handleSave = async (dados) => {
    if (editingCartao) {
      setTempDados(dados);
      setIsJustifyModalOpen(true);
    } else {
      try {
        const docRef = await addDoc(collection(db, "cartoes"), { 
          ...dados, 
          tipo: tipo,
          historico: [],
          dataCriacao: new Date().toISOString(),
          criadoPor: userData?.nome
        });

        await logAcaoGlobal(userData?.nome, "Criação", "Cartões", `${dados.fornecedor} (${dados.numeroCartao})`, docRef.id);
        
        setLastSavedItem({ id: docRef.id, nome: `${dados.fornecedor} - ${dados.numeroCartao}`, codigo: 'CARD' });
        setIsModalOpen(false);
        fetchData();
        setIsTicketModalOpen(true);
      } catch (error) {
        alert("Erro ao salvar cartão.");
      }
    }
  };

  const confirmarSalvamentoComLog = async (motivo) => {
    try {
      const docRef = doc(db, "cartoes", editingCartao.id);
      const novoLog = {
        usuario: userData?.nome,
        data: new Date().toISOString(),
        descricao: motivo
      };

      await updateDoc(docRef, {
        ...tempDados,
        tipo: tipo,
        historico: arrayUnion(novoLog)
      });

      await logAcaoGlobal(userData?.nome, "Edição", "Cartões", tempDados.fornecedor, editingCartao.id);

      setLastSavedItem({ id: editingCartao.id, nome: tempDados.fornecedor, codigo: 'CARD' });
      setIsJustifyModalOpen(false);
      setIsModalOpen(false);
      setEditingCartao(null);
      fetchData();
      setIsTicketModalOpen(true);
    } catch (error) {
      alert("Erro ao atualizar cartão.");
    }
  };

  const handleEnviarTicket = async (ticketDados) => {
    try {
      const docRef = await addDoc(collection(db, "tickets"), {
        ...ticketDados,
        remetente: userData?.nome,
        dataCriacao: new Date().toISOString(),
        status: 'pendente',
        vinculoId: lastSavedItem.id,
        vinculoNome: lastSavedItem.nome,
        modulo: 'cartoes'
      });

      await logAcaoGlobal(userData?.nome, "Envio de Ticket", "Workflow", `Sobre Cartão: ${lastSavedItem.nome}`, docRef.id);
      setIsTicketModalOpen(false);
      alert("Tarefa encaminhada!");
    } catch (error) {
      alert("Erro ao enviar ticket.");
    }
  };

  const handleDelete = async (id) => {
    if(window.confirm("Eliminar este cartão permanentemente?")) {
      await deleteDoc(doc(db, "cartoes", id));
      await logAcaoGlobal(userData?.nome, "Eliminação", "Cartões", "ID: "+id, id);
      fetchData();
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 capitalize">
            Cartões de {tipo === 'combustivel' ? 'Abastecimento' : 'Carregamento'}
          </h1>
          <p className="text-slate-500 text-sm">Gestão de cartões físicos e fluxo de entrega.</p>
        </div>
        <Button onClick={() => { setEditingCartao(null); setIsModalOpen(true); }}>
          <Plus size={20} /> Novo Cartão
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cartoes.map(c => (
          <div key={c.id} className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-20 h-20 bg-slate-50 rounded-bl-full -mr-10 -mt-10"></div>
            
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs font-black text-tvde-primary uppercase tracking-widest">{c.fornecedor}</p>
                <p className="text-lg font-mono font-bold mt-1 text-slate-700">{c.numeroCartao}</p>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                <button onClick={() => { setEditingCartao(c); setIsModalOpen(true); }} className="p-2 bg-slate-100 text-slate-400 hover:text-tvde-primary rounded-xl">
                  <Edit size={16} />
                </button>
                <button onClick={() => handleDelete(c.id)} className="p-2 bg-slate-100 text-slate-400 hover:text-red-500 rounded-xl">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-black uppercase flex items-center gap-1">
                  <ShieldCheck size={14} /> PIN
                </span>
                <span className="font-black text-tvde-dark tracking-widest">{c.pin || '----'}</span>
              </div>

              <div className="flex justify-between text-sm px-1">
                <span className="text-slate-400 font-medium">Plafond Semanal:</span>
                <span className="font-bold text-tvde-accent">{c.plafond} €</span>
              </div>

              <div className="flex justify-between text-sm border-t border-slate-50 pt-3 px-1">
                <span className="text-slate-400 font-medium">Veículo:</span>
                <span className="font-bold text-slate-700">{c.vinculoMatricula || 'Em Stock'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {cartoes.length === 0 && !loading && (
        <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
          <p className="text-slate-400 font-medium">Nenhum cartão registado.</p>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingCartao ? "Editar Cartão" : "Novo Cartão"}>
        <CartaoForm veiculos={veiculos} onSubmit={handleSave} initialData={editingCartao || {}} onCancel={() => setIsModalOpen(false)} />
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