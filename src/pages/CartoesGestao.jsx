import React, { useState, useEffect } from 'react';
import { Plus, CreditCard, ShieldCheck, Trash2, Eye, Edit, Database } from 'lucide-react';
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

// Lista de cartões de abastecimento (Combustível) identificados na imagem
const CARTOES_COMBUSTIVEL = [
  "0C1062", "OC001", "OC0010", "OC0013", "OC0019", "OC0020", "OC003", "OC004", "OC007", "OC1001",
  "OC1004", "OC1011", "OC1023", "OC1025", "OC1026", "OC1027", "OC1032", "OC1034", "OC1037", "OC1040",
  "OC1042", "OC1047", "OC1053", "OC1056", "OC1064", "OC1065", "OC1066", "OC107", "OC109", "OC122"
];

// Lista de cartões de carregamento (Elétrico) identificados na imagem
const CARTOES_ELETRICOS = [
  "OCE002", "OCE005", "OCE006", "OCE010", "OCE0100", "OCE011", "OCE013", "OCE014", "OCE015", "OCE017",
  "OCE018", "OCE023", "OCE025", "OCE026", "OCE028", "OCE029", "OCE032", "OCE036", "OCE039", "OCE042",
  "OCE043", "OCE045", "OCE046", "OCE047", "OCE049", "OCE052", "OCE056", "OCE059", "OCE061", "OCE065",
  "OCE068", "OCE072", "OCE074", "OCE075", "OCE076", "OCE077", "OCE079", "OCE081", "OCE083", "OCE084",
  "OCE088", "OCE089", "OCE090", "OCE091", "OCE095", "OCE096", "OCE097", "OCE098", "OCE099"
];

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
  const [motoristas, setMotoristas] = useState([]); // Mudança de Veículos para Motoristas [1]
  const [funcionarios, setFuncionarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingCartao, setEditingCartao] = useState(null);
  const [tempDados, setTempDados] = useState(null);
  const [lastSavedItem, setLastSavedItem] = useState(null);
  const [isImporting, setIsImporting] = useState(false);

  // 'tipo' vem da prop da rota: "combustivel" ou "eletrico" (lowercase, sem acento)
  // É usado directamente — sem normalização — para coincidir com o Firestore

  const fetchData = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "cartoes"), where("tipo", "==", tipo));
      const [snapC, snapM, snapU] = await Promise.all([
        getDocs(q),
        getDocs(collection(db, "motoristas")), // Carregar motoristas [1]
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

  // Sincroniza bidirecionalmente as relações no motorista quando edita um cartão [1]
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

  // Executa a sementeira inteligente em lote de acordo com o tipo atual do ecrã
  const handleSementeiraLote = async () => {
    const cardsToSeed = tipo === 'combustivel' ? CARTOES_COMBUSTIVEL : CARTOES_ELETRICOS;
    const fornecedorPadrao = tipo === 'combustivel' ? 'Galp' : 'Prio';
    const tipoLabel = tipo === 'combustivel' ? 'Abastecimento (Combustível)' : 'Carregamento (Elétrico)';

    const confirmacao = window.confirm(
      `Deseja iniciar a sementeira de ${cardsToSeed.length} cartões de ${tipoLabel}?\n\n` +
      `Nota: Cartões que já se encontrem registados não sofrerão alterações.`
    );

    if (!confirmacao) return;

    setIsImporting(true);
    try {
      const batch = writeBatch(db);
      
      // Mapeia identificadores locais existentes na memória para poupar leituras adicionais
      const existentesIDs = cartoes.map(c => c.id.toLowerCase().trim());
      let novosAdicionadosCount = 0;

      cardsToSeed.forEach((nomeCartao) => {
        const nomeLimpo = nomeCartao.trim();
        
        if (!existentesIDs.includes(nomeLimpo.toLowerCase())) {
          // O nome do cartão é usado diretamente como o ID do documento
          const docRef = doc(db, "cartoes", nomeLimpo);
          
          batch.set(docRef, {
            numero: nomeLimpo,               
            numeroCartao: nomeLimpo,         
            fornecedor: fornecedorPadrao,
            tipo: tipo,
            plafond: 100,                    
            pin: "0000",                     
            PIN: "0000",                     
            estado: "Disponível",
            historico: [],
            dataCriacao: new Date().toISOString(),
            criadoPor: "Sistema (Sementeira)"
          });
          novosAdicionadosCount++;
        }
      });

      if (novosAdicionadosCount > 0) {
        await batch.commit();
        await logAcaoGlobal(userData?.nome || "Sistema", "Sementeira", "Cartões", `Sementeira em lote de ${novosAdicionadosCount} cartões de ${tipo}`, "lote");
        alert(`Sementeira concluída! Foram criados ${novosAdicionadosCount} cartões com sucesso.`);
        fetchData();
      } else {
        alert("Sementeira ignorada. Todos os cartões indicados já existem na base de dados.");
      }
    } catch (error) {
      console.error("Erro na sementeira em lote:", error);
      alert("Ocorreu um erro ao registar os cartões em lote.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleSave = async (dados) => {
    if (editingCartao) {
      setTempDados(dados);
      setIsJustifyModalOpen(true);
    } else {
      try {
        // Garantir que usamos o número do cartão (nome) inserido como o ID do documento
        const cardId = (dados.numeroCartao || dados.numero || '').trim();
        if (!cardId) {
          alert("O número do cartão (Nome) é obrigatório.");
          return;
        }

        const docRef = doc(db, "cartoes", cardId);
        
        // Salvaguarda manual: Verificar se já existe documento com este ID
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

        // Sincronizar o motorista novo [1]
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

      // Sincronizar motorista alterado [1]
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
          {/* Botão de Sementeira Contextualizado */}
          <Button onClick={handleSementeiraLote} disabled={isImporting || loading}>
            <Database size={20} className="isImporting ? 'animate-spin' : ''" />
            {isImporting ? 'A Importar...' : 'Sementeira em Lote'}
          </Button>

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
                  {/* Cabeçalho de Motorista */}
                  <th className="py-4 px-6">Motorista Associado</th>
                  <th className="py-4 px-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700 font-medium">
                {cartoes.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-all group">
                    {/* Número do Cartão */}
                    <td className="py-4 px-6 font-mono font-bold text-slate-900">
                      {c.numeroCartao || c.numero}
                    </td>

                    {/* Fornecedor */}
                    <td className="py-4 px-6">
                      <span className="text-xs font-black text-tvde-primary uppercase tracking-widest">
                        {c.fornecedor}
                      </span>
                    </td>

                    {/* Código PIN */}
                    <td className="py-4 px-6">
                      <div className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-3 py-1 rounded-xl">
                        <ShieldCheck size={14} className="text-slate-400" />
                        <span className="font-bold text-slate-700 tracking-wider font-mono">
                          {c.pin || '----'}
                        </span>
                      </div>
                    </td>

                    {/* Plafond Semanal */}
                    <td className="py-4 px-6">
                      <span className="font-bold text-tvde-accent">
                        {c.plafond} €
                      </span>
                    </td>

                    {/* Motorista Associado na listagem de Cartões */}
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

                    {/* Ações */}
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