import { 
  collection, getDocs, doc, addDoc, updateDoc, query, where, deleteDoc 
} from 'firebase/firestore';
import { logAcaoGlobal } from '../utils/logger';
import { generateNextCode } from '../utils/idGenerator';

/**
 * 1. Captura global de dados do ecossistema para o contexto da IA
 */
export const capturarDadosSistema = async (db) => {
  try {
    const [mSnap, vSnap, tSnap, pSnap, fSnap, cSnap] = await Promise.all([
      getDocs(collection(db, "motoristas")),
      getDocs(collection(db, "veiculos")),
      getDocs(collection(db, "tickets")),
      getDocs(collection(db, "proprietarios")),
      getDocs(collection(db, "movimentos_financeiros")),
      getDocs(collection(db, "cartoes")) 
    ]);

    return {
      totalMotoristas:    mSnap.size,
      totalVeiculos:      vSnap.size,
      totalProprietarios: pSnap.size,
      ticketsPendentes:   tSnap.docs.filter(d => d.data().status === 'pendente').length,
      listaMotoristas:    mSnap.docs.map(d => ({ id: d.id, nome: d.data().nome, nif: d.data().nif })),
      listaVeiculos:      vSnap.docs.map(d => ({
        id: d.id,
        matricula: d.data().matricula,
        motorista: d.data().motoristaNome
      })),
      listaCartoes: cSnap.docs.map(d => ({ 
        id: d.id, 
        ...d.data() 
      })),
      adjustesAtuais: fSnap.docs.map(d => ({
        id: d.id,
        entidadeId: d.data().entidadeId,
        descricao: d.data().descricao,
        tipo: d.data().tipoMovimento, 
        valor: d.data().valor,
        data: d.data().dataLancamento,
        pagoNoFechoId: d.data().pagoNoFechoId || ""
      }))
    };
  } catch (error) {
    console.error("[Captura Contexto Error]", error);
    return { 
      totalMotoristas: 0, 
      totalVeiculos: 0, 
      totalProprietarios: 0, 
      ticketsPendentes: 0, 
      listaMotoristas: [], 
      listaVeiculos: [], 
      listaCartoes: [], 
      adjustesAtuais: [] 
    };
  }
};

/**
 * Normaliza o tipo do cartão para lowercase sem acentos
 * Formato standard do sistema: "combustivel" | "eletrico"
 */
const normalizarTipoCartao = (tipo) =>
  (tipo || "combustivel")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

/**
 * 2. EXECUTOR DE AÇÕES NO FIREBASE
 */
export const executorFuncoes = async (db, name, args) => {
  console.log(`[Executor Service] Executando ação: ${name}`, args);
  try {
    
    // ==========================================
    // 🚖 OPERAÇÕES DE MOTORISTAS
    // ==========================================
    if (name === "criarMotorista") {
      if (!args.nome) return { sucesso: false, msg: "O nome do motorista é obrigatório." };
      const novoCodigo = await generateNextCode("motoristas", "MOT");
      const docRef = await addDoc(collection(db, "motoristas"), {
        nome: args.nome, telemovel: args.telemovel || "", nif: args.nif || "", email: args.email || "",
        codigoInterno: novoCodigo, status: "Pendente Documentação", dataCriacao: new Date().toISOString()
      });
      await logAcaoGlobal("IA Frota", "Admissão de Motorista", "Motoristas", `Criação do perfil inicial de ${args.nome} (${novoCodigo})`, docRef.id);
      return { sucesso: true, msg: `Perfil de ${args.nome} criado com sucesso (${novoCodigo}).`, id: docRef.id };
    }

    if (name === "atualizarMotorista") {
      if (!args.entidadeId) return { sucesso: false, msg: "O ID do motorista é obrigatório." };
      const dadosUpdates = {};
      if (args.nome !== undefined) dadosUpdates.nome = args.nome;
      if (args.telemovel !== undefined) dadosUpdates.telemovel = args.telemovel;
      if (args.nif !== undefined) dadosUpdates.nif = args.nif;
      if (args.email !== undefined) dadosUpdates.email = args.email;
      if (args.status !== undefined) dadosUpdates.status = args.status;
      
      await updateDoc(doc(db, "motoristas", args.entidadeId), dadosUpdates);
      await logAcaoGlobal("IA Frota", "Atualização de Perfil", "Motoristas", `Campos atualizados para o ID: ${args.entidadeId}`, args.entidadeId);
      return { sucesso: true, msg: `Perfil do motorista atualizado com sucesso.` };
    }

    if (name === "excluirMotorista") {
      if (!args.entidadeId) return { sucesso: false, msg: "O ID do motorista é obrigatório." };
      await deleteDoc(doc(db, "motoristas", args.entidadeId));
      await logAcaoGlobal("IA Frota", "Eliminação de Motorista", "Motoristas", `Remoção definitiva do perfil ID: ${args.entidadeId}`, args.entidadeId);
      return { sucesso: true, msg: `O motorista com ID ${args.entidadeId} foi permanentemente eliminado.` };
    }

    // ==========================================
    // 🚗 OPERAÇÕES DE VEÍCULOS
    // ==========================================
    if (name === "criarVeiculo") {
      if (!args.matricula) return { sucesso: false, msg: "A matrícula da viatura é obrigatória." };
      const docRef = await addDoc(collection(db, "veiculos"), {
        matricula: args.matricula.toUpperCase(), marca: args.marca || "", modelo: args.modelo || "",
        quilometragem: Number(args.quilometragem || 0), motoristaNome: args.motoristaNome || "Não Atribuído",
        dataCriacao: new Date().toISOString()
      });
      await logAcaoGlobal("IA Frota", "Criação de Veículo", "Veículos", `Viatura registada: ${args.matricula}`, docRef.id);
      return { sucesso: true, msg: `Veículo com matrícula ${args.matricula} registado com sucesso.`, id: docRef.id };
    }

    if (name === "editarVeiculo") {
      if (!args.entidadeId) return { sucesso: false, msg: "O ID do veículo é obrigatório." };
      const dadosUpdates = {};
      if (args.matricula !== undefined) dadosUpdates.matricula = args.matricula.toUpperCase();
      if (args.marca !== undefined) dadosUpdates.marca = args.marca;
      if (args.modelo !== undefined) dadosUpdates.modelo = args.modelo;
      if (args.quilometragem !== undefined) dadosUpdates.quilometragem = Number(args.quilometragem);
      if (args.motoristaNome !== undefined) dadosUpdates.motoristaNome = args.motoristaNome;

      await updateDoc(doc(db, "veiculos", args.entidadeId), dadosUpdates);
      await logAcaoGlobal("IA Frota", "Edição de Veículo", "Veículos", `ID veículo atualizado: ${args.entidadeId}`, args.entidadeId);
      return { sucesso: true, msg: `Dados do veículo atualizados com sucesso.` };
    }

    if (name === "excluirVeiculo") {
      if (!args.entidadeId) return { sucesso: false, msg: "O ID do veículo é obrigatório." };
      await deleteDoc(doc(db, "veiculos", args.entidadeId));
      await logAcaoGlobal("IA Frota", "Remoção de Veículo", "Veículos", `ID veículo apagado: ${args.entidadeId}`, args.entidadeId);
      return { sucesso: true, msg: `Viatura eliminada definitivamente do ecossistema.` };
    }

    // ==========================================
    // 🏢 OPERAÇÕES DE PROPRIETÁRIOS
    // ==========================================
    if (name === "criarProprietario") {
      if (!args.nome) return { sucesso: false, msg: "O nome do proprietário/parceiro é obrigatório." };
      const docRef = await addDoc(collection(db, "proprietarios"), {
        nome: args.nome, nif: args.nif || "", dataAssociacao: new Date().toISOString()
      });
      await logAcaoGlobal("IA Frota", "Novo Proprietário", "Proprietários", `Parceiro registado: ${args.nome}`, docRef.id);
      return { sucesso: true, msg: `Proprietário ${args.nome} configurado com sucesso.`, id: docRef.id };
    }

    if (name === "editarProprietario") {
      if (!args.entidadeId) return { sucesso: false, msg: "O ID do proprietário é obrigatório." };
      const dadosUpdates = {};
      if (args.nome !== undefined) dadosUpdates.nome = args.nome;
      if (args.nif !== undefined) dadosUpdates.nif = args.nif;

      await updateDoc(doc(db, "proprietarios", args.entidadeId), dadosUpdates);
      await logAcaoGlobal("IA Frota", "Edição Proprietário", "Proprietários", `ID atualizado: ${args.entidadeId}`, args.entidadeId);
      return { sucesso: true, msg: `Dados do proprietário modificados com sucesso.` };
    }

    if (name === "excluirProprietario") {
      if (!args.entidadeId) return { sucesso: false, msg: "O ID do proprietário é obrigatório." };
      await deleteDoc(doc(db, "proprietarios", args.entidadeId));
      await logAcaoGlobal("IA Frota", "Remoção Proprietário", "Proprietários", `ID removido: ${args.entidadeId}`, args.entidadeId);
      return { sucesso: true, msg: `Proprietário desvinculado e excluído do sistema.` };
    }

    // ==========================================
    // 💳 OPERAÇÕES DE CARTÕES
    // ==========================================
    if (name === "criarCartao") {
      if (!args.numeroCartao) return { sucesso: false, msg: "O número do cartão é obrigatório." };

      // CORRECÇÃO: lowercase sem acentos — formato standard "combustivel" | "eletrico"
      const tipoCartao = normalizarTipoCartao(args.tipo);

      const docRef = await addDoc(collection(db, "cartoes"), {
        numeroCartao: args.numeroCartao,
        fornecedor: args.fornecedor || "Não definido",
        tipo: tipoCartao,
        plafond: Number(args.plafond || 0),
        vinculoMatricula: args.vinculoMatricula || "",
        status: "Ativo",
        dataCriacao: new Date().toISOString()
      });
      await logAcaoGlobal("IA Frota", "Registo de Cartão", "Cartões", `Cartão ${tipoCartao} (${args.fornecedor}): ${args.numeroCartao}`, docRef.id);
      return { sucesso: true, msg: `Cartão de ${tipoCartao} (${args.fornecedor}) com plafond de ${args.plafond}€ associado com sucesso.`, id: docRef.id };
    }

    if (name === "editarCartao") {
      if (!args.entidadeId) return { sucesso: false, msg: "O ID do cartão é obrigatório." };
      const dadosUpdates = {};
      if (args.numeroCartao !== undefined) dadosUpdates.numeroCartao = args.numeroCartao;
      // CORRECÇÃO: lowercase sem acentos na edição também
      if (args.tipo !== undefined) dadosUpdates.tipo = normalizarTipoCartao(args.tipo);
      if (args.fornecedor !== undefined) dadosUpdates.fornecedor = args.fornecedor;
      if (args.plafond !== undefined) dadosUpdates.plafond = Number(args.plafond);
      if (args.vinculoMatricula !== undefined) dadosUpdates.vinculoMatricula = args.vinculoMatricula;
      if (args.status !== undefined) dadosUpdates.status = args.status;

      await updateDoc(doc(db, "cartoes", args.entidadeId), dadosUpdates);
      await logAcaoGlobal("IA Frota", "Edição de Cartão", "Cartões", `ID cartão alterado: ${args.entidadeId}`, args.entidadeId);
      return { sucesso: true, msg: `Definições do cartão atualizadas.` };
    }

    if (name === "excluirCartao") {
      if (!args.entidadeId) return { sucesso: false, msg: "O ID do cartão é obrigatório." };
      await deleteDoc(doc(db, "cartoes", args.entidadeId));
      await logAcaoGlobal("IA Frota", "Remoção de Cartão", "Cartões", `ID cartão apagado: ${args.entidadeId}`, args.entidadeId);
      return { sucesso: true, msg: `Cartão permanentemente cancelado e removido do registo.` };
    }

    // ==========================================
    // 📅 GERAÇÃO DE TAREFAS / TICKETS
    // ==========================================
    if (name === "criarTarefa") {
      if (!args.atribuidoA || !args.nota) {
        return { sucesso: false, msg: "Parâmetros insuficientes para criar a tarefa." };
      }
      const docRef = await addDoc(collection(db, "tickets"), {
        atribuidoA: args.atribuidoA, nota: args.nota, prioridade: args.prioridade || 'media',
        vinculoNome: args.vinculoNome || 'Geral', vinculoId: args.entidadeId || '', modulo: 'geral',
        status: 'pendente', remetente: 'Sala de Reuniões IA', dataCriacao: new Date().toISOString()
      });
      await logAcaoGlobal("IA", "Criação de Tarefa", "Tickets", args.nota, docRef.id);
      return { sucesso: true, msg: `Tarefa registada e atribuída a ${args.atribuidoA}.`, id: docRef.id };
    }

    // ==========================================
    // 💰 OPERAÇÕES FINANCEIRAS
    // ==========================================
    if (name === "lancarAjusteFinanceiro") {
      if (!args.entidadeId || !args.tipoEntidade || !args.valor || !args.descricao) {
        return { sucesso: false, msg: "Faltam parâmetros obrigatórios para o lançamento financeiro." };
      }
      const dataFinal = args.data || new Date().toISOString().split('T')[0];
      const tipoDefinido = args.tipo || args.tipoMovimento || "debito";

      const docRef = await addDoc(collection(db, "movimentos_financeiros"), {
        entidadeId: args.entidadeId, tipoEntidade: args.tipoEntidade, tipoMovimento: tipoDefinido.toLowerCase(), 
        valor: Number(args.valor), descricao: args.descricao, dataLancamento: dataFinal,
        dataCriacao: new Date().toISOString(), criadoPor: "Agente Contabilista", pagoNoFechoId: ""
      });
      await logAcaoGlobal("IA Contabilista", "Lançamento Automático", "Financeiro", `${tipoDefinido.toUpperCase()}: ${args.descricao} (${args.valor}€)`, args.entidadeId);
      return { sucesso: true, msg: `Lançamento de ${args.valor}€ (${tipoDefinido}) gravado no extrato.`, id: docRef.id };
    }

    if (name === "editarAjusteFinanceiro") {
      if (!args.entidadeId || !args.descricaoOriginal) {
        return { sucesso: false, msg: "Campos entidadeId e descricaoOriginal são obrigatórios." };
      }
      const q = query(
        collection(db, "movimentos_financeiros"), 
        where("entidadeId", "==", args.entidadeId), where("descricao", "==", args.descricaoOriginal), where("pagoNoFechoId", "==", "")
      );
      const snap = await getDocs(q);
      if (snap.empty) return { sucesso: false, msg: `Nenhum lançamento em aberto encontrado.` };
      
      const updateData = {};
      if (args.novaData)      updateData.dataLancamento = args.novaData;
      if (args.novoValor)     updateData.valor          = Number(args.novoValor);
      if (args.novaDescricao) updateData.descricao      = args.novaDescricao;

      await updateDoc(doc(db, "movimentos_financeiros", snap.docs[0].id), updateData);
      await logAcaoGlobal("IA", "Edição de Lançamento", "Financeiro", `De: ${args.descricaoOriginal}`, args.entidadeId);
      return { sucesso: true, msg: `Lançamento de ajuste alterado com sucesso.` };
    }

    if (name === "excluirAjusteFinanceiro") {
      if (!args.entidadeId || !args.descricaoOriginal) {
        return { sucesso: false, msg: "Identificadores insuficientes para proceder à remoção." };
      }
      const q = query(
        collection(db, "movimentos_financeiros"), 
        where("entidadeId", "==", args.entidadeId), where("descricao", "==", args.descricaoOriginal), where("pagoNoFechoId", "==", "")
      );
      const snap = await getDocs(q);
      if (snap.empty) return { sucesso: false, msg: `O lançamento não foi localizado ou já se encontra fechado.` };

      let totalApagados = 0;
      for (const documento of snap.docs) {
        await deleteDoc(doc(db, "movimentos_financeiros", documento.id));
        totalApagados++;
      }
      await logAcaoGlobal("IA", "Exclusão de Lançamento", "Financeiro", args.descricaoOriginal, args.entidadeId);
      return { sucesso: true, msg: `${totalApagados} registo(s) financeiro(s) eliminado(s).` };
    }

    return { sucesso: false, msg: `Ação não parametrizada no sistema: ${name}` };
  } catch (error) {
    console.error(`[Executor Error]`, error);
    return { sucesso: false, msg: `Erro de comunicação na infraestrutura: ${error.message}` };
  }
};