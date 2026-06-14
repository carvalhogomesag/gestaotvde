/**
 * assessoriaService.js
 * Localização: src/services/assessoriaService.js
 *
 * Funções Firestore para a gestão de clientes em Assessoria (Assessorados)
 * e tabela de serviços e planos de assessoria.
 */

import { 
  collection, getDocs, doc, addDoc, updateDoc, 
  query, where, orderBy, setDoc 
} from 'firebase/firestore';
import { logAcaoGlobal } from '../utils/logger';
import { generateNextCode } from '../utils/idGenerator';

// Lista de Planos e Serviços Padrão para Auto-inicialização (Seed)
const PLANOS_PADRAO = [
  { id: 'p-essencial', nome: 'Plano Essencial', tipo: 'pacote', preco: 49.00, descricao: 'Apoio documental na escolha de escolas TVDE, exames médicos e psicotécnicos.' },
  { id: 'p-avancado', nome: 'Plano Avançado', tipo: 'pacote', preco: 149.00, descricao: 'Organização estruturada do dossiê de candidatura e submissão eletrónica no IMT.' },
  { id: 'p-premium', nome: 'Plano Premium (Chave na Mão)', tipo: 'pacote', preco: 249.00, descricao: 'Acompanhamento total de ponta a ponta: IMT, ativação de contas e curso de apps.' },
  { id: 's-criminal', nome: 'Agendamento de Registo Criminal', tipo: 'avulso', preco: 15.00, descricao: 'Obtenção e triagem do registo criminal focado em TVDE.' },
  { id: 's-psico', nome: 'Agendamento de Psicotécnicos', tipo: 'avulso', preco: 35.00, descricao: 'Marcação rápida de exames psicotécnicos de Grupo 2 em clínicas parceiras.' },
  { id: 's-contas', nome: 'Criação & Ativação de Contas', tipo: 'avulso', preco: 30.00, descricao: 'Criação e validação do perfil do motorista na Uber e Bolt.' }
];

/**
 * Inicializa os planos de assessoria padrão no Firestore caso a coleção esteja vazia.
 * 
 * @param {Firestore} db 
 */
export const inicializarPlanosAssessoriaPadrao = async (db) => {
  try {
    const colRef = collection(db, 'servicos_assessoria');
    const snap = await getDocs(colRef);
    
    if (snap.empty) {
      console.log('[assessoriaService] Coleção de serviços vazia. A inicializar planos padrão...');
      for (const plano of PLANOS_PADRAO) {
        await setDoc(doc(db, 'servicos_assessoria', plano.id), {
          ...plano,
          ativo: true,
          atualizadoEm: new Date().toISOString()
        });
      }
      console.log('[assessoriaService] Planos padrão inicializados com sucesso.');
    }
  } catch (error) {
    console.error('[assessoriaService] Erro ao inicializar planos padrão:', error);
  }
};

/**
 * Obtém todos os planos e serviços ativos de assessoria.
 * 
 * @param {Firestore} db 
 * @returns {Promise<Array>}
 */
export const obterPlanosAssessoria = async (db) => {
  try {
    // Garante que existem planos padrão na base de dados antes de carregar
    await inicializarPlanosAssessoriaPadrao(db);

    const colRef = collection(db, 'servicos_assessoria');
    const snap = await getDocs(colRef);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('[assessoriaService] Erro ao obter planos:', error);
    throw error;
  }
};

/**
 * Obtém todos os clientes em assessoria (Assessorados) registados.
 * 
 * @param {Firestore} db 
 * @returns {Promise<Array>}
 */
export const obterAssessorados = async (db) => {
  try {
    console.log('[assessoriaService] A obter lista de assessorados...');
    const colRef = collection(db, 'assessorados');
    const snap = await getDocs(colRef);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('[assessoriaService] Erro ao obter assessorados:', error);
    throw error;
  }
};

/**
 * Cria um novo cliente em assessoria, gerando automaticamente um código 'ASS-XXXX'.
 * 
 * @param {Firestore} db 
 * @param {Object} dados       - Informações preenchidas no formulário
 * @param {string} criadoPor   - Nome do utilizador que realizou a ação
 * @returns {Promise<string>}  - ID do documento criado
 */
export const criarAssessorado = async (db, dados, criadoPor) => {
  try {
    const novoCodigo = await generateNextCode('assessorados', 'ASS');
    const colRef = collection(db, 'assessorados');
    
    const novoDocumento = {
      ...dados,
      codigoInterno: novoCodigo,
      status: 'Ativo',                         // Ativo | Concluído | Cancelado
      etapaAdicional: 'Inscrição',              // Inscrição | Formação | IMT | Contas | Vinculado
      criadoPor: criadoPor,
      dataCriacao: new Date().toISOString(),
      historico: [
        {
          usuario: criadoPor,
          data: new Date().toISOString(),
          descricao: 'Iniciou processo de assessoria no sistema.'
        }
      ]
    };

    const docRef = await addDoc(colRef, novoDocumento);
    
    await logAcaoGlobal(
      criadoPor,
      'Criação',
      'Assessoria',
      `Criou o registo do assessorado: ${dados.nome} (${novoCodigo})`,
      docRef.id
    );

    return docRef.id;
  } catch (error) {
    console.error('[assessoriaService] Erro ao criar assessorado:', error);
    throw error;
  }
};

/**
 * Atualiza os dados de um cliente em assessoria e regista a alteração no histórico.
 * 
 * @param {Firestore} db 
 * @param {string} id          - ID do documento do assessorado
 * @param {Object} dadosNovos  - Novas informações e estado de checklists
 * @param {string} alteradoPor - Nome do utilizador que editou
 * @param {string} motivoLog   - Motivo da alteração para auditoria
 */
export const atualizarAssessorado = async (db, id, dadosNovos, alteradoPor, motivoLog) => {
  try {
    const docRef = doc(db, 'assessorados', id);
    
    const atualizacoes = {
      ...dadosNovos,
      historico: [
        ...(dadosNovos.historico || []),
        {
          usuario: alteradoPor,
          data: new Date().toISOString(),
          descricao: motivoLog
        }
      ]
    };

    await updateDoc(docRef, atualizacoes);
    
    await logAcaoGlobal(
      alteradoPor,
      'Edição',
      'Assessoria',
      `Atualizou o assessorado: ${dadosNovos.nome || 'Cliente'}. Motivo: ${motivoLog}`,
      id
    );
  } catch (error) {
    console.error('[assessoriaService] Erro ao atualizar assessorado:', error);
    throw error;
  }
};  