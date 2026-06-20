/**
 * App.jsx
 * Localização: src/App.jsx
 *
 * Ponto de entrada da aplicação.
 * Atualizado com:
 * - Vistas internas (ServicosGratuitos, ServicosAvulsos e Cursos) sincronizadas em tempo real com o Firestore.
 * - Filtros do Google Analytics 4 (GA4) para bloquear localhost e excluir visualizações de páginas privadas do ERP.
 * - Preservação estrita de todos os fluxos de autenticação, Firebase e rotas existentes.
 * - [NOVO] Remoção da margem esquerda fixa (lg:ml-64) para integrar com a nova Sidebar Flutuante por Hover.
 */

import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Plus, Search, Loader2 } from 'lucide-react';
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

export default function Motoristas() {
  const { userData } = useAuth();
  const location = useLocation();
  
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
  
  // ESTADO DA PESQUISA
  const [searchTerm, setSearchTerm] = useState('');

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
        batch.update(novoRef, { motoristaId, motoristaNome });
      }
    } else if (novoVeiculoId && nomeMudou) {
      // Se não mudou de veículo, mas mudou o nome do condutor, atualiza no documento do veículo
      const veiculoRef = doc(db, "veiculos", novoVeiculoId);
      batch.update(veiculoRef, { motoristaNome });
    }

    await batch.commit();
  };

  // Recalcula reativamente a cada update do onSnapshot
  const motoristaEmEdicao = motoristas.find(m => m.id === editingId) || null;

  // LÓGICA DE FILTRAGEM
  const motoristasFiltrados = motoristas.filter(m => {
    const campoBusca = searchTerm.toLowerCase();
    return (
      (m.nome || '').toLowerCase().includes(campoBusca) ||
      (m.codigoInterno || '').toLowerCase().includes(campoBusca) ||
      (m.nif || '').toLowerCase().includes(campoBusca) ||
      (m.telemovel || '').toLowerCase().includes(campoBusca)
    );
  });

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

  /**
   * TRAVA DE SEGURANÇA OPERACIONAL:
   * Valida obrigatoriamente a existência de motivo antes de prosseguir com a gravação.
   */
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

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Motoristas</h1>
          <p className="text-slate-500 text-xs sm:text-sm">Gestão de condutores e fluxo de trabalho.</p>
        </div>
        <Button 
          onClick={() => { setEditingId(null); setIsModalOpen(true); }}
          className="w-full sm:w-auto justify-center text-xs sm:text-sm"
        >
          <Plus size={18} /> Novo Motorista
        </Button>
      </header>

      <div className="flex gap-4 bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-slate-100">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Procurar motorista..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-tvde-primary/20 text-xs sm:text-sm"
          />
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
            motoristas={motoristasFiltrados} 
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

// ◄ COMPONENTES DE VISUALIZAÇÃO INTERNOS (SINCRONIZADOS EM TEMPO REAL)
function ServicosGratuitos() {
  const [itensDinamicos, setItensDinamicos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "servicos_assessoria"), where("ativo", "==", true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const filtrados = lista.filter(item => item.isGratuito === true || item.preco === 0);
      setItensDinamicos(filtrados);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-100 max-w-4xl mx-auto animate-in fade-in duration-200">
      <h2 className="text-xl font-bold text-slate-800 mb-2">Serviços Gratuitos</h2>
      <p className="text-slate-500 text-sm mb-6">Explore as ferramentas gratuitas de assessoria regulamentar e suporte para motoristas e parceiros TVDE em Portugal.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-slate-100 p-5 rounded-xl hover:border-blue-500/35 hover:shadow-lg hover:shadow-slate-100 transition-all flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-800 mb-1">Gerador de Dístico TVDE</h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">Crie e descarregue o seu dístico regulamentar em formato PDF de acordo com as regras oficiais do IMT.</p>
          </div>
          <a href="/gerador-distico" className="text-xs font-bold text-tvde-primary hover:underline self-start">Aceder Ferramenta →</a>
        </div>
        
        <div className="border border-slate-100 p-5 rounded-xl hover:border-blue-500/35 hover:shadow-lg hover:shadow-slate-100 transition-all flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-800 mb-1">Guia de Onboarding e Legalização</h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">O guia regulamentar e prático para quem está a iniciar o processo de legalização como motorista TVDE em Portugal.</p>
          </div>
          <a href="/guia-onboarding" className="text-xs font-bold text-tvde-primary hover:underline self-start">Led Guia Digital →</a>
        </div>

        {!loading && itensDinamicos.map(item => (
          <div key={item.id} className="border border-slate-100 p-5 rounded-xl hover:border-blue-500/35 hover:shadow-lg hover:shadow-slate-100 transition-all flex flex-col justify-between relative">
            <div>
              <span className="absolute top-4 right-4 bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded text-[8px] font-black uppercase">
                {item.destinatario === 'proprietario' ? '🏢 Proprietário' : '🙋‍♂️ Motorista'}
              </span>
              <h3 className="font-bold text-sm text-slate-800 mb-1">{item.nome}</h3>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">{item.descricao}</p>
            </div>
            <span className="text-xs font-black text-emerald-600 uppercase">Grátis</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ServicosAvulsos() {
  const [itensDinamicos, setItensDinamicos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "servicos_assessoria"), where("ativo", "==", true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const filtrados = lista.filter(item => item.tipo === 'avulso' && !item.isGratuito && item.preco > 0 && !item.isCurso);
      setItensDinamicos(filtrados);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-100 max-w-4xl mx-auto animate-in fade-in duration-200">
      <h2 className="text-xl font-bold text-slate-800 mb-2">Serviços Avulsos de Assessoria</h2>
      <p className="text-slate-500 text-sm mb-6">Apoio burocrático e administrativo pontual. Selecione e acompanhe os pedidos diretamente com a nossa equipa.</p>
      
      {loading ? (
        <div className="text-center py-6 text-slate-400 text-xs font-semibold">A carregar serviços...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {itensDinamicos.length > 0 ? (
            itensDinamicos.map((item) => (
              <div key={item.id} className="border border-slate-100 p-5 rounded-xl hover:border-blue-500/20 transition-all flex flex-col justify-between">
                <div>
                  <span className="inline-block bg-slate-50 text-slate-500 text-[8px] font-black px-1.5 py-0.5 rounded uppercase mb-2">
                    {item.destinatario === 'proprietario' ? '🏢 Proprietário' : '🙋‍♂️ Motorista'}
                  </span>
                  <h3 className="font-bold text-sm text-slate-800 mb-1.5">{item.nome}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{item.descricao}</p>
                </div>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-50">
                  <span className="text-xs font-black text-tvde-primary">{item.preco}€</span>
                  <button className="text-xs font-bold text-tvde-primary hover:underline">Solicitar Serviço →</button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-6 text-xs text-slate-400 italic">
              Nenhum serviço avulso dinâmico cadastrado de momento.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Cursos() {
  const [itensDinamicos, setItensDinamicos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "servicos_assessoria"), where("ativo", "==", true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const filtrados = lista.filter(item => item.isCurso === true);
      setItensDinamicos(filtrados);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-100 max-w-4xl mx-auto animate-in fade-in duration-200">
      <h2 className="text-xl font-bold text-slate-800 mb-2">Cursos e Formação Obrigatória</h2>
      <p className="text-slate-500 text-sm mb-6">Inscrições e parcerias em cursos certificados pelo IMT para a atividade de TVDE.</p>
      
      {loading ? (
        <div className="text-center py-6 text-slate-400 text-xs font-semibold">A carregar formações...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {itensDinamicos.length > 0 ? (
            itensDinamicos.map((item) => (
              <div key={item.id} className="border border-slate-100 p-5 rounded-xl flex flex-col justify-between">
                <div>
                  <span className="text-[9px] bg-indigo-50 text-indigo-600 font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    {item.destinatario === 'proprietario' ? '🏢 Curso Gestão' : '🎓 Curso Motorista'}
                  </span>
                  <h3 className="font-bold text-sm text-slate-800 mt-2 mb-1">{item.nome}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed mb-4">{item.descricao}</p>
                </div>
                <div className="flex items-center justify-between border-t border-slate-50 pt-3">
                  <span className="text-xs font-black text-slate-800">
                    {item.isCurso || item.preco === 0 ? 'Grátis' : `${item.preco}€`}
                  </span>
                  <button className="text-xs font-bold text-tvde-primary hover:underline">Inscrever Agora →</button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-6 text-xs text-slate-400 italic">
              Nenhum curso dinâmico cadastrado de momento.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * ◄ SEGURANÇA DE ROTAS
 */
const PrivateRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/" />;
};

const AdminRoute = ({ children }) => {
  const { user, userData, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/" />;
  if (userData?.role !== 'admin') return <Navigate to="/dashboard" />;
  return children;
};

function AppContent() {
  const { user } = useAuth();
  const location = useLocation();

  // Controlo de estado para gaveta de navegação mobile
  const [sidebarAberta, setSidebarAberta] = useState(false);

  useEffect(() => {
    if (GA_MEASUREMENT_ID && !isLocalhost) {
      const rotasPublicas = [
        '/',
        '/login',
        '/guia-onboarding',
        '/gerador-distico',
        '/blog'
      ];
      
      const isPublicPath = rotasPublicas.some(path => 
        location.pathname === path || 
        location.pathname.startsWith('/blog/') || 
        location.pathname.startsWith('/onboarding/')
      );

      if (isPublicPath) {
        ReactGA.send({ hitType: "pageview", page: location.pathname });
      }
    }
    
    setSidebarAberta(false);
  }, [location]);

  const isPublicPath = 
    location.pathname === '/' || 
    location.pathname === '/login' || 
    location.pathname === '/guia-onboarding' ||
    location.pathname === '/gerador-distico' ||
    location.pathname === '/migracao' || 
    location.pathname.startsWith('/blog') ||
    location.pathname.startsWith('/onboarding');

  const mostrarLayoutERP = user && !isPublicPath;

  return (
    <div className="flex min-h-screen bg-tvde-bg overflow-x-hidden">
      {/* Sidebar recebe os controlos de visualização mobile e hover no Desktop */}
      {mostrarLayoutERP && (
        <Sidebar aberta={sidebarAberta} setAberta={setSidebarAberta} />
      )}
      
      {/* 
        [ATUALIZADO] A classe "lg:ml-64" foi totalmente removida!
        Como a Sidebar agora é flutuante, o ERP expande-se dinamicamente por todo o ecrã.
      */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Header recebe o gatilho para abrir a Sidebar no telemóvel */}
        {mostrarLayoutERP && (
          <Header setSidebarAberta={setSidebarAberta} />
        )}
        
        {/* Padding fluido (p-4 no telemóvel, p-8 no computador) */}
        <main className={mostrarLayoutERP ? "p-4 sm:p-8 pt-4" : ""}>
          <Routes>
            {/* ROTAS PÚBLICAS */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
            <Route path="/onboarding/:driverId" element={<OnboardingMotorista />} />
            <Route path="/guia-onboarding" element={<EGuiaPage />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<Blog />} />
            <Route path="/gerador-distico" element={<GeradorDistico />} />
            
            {/* ROTA TEMPORÁRIA DE MIGRAÇÃO */}
            <Route path="/migracao" element={<MigracaoFirestore />} />

            {/* ROTAS PROTEGIDAS — ERP */}
            <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/motoristas" element={<PrivateRoute><Motoristas /></PrivateRoute>} />
            <Route path="/leads" element={<PrivateRoute><GestaoLeads /></PrivateRoute>} />
            
            {/* Nova Rota de Gestão de Clientes em Assessoria */}
            <Route path="/assessorados" element={<PrivateRoute><Assessorados /></PrivateRoute>} />
            
            {/* Novos caminhos de Serviços dentro do ecossistema ERP (Sincronizados) */}
            <Route path="/servicos-gratuitos" element={<PrivateRoute><ServicosGratuitos /></PrivateRoute>} />
            <Route path="/servicos-avulsos" element={<PrivateRoute><ServicosAvulsos /></PrivateRoute>} />
            <Route path="/cursos" element={<PrivateRoute><Cursos /></PrivateRoute>} />

            <Route path="/veiculos" element={<PrivateRoute><Veiculos /></PrivateRoute>} />
            <Route path="/proprietarios" element={<PrivateRoute><Proprietarios /></PrivateRoute>} />
            <Route path="/tarefas" element={<PrivateRoute><MinhasTarefas /></PrivateRoute>} />
            <Route path="/cartoes/abastecimento" element={<PrivateRoute><CartoesGestao tipo="combustivel" /></PrivateRoute>} />
            <Route path="/cartoes/carregamento" element={<PrivateRoute><CartoesGestao tipo="eletrico" /></PrivateRoute>} />
            <Route path="/config" element={<PrivateRoute><Configuracoes /></PrivateRoute>} />

            {/* ROTAS RESTRITAS AO DIRETOR */}
            <Route path="/centro-comando" element={<AdminRoute><CentroComando /></AdminRoute>} />
            <Route path="/fecho-semanal" element={<AdminRoute><FechoSemanal /></AdminRoute>} />
            <Route path="/utilizadores" element={<AdminRoute><GestaoUtilizadores /></AdminRoute>} />
            
            {/* Nova Rota de Configuração de Planos (Exclusivo Diretor) */}
            <Route path="/config/servicos" element={<AdminRoute><ServicosConfig /></AdminRoute>} />
            
            <Route path="/logs" element={<AdminRoute><LogsSistema /></AdminRoute>} />

            <Route path="*" element={<Navigate to={user ? "/dashboard" : "/"} />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;