/**
 * CartoesGestao.jsx
 * Localização: src/pages/CartoesGestao.jsx
 *
 * Ecrã de gestão unificada de cartões de abastecimento (Combustível) e carregamento (Elétrico).
 * [ATUALIZADO]: Removido o botão e toda a lógica de sementeira em lote de teste para garantir a integridade dos dados de produção.
 */

import React, { useState, useEffect } from 'react';
import { Plus, ShieldCheck, Trash2, Edit } from 'lucide-react';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import JustificacaoModal from '../components/ui/JustificacaoModal';
import TicketModal from '../components/ui/TicketModal';
import CartaoForm from '../features/cartoes/CartaoForm';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { logAcaoGlobal } from '../utils/logger';
import { 
  collection, getDocs, query, where, 
  doc, deleteDoc, updateDoc, arrayUnion, setDoc, writeBatch 
} from 'firebase/firestore';

/**
 * Função Auxiliar: Formata o nome em Title Case para exibição 
 * uniforme na tabela de cartões.
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

export default function CartoesGestao({ tipo }) {
  const { userData } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isJustifyModalOpen, setIsJustifyModalOpen] = useState(false);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  
  const [cartoes, setCartoes] = useState([]);
  const [motoristas, setMotoristas] = useState([]); 
  const [funcionarios, setFuncionarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingCartao, setEditingCartao] = useState(null);
  const [tempDados, setTempDados] = useState(null);
  const [lastSavedItem, setLastSavedItem] = useState(null);

  // 'tipo' vem da prop da rota: "combustivel" ou "eletrico"

  const fetchData = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "cartoes"), where("tipo", "==", tipo));
      const [snapC, snapM, snapU] = await Promise.all([
        getDocs(q),
        getDocs(collection(db, "motoristas")), 
        getDocs(collection(db, "usuarios"))
      ]);

      setCartoes(snapC.docs.map(d => ({ id: d.id, ...d.data() })));
      setMotoristas(snapM.docs.map(d => ({ id: d.id, ...d.data() })));
      setFuncionarios(snapU.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error("Erro ao carregar cartões:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [tipo]);

  // Sincroniza as relações no motorista quando edita um cartão
  const syncMotoristaParaCartao = async (cardId, cardNumero, cardTipo, novosDados, antigosDados = null) => {
    const batch = writeBatch(db);

    const antigoMotoristaId = antigosDados?.motoristaId || '';
    const novoMotoristaId = novosDados.motoristaId || '';

    const campoCardId = cardTipo === 'combustivel' ? 'cartaoAbastecimentoId' : 'cartaoCarregamentoId';
    const campoCardNumero = cardTipo === 'combustivel' ? 'cartaoAbastecimentoNumero' : 'cartaoCarregamentoNumero';

    if (antigoMotoristaId !== novoMotoristaId) {
      if (antigoMotoristaId) {
        const antigoRef = doc(db, "motoristas", antigoMotoristaId);
        batch.update(antigoRef, { [campoCardId]: "", [campoCardNumero]: "" });
      }
      if (novoMotoristaId) {
        const novoRef = doc(db, "motoristas", novoMotoristaId);
        batch.update(novoRef, { [campoCardId]: cardId, [campoCardNumero]: cardNumero });
      }
    }

    await batch.commit();
  };

  const handleSave = async (dados) => {
    if (editingCartao) {
      setTempDados(dados);
      setIsJustifyModalOpen(true);
    } else {
      try {
        const cardId = (dados.numeroCartao || dados.numero || '').trim();
        if (!cardId) {
          alert("O número do cartão é obrigatório.");
          return;
        }

        const docRef = doc(db, "cartoes", cardId);
        
        const duplicado = cartoes.some(c => c.id.toLowerCase() === cardId.toLowerCase());
        if (duplicado) {
          alert(`O cartão "${cardId}" já se encontra registado.`);
          return;
        }

        const payload = { 
          ...dados, 
          numero: cardId,             
          numeroCartao: cardId,       
          tipo: tipo,
          historico: [],
          dataCriacao: new Date().toISOString(),
          criadoPor: userData?.nome
        };

        await setDoc(docRef, payload);

        await syncMotoristaParaCartao(cardId, cardId, tipo, dados);

        await logAcaoGlobal(userData?.nome, "Criação", "Cartões", `${dados.fornecedor} (${cardId})`, cardId);
        
        setLastSavedItem({ id: cardId, nome: `${dados.fornecedor} - ${cardId}`, codigo: 'CARD' });
        setIsModalOpen(false);
        fetchData();
        setIsTicketModalOpen(true);
      } catch (error) {
        console.error("Erro ao salvar cartão:", error);
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

      const cardId = (tempDados.numeroCartao || tempDados.numero || editingCartao.id).trim();

      await updateDoc(docRef, {
        ...tempDados,
        numero: cardId,
        numeroCartao: cardId,
        tipo: tipo,
        historico: arrayUnion(novoLog)
      });

      await syncMotoristaParaCartao(cardId, cardId, tipo, tempDados, editingCartao);

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
        
        <div className="flex gap-3">
          <Button onClick={() => { setEditingCartao(null); setIsModalOpen(true); }}>
            <Plus size={20} /> Novo Cartão
          </Button>
        </div>
      </header>

      {/* Visualização em Linhas (Tabela) */}
      {cartoes.length > 0 && !loading && (
        <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                <tr>
                  <th className="py-4 px-6">Identificador / Número</th>
                  <th className="py-4 px-6">Fornecedor</th>
                  <th className="py-4 px-6">PIN</th>
                  <th className="py-4 px-6">Plafond Semanal</th>
                  <th className="py-4 px-6">Motorista Associado</th>
                  <th className="py-4 px-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700 font-medium">
                {cartoes.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-all group">
                    <td className="py-4 px-6 font-mono font-bold text-slate-900">
                      {c.numeroCartao || c.numero}
                    </td>

                    <td className="py-4 px-6">
                      <span className="text-xs font-black text-tvde-primary uppercase tracking-widest">
                        {c.fornecedor}
                      </span>
                    </td>

                    <td className="py-4 px-6">
                      <div className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-3 py-1 rounded-xl">
                        <ShieldCheck size={14} className="text-slate-400" />
                        <span className="font-bold text-slate-700 tracking-wider font-mono">
                          {c.pin || '----'}
                        </span>
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <span className="font-bold text-tvde-accent">
                        {c.plafond} €
                      </span>
                    </td>

                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                        c.motoristaNome 
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-100' 
                          : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${c.motoristaNome ? 'bg-indigo-600' : 'bg-emerald-600'}`} />
                        {c.motoristaNome ? formatTitleCase(c.motoristaNome) : 'Em Stock'}
                      </span>
                    </td>

                    <td className="py-4 px-6 text-right">
                      <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-all">
                        <button 
                          onClick={() => { setEditingCartao(c); setIsModalOpen(true); }} 
                          className="p-2 text-slate-400 hover:text-tvde-primary hover:bg-slate-100 rounded-xl transition"
                          title="Editar Cartão"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(c.id)} 
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition"
                          title="Eliminar Cartão"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {cartoes.length === 0 && !loading && (
        <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
          <p className="text-slate-400 font-medium">Nenhum cartão registado.</p>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingCartao ? "Editar Cartão" : "Novo Cartão"}>
        <CartaoForm motoristas={motoristas} onSubmit={handleSave} initialData={editingCartao || {}} onCancel={() => setIsModalOpen(false)} />
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