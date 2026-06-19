/**
 * FechoSemanal.jsx
 * Localização: src/pages/FechoSemanal.jsx
 *
 * Processador de fecho financeiro semanal (Upload de CSVs/Excel e Geração de SEPA/PDF).
 * Atualizado com suporte responsivo, SheetJS para XLS/XLSX e correção do erro de referência [2].
 */

import React, { useState, useEffect } from 'react';
import { 
  UploadCloud, FileSpreadsheet, Calculator, 
  CheckCircle2, Download, ArrowRight, Loader2, Banknote, Fuel, Zap, FileText,
  PlusCircle, MinusCircle, Lock
} from 'lucide-react';
import { db } from '../firebase';
import { 
  collection, getDocs, addDoc, query, where, writeBatch, doc 
} from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { logAcaoGlobal } from '../utils/logger';
import { formatCurrency } from '../utils/formatters';
import { 
  processarRelatorioUber, // Importador adaptado
  getConfiguracaoFinanceira,
  getCaucaoAtiva,
  getHistoricoCaucoes,
  getRenegociacaoAtiva,
  getHistoricoRenegociacoes,
  salvarConfiguracaoFinanceira,
  criarCaucao,
  liquidarCaucao,
  quitarParcelaCaucao, 
  criarRenegociacao,
  cancelarRenegociacao
} from '../services/financeiroService';
import { generateNextCode } from '../utils/idGenerator';

// Importação nativa da biblioteca de Excel instalada
import * as XLSX from 'xlsx';

// Separadores
import ContaCorrenteTab from './tabs/ContaCorrenteTab';
import TaxaGestaoTab    from './tabs/TaxaGestaoTab';
import CaucaoTab        from './tabs/CaucaoTab';
import RenegociacaoTab  from './tabs/RenegociacaoTab';

// Definição dos separadores
const ABAS = [
  { id: 'conta',        label: 'Conta Corrente', icon: ArrowLeftRight },
  { id: 'gestao',       label: 'Taxa de Gestão',  icon: Settings2      },
  { id: 'caucao',       label: 'Caução',           icon: Shield         },
  { id: 'renegociacao', label: 'Renegociação',     icon: RefreshCcw     },
];

export default function Motoristas() {
  const { userData } = useAuth();
  const location = useLocation();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isJustifyModalOpen, setIsJustifyModalOpen] = useState(false);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  
  const [motoristas, setMotoristas] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [tempDados, setTempDados] = useState(null);
  const [lastSavedItem, setLastSavedItem] = useState(null);
  
  // ESTADO DA PESQUISA
  const [searchTerm, setSearchTerm] = useState('');

  // ESTADOS DO IMPORTADOR DE MIGRACAO CSV (MODO DEV)
  const [csvInput, setCsvInput] = useState('');
  const [importando, setImportando] = useState(false);
  const [statusImportacao, setStatusImportacao] = useState('');
  const [mostrarImportador, setMostrarImportador] = useState(false);

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

  // Função auxiliar para formatar nomes de "DAVID MENEZES" para "David Menezes"
  const formatarNomeProprio = (texto) => {
    if (!texto) return '';
    return texto
      .toLowerCase()
      .split(' ')
      .map(palavra => palavra.charAt(0).toUpperCase() + palavra.slice(1))
      .join(' ');
  };

  const executarMigracao = async () => {
    if (!csvInput.trim()) {
      alert("Por favor, cole o conteúdo do CSV na caixa de texto.");
      return;
    }

    if (!window.confirm("Deseja iniciar a importação automática destes motoristas para o ambiente de DEV?")) {
      return;
    }

    setImportando(true);
    setStatusImportacao("A iniciar migração...");

    try {
      const linhas = csvInput.split('\n');
      let totalImportados = 0;

      // Importação sequencial para garantir que os códigos internos (MOT001, MOT002...) não duplicam
      for (let i = 0; i < linhas.length; i++) {
        const linha = linhas[i].trim();
        if (!linha) continue;

        const colunas = linha.split(',');
        const uuid = colunas[0]?.trim();
        const nomeProprio = colunas[1]?.trim();
        const apelido = colunas[2]?.trim();

        // 1. Ignorar cabeçalho se houver
        if (uuid === 'UUID do motorista' || uuid.includes('UUID') || i === 0) {
          continue;
        }

        // 2. Ignorar o registo da própria frota operadora (Opinião e Consenso, Lda)
        if (uuid === 'db0fecb2-502f-4418-baa9-aee3934835e4' || nomeProprio?.includes('Opinião')) {
          continue;
        }

        if (uuid && nomeProprio) {
          const nomeFormatado = formatarNomeProprio(`${nomeProprio} ${apelido || ''}`);
          setStatusImportacao(`A processar (${totalImportados + 1}): ${nomeFormatado}...`);

          const novoCodigo = await generateNextCode("motoristas", "MOT");

          await addDoc(collection(db, "motoristas"), {
            nome: nomeFormatado,
            uuid: uuid, // Campo novo adicionado com sucesso
            email: `${nomeProprio.toLowerCase()}.${(apelido || 'tvde').toLowerCase()}@exemplo.com`,
            telemovel: "900000000",
            nif: "999999999",
            status: "Ativo",
            codigoInterno: novoCodigo,
            criadoPor: "Migrador Automático CSV",
            dataCriacao: new Date().toISOString(),
            historico: []
          });

          totalImportados++;
        }
      }

      setStatusImportacao(`Concluído com sucesso! ${totalImportados} motoristas foram importados.`);
      setCsvInput('');
      alert(`Sucesso! ${totalImportados} motoristas foram importados para o sistema.`);
    } catch (err) {
      console.error("Erro durante a migração:", err);
      alert("Ocorreu um erro ao importar os dados. Verifique a consola de programador (F12).");
    } finally {
      setImportando(false);
    }
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

    getDocs(query(collection(db, "usuarios"))).then(snapU => {
      setFuncionarios(snapU.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => unsubscribe();
  }, [location.search, editingId, handleEditClick]);

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

        await logAcaoGlobal(userData?.nome, "Criação", "Motoristas", dados.nome, docRef.id);

        if (enviarLink) {
          const onboardingUrl = `${window.location.origin}/onboarding/${docRef.id}`;
          const mensagem = `Olá ${dados.nome}, utilize este link para carregar os seus documentos: ${onboardingUrl}`;
          window.open(`https://wa.me/351${dados.telemovel}?text=${encodeURIComponent(mensagem)}`, '_blank');
        }

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
      {/* Header empilhável responsivo e botão expandido em mobile */}
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

      {/* Padding otimizado para mobile */}
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
        /* Contentor de segurança de scroll lateral adicionado ao redor da tabela */
        <div className="w-full overflow-x-auto rounded-2xl border border-slate-100 shadow-sm bg-white">
          <MotoristasList 
            motoristas={motoristasFiltrados} 
            onEdit={handleEditClick} 
            onDelete={handleDelete} 
          />
        </div>
      )}

      {/* PAINEL DE MIGRAÇÃO EXCEL/CSV (APENAS ATIVO EM AMBIENTES DE DESENVOLVIMENTO) */}
      {import.meta.env.DEV && (
        <div className="mt-12 p-6 bg-slate-900 text-white rounded-3xl border border-slate-800 text-left animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                <Sparkles className="animate-pulse shrink-0" size={16} />
                Migrador de Ficheiros Excel/CSV (Modo DEV)
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Selecione o seu ficheiro .xlsx, .xls ou .csv diretamente para popular o banco de dados de testes.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setMostrarImportador(!mostrarImportador)}
              className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer text-center"
            >
              {mostrarImportador ? 'Ocultar Painel' : 'Abrir Painel'}
            </button>
          </div>

          {mostrarImportador && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center gap-3">
                <FileSpreadsheet className="text-slate-400 animate-bounce" size={32} />
                <input
                  type="file"
                  accept=".csv, .xls, .xlsx"
                  onChange={lidarComFicheiro}
                  disabled={importando}
                  className="block w-full max-w-xs text-xs text-slate-400 
                    file:mr-4 file:py-2 file:px-4 
                    file:rounded-xl file:border-0 
                    file:text-xs file:font-black 
                    file:bg-emerald-600 file:text-white 
                    hover:file:bg-emerald-500 cursor-pointer"
                />
              </div>
              
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <span className="text-xs text-emerald-400 font-medium min-h-5">
                  {statusImportacao}
                </span>
                {ficheiroDados && (
                  <button
                    type="button"
                    onClick={executarMigracao}
                    disabled={importando}
                    className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
                  >
                    {importando ? 'A Importar...' : 'Iniciar Migração'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={fecharModal}
        title={isViewOnly ? "Consulta de Motorista" : (editingId ? "Editar Motorista" : "Novo Motorista")}
      >
        <MotoristaForm 
          onSubmit={handleSaveMotorista} 
          onCancel={fecharModal} 
          initialData={motoristaEmEdicao || {}}
          isReadOnly={isViewOnly} 
          onCriarProprietario={handleCriarProprietario}
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

// ◄ CORRIGIDO: UploadBox reestruturado com suporte tátil de clique, resolvido o erro "cat" e mapa de cores correto
const UploadBox = ({ title, icon: Icon, color, onChange, ready }) => {
  const colorMap = {
    blue:   'bg-blue-50 text-blue-500 hover:border-blue-400',
    green:  'bg-green-50 text-green-500 hover:border-green-400',
    purple: 'bg-purple-50 text-purple-500 hover:border-purple-400',
    orange: 'bg-orange-50 text-orange-500 hover:border-orange-400',
    yellow: 'bg-yellow-50 text-yellow-500 hover:border-yellow-400'
  };

  const idInput = `file-upload-${title.toLowerCase().replace(/\s/g, '-')}`;

  return (
    <label 
      htmlFor={idInput}
      className={`bg-white p-5 rounded-[2rem] border-2 border-dashed transition-all flex flex-col items-center text-center group cursor-pointer ${
        ready ? 'border-green-500 bg-green-50/30' : 'border-slate-200 hover:border-slate-400'
      }`}
    >
      <input 
        id={idInput}
        type="file" 
        accept=".csv, .xls, .xlsx" 
        onChange={onChange} 
        className="hidden" 
      />
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${
        ready ? 'bg-green-500 text-white' : colorMap[color] || 'bg-slate-50 text-slate-500'
      }`}>
        {ready ? <CheckCircle2 size={20} /> : <Icon size={20} />}
      </div>
      <h4 className="text-xs font-bold text-slate-700">{title}</h4>
      <p className="text-[10px] text-slate-400 mt-1 leading-snug">
        {ready ? 'Ficheiro pronto' : 'Formatos: CSV, XLS, XLSX'}
      </p>
    </label>
  );
};