/**
 * financeiroService.js
 * Localização: src/services/financeiroService.js
 *
 * Funções Firestore para as coleções de gestão financeira e geração de extratos:
 *   - configuracoes_financeiras  (taxa de gestão por entidade)
 *   - caucoes                    (depósitos/caução com suporte a planeamento de parcelas)
 *   - renegociacoes              (planos de pagamento de dívida)
 *   - movimentos_financeiros     (lançamentos de débito/crédito, plataformas e despesas)
 *   - fechos_semanais            (processamentos semanais consolidados individuais ou em lote) [2]
 *
 * Todas as funções recebem `db` como primeiro argumento.
 */

import {
  collection, doc,
  getDoc, getDocs,
  addDoc, updateDoc,
  query, where, runTransaction,
  writeBatch // ◄ Adicionado writeBatch à lista de importações
} from 'firebase/firestore';

// ─────────────────────────────────────────────────────────────────────────────
// SECÇÃO 1 — CONFIGURAÇÕES FINANCEIRAS
// Taxa de gestão (fixa ou percentagem) por motorista / veículo / proprietário
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Obtém a configuração financeira de uma entidade.
 * Devolve null se ainda não existir configuração.
 *
 * @param {Firestore} db
 * @param {string} entidadeId - ID do Firestore da entidade
 * @returns {Object|null}
 */
export const getConfiguracaoFinanceira = async (db, entidadeId) => {
  try {
    const q = query(
      collection(db, 'configuracoes_financeiras'),
      where('entidadeId', '==', entidadeId)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() };
  } catch (error) {
    console.error('[financeiroService] getConfiguracaoFinanceira:', error);
    return null;
  }
};

/**
 * Cria ou actualiza a configuração financeira de uma entidade.
 *
 * @param {Firestore} db
 * @param {string} entidadeId
 * @param {string} tipoEntidade - "motorista" | "veiculo" | "proprietario"
 * @param {Object} dados
 */
export const salvarConfiguracaoFinanceira = async (db, entidadeId, tipoEntidade, dados) => {
  try {
    const existente = await getConfiguracaoFinanceira(db, entidadeId);

    const payload = {
      entidadeId,
      tipoEntidade,
      taxaGestao:     Number(dados.taxaGestao     ?? 0),
      taxaGestaoPct:  Number(dados.taxaGestaoPct  ?? 0),
      tipoTaxaGestao: dados.tipoTaxaGestao ?? 'fixo',
      ativo:          dados.ativo ?? true,
      atualizadoEm:   new Date().toISOString()
    };

    if (existente) {
      await updateDoc(doc(db, 'configuracoes_financeiras', existente.id), payload);
      return { sucesso: true, id: existente.id, msg: 'Configuração actualizada.' };
    } else {
      payload.criadoEm = new Date().toISOString();
      const docRef = await addDoc(collection(db, 'configuracoes_financeiras'), payload);
      return { sucesso: true, id: docRef.id, msg: 'Configuração criada.' };
    }
  } catch (error) {
    console.error('[financeiroService] salvarConfiguracaoFinanceira:', error);
    return { sucesso: false, id: null, msg: error.message };
  }
};

/**
 * Calcula o valor da taxa de gestão a aplicar num dado fecho.
 */
export const calcularTaxaGestao = (config, receitaBruta = 0) => {
  if (!config || !config.ativo) return 0;
  if (config.tipoTaxaGestao === 'percentagem') {
    return Number((receitaBruta * config.taxaGestaoPct).toFixed(2));
  }
  return Number(config.taxaGestao ?? 0);
};

// ─────────────────────────────────────────────────────────────────────────────
// SECÇÃO 2 — CAUÇÕES (Lançamentos de garantia como Crédito/Ativo)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Obtém a caução activa de uma entidade.
 */
export const getCaucaoAtiva = async (db, entidadeId) => {
  try {
    const q = query(
      collection(db, 'caucoes'),
      where('entidadeId', '==', entidadeId),
      where('status', '==', 'ativa')
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() };
  } catch (error) {
    console.error('[financeiroService] getCaucaoAtiva:', error);
    return null;
  }
};

/**
 * Obtém o histórico completo de cauções de uma entidade.
 */
export const getHistoricoCaucoes = async (db, entidadeId) => {
  try {
    const q = query(
      collection(db, 'caucoes'),
      where('entidadeId', '==', entidadeId)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('[financeiroService] getHistoricoCaucoes:', error);
    return [];
  }
};

/**
 * Cria uma nova caução para uma entidade com plano estimativo de parcelas.
 * Regista o depósito/entrada inicial como Crédito (saldo positivo) na conta do utilizador.
 */
export const criarCaucao = async (db, entidadeId, tipoEntidade, dados, criadoPor) => {
  try {
    const ativa = await getCaucaoAtiva(db, entidadeId);
    if (ativa) {
      return {
        sucesso: false,
        id: null,
        msg: 'Já existe uma caução activa para esta entidade. Liquida-a antes de criar uma nova.'
      };
    }

    const valorTotal    = Number(dados.valorTotal   ?? 0);
    const valorEntrada  = dados.tipoPagamento === 'pronto' ? valorTotal : Number(dados.valorEntrada ?? 0);
    const valorRestante = Number((valorTotal - valorEntrada).toFixed(2));
    const parcelaSemanal = dados.tipoPagamento === 'pronto' ? 0 : Number(dados.parcelaSemanal ?? 0);
    const numeroParcelas = parcelaSemanal > 0 ? Math.ceil(valorRestante / parcelaSemanal) : 0;

    const planeamento = [];
    let dataReferencia = new Date(dados.dataEntrada || new Date().toISOString().split('T')[0]);

    for (let i = 1; i <= numeroParcelas; i++) {
      dataReferencia.setDate(dataReferencia.getDate() + 7);
      const dataFormatada = dataReferencia.toISOString().split('T')[0];
      
      planeamento.push({
        numeroParcela: i,
        dataPrevista: dataFormatada,
        valor: i === numeroParcelas ? Number((valorRestante - (parcelaSemanal * (numeroParcelas - 1))).toFixed(2)) : parcelaSemanal,
        status: 'pendente',
        extratoId: ''
      });
    }

    const payload = {
      entidadeId,
      tipoEntidade,
      valorTotal,
      valorPago:       valorEntrada,
      valorRestante,
      tipoPagamento:   dados.tipoPagamento ?? 'pronto',
      valorEntrada,
      parcelaSemanal,
      status:          valorRestante <= 0 ? 'liquidada' : 'ativa',
      fechosDebitados: [],
      planeamento,
      criadoPor:       criadoPor || 'Sistema',
      criadoEm:        new Date().toISOString()
    };

    const docRef = await addDoc(collection(db, 'caucoes'), payload);

    // Registado como Crédito na conta para constituir saldo positivo de garantia do motorista
    if (valorEntrada > 0) {
      await addDoc(collection(db, 'movimentos_financeiros'), {
        entidadeId,
        tipoEntidade,
        tipoMovimento:  'credito',
        categoria:      'caucao',
        valor:          valorEntrada,
        descricao:      dados.tipoPagamento === 'pronto' 
          ? 'Depósito de Caução [Quitação Integral]' 
          : 'Depósito de Entrada de Caução [Fração Inicial]',
        dataLancamento: dados.dataEntrada || new Date().toISOString().split('T')[0],
        dataCriacao:    new Date().toISOString(),
        criadoPor:      criadoPor || 'Sistema',
        pagoNoFechoId:  ''
      });
    }

    return {
      sucesso: true,
      id: docRef.id,
      msg: dados.tipoPagamento === 'pronto'
        ? `Caução de ${valorTotal}€ registada como paga a pronto e lançada como crédito.`
        : `Caução de ${valorTotal}€ criada. Entrada de ${valorEntrada}€ lançada como crédito. Parcela semanal: ${parcelaSemanal}€.`
    };
  } catch (error) {
    console.error('[financeiroService] criarCaucao:', error);
    return { sucesso: false, id: null, msg: error.message };
  }
};

/**
 * Liquidação manual avulsa de uma única prestação do calendário da caução (Antecipada)
 */
export const quitarParcelaCaucao = async (db, caucaoId, numeroParcela, criadoPor = 'Sistema') => {
  const caucaoRef = doc(db, 'caucoes', caucaoId);
  try {
    let msgResultado = "";
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(caucaoRef);
      if (!snap.exists()) throw new Error("Plano de caução não encontrado.");
      
      const caucao = snap.data();
      const parcela = (caucao.planeamento || []).find(p => p.numeroParcela === numeroParcela);
      
      if (!parcela) throw new Error("Parcela indicada não encontrada no plano.");
      if (parcela.status === 'pago') throw new Error("Esta parcela já se encontra liquidada.");

      const valorParcela = parcela.valor;
      const novoValorPago = Number((caucao.valorPago + valorParcela).toFixed(2));
      const novoRestante = Number((caucao.valorRestante - valorParcela).toFixed(2));
      const liquidada = novoRestante <= 0;

      const planeamentoAtualizado = caucao.planeamento.map(p => {
        if (p.numeroParcela === numeroParcela) {
          return { ...p, status: 'pago', extratoId: 'PAG_ANTECIPADO' };
        }
        return p;
      });

      transaction.update(caucaoRef, {
        valorPago:     novoValorPago,
        valorRestante: Math.max(novoRestante, 0),
        status:        liquidada ? 'liquidada' : 'ativa',
        planeamento:   planeamentoAtualizado,
        ...(liquidada && { liquidadaEm: new Date().toISOString() })
      });

      // Lançamento positivo (crédito)
      await addDoc(collection(db, 'movimentos_financeiros'), {
        entidadeId:     caucao.entidadeId,
        tipoEntidade:   caucao.tipoEntidade,
        tipoMovimento:  'credito',
        categoria:      'caucao',
        valor:          valorParcela,
        descricao:      `Amortização Antecipada da Parcela #${numeroParcela} da Caução`,
        dataLancamento: new Date().toISOString().split('T')[0],
        dataCriacao:    new Date().toISOString(),
        criadoPor:      criadoPor,
        pagoNoFechoId:  ''
      });

      msgResultado = `Parcela #${numeroParcela} de ${valorParcela}€ liquidada e integrada como crédito na conta corrente.`;
    });

    return { sucesso: true, msg: msgResultado };
  } catch (err) {
    console.error('[financeiroService] quitarParcelaCaucao:', err);
    return { sucesso: false, msg: err.message };
  }
};

/**
 * Regista o pagamento de uma parcela de caução num fecho semanal.
 */
export const registarPagamentoCaucao = async (db, caucaoId, valorPago, fechoId) => {
  try {
    const caucaoRef  = doc(db, 'caucoes', caucaoId);
    const caucaoSnap = await getDoc(caucaoRef);
    if (!caucaoSnap.exists()) {
      return { sucesso: false, liquidada: false, msg: 'Caução não encontrada.' };
    }

    const caucao         = caucaoSnap.data();
    const novoValorPago  = Number((caucao.valorPago + valorPago).toFixed(2));
    const novoRestante   = Number((caucao.valorRestante - valorPago).toFixed(2));
    const liquidada      = novoRestante <= 0;

    const planeamentoAtualizado = (caucao.planeamento || []).map(p => {
      if (p.status === 'pendente') {
        return { ...p, status: 'pago', extratoId: fechoId };
      }
      return p;
    });

    await updateDoc(caucaoRef, {
      valorPago:       novoValorPago,
      valorRestante:   Math.max(novoRestante, 0),
      status:          liquidada ? 'liquidada' : 'ativa',
      fechosDebitados: [...(caucao.fechosDebitados || []), fechoId],
      planeamento:     planeamentoAtualizado,
      ...(liquidada && { liquidadaEm: new Date().toISOString() })
    });

    return {
      sucesso: true,
      liquidada,
      msg: liquidada
        ? `Caução liquidada! Valor total pago: ${novoValorPago}€.`
        : `Parcela de ${valorPago}€ registada. Restam ${Math.max(novoRestante, 0)}€.`
    };
  } catch (error) {
    console.error('[financeiroService] registarPagamentoCaucao:', error);
    return { sucesso: false, liquidada: false, msg: error.message };
  }
};

/**
 * Cancela ou suspende temporariamente uma cobrança no planeamento de caução.
 */
export const suspenderParcelaCaucao = async (db, caucaoId, numeroParcela) => {
  const caucaoDocRef = doc(db, 'caucoes', caucaoId);

  try {
    await runTransaction(db, async (transaction) => {
      const sfDoc = await transaction.get(caucaoDocRef);
      if (!sfDoc.exists()) {
        throw new Error("Registo de caução não encontrado.");
      }

      const data = sfDoc.data();
      const planeamentoAtualizado = (data.planeamento || []).map(p => {
        if (p.numeroParcela === numeroParcela) {
          return { ...p, status: 'suspenso' };
        }
        return p;
      });

      const adiarDias = 7;
      const novoPlaneamento = planeamentoAtualizado.map(p => {
        if (p.numeroParcela > numeroParcela && p.status === 'pendente') {
          const dataOriginal = new Date(p.dataPrevista);
          dataOriginal.setDate(dataOriginal.getDate() + adiarDias);
          return { ...p, dataPrevista: dataOriginal.toISOString().split('T')[0] };
        }
        return p;
      });

      transaction.update(caucaoDocRef, { planeamento: novoPlaneamento });
    });

    return { sucesso: true, msg: 'Cobrança de parcela suspensa e planeamento recalculado.' };
  } catch (error) {
    console.error('[financeiroService] suspenderParcelaCaucao:', error);
    return { sucesso: false, msg: error.message };
  }
};

/**
 * Liquida manualmente uma caução.
 * Lança o valor remanescente em aberto como Crédito na conta corrente do utilizador.
 */
export const liquidarCaucao = async (db, caucaoId) => {
  try {
    const caucaoRef  = doc(db, 'caucoes', caucaoId);
    const caucaoSnap = await getDoc(caucaoRef);
    if (!caucaoSnap.exists()) {
      return { sucesso: false, msg: 'Caução não encontrada.' };
    }
    const caucao = caucaoSnap.data();
    const valorRestante = Number(caucao.valorRestante || 0);

    const planeamentoAtualizado = (caucao.planeamento || []).map(p => {
      if (p.status === 'pendente') {
        return { ...p, status: 'pago', descricao: 'Liquidado Antecipadamente' };
      }
      return p;
    });

    await updateDoc(caucaoRef, {
      valorPago:     caucao.valorTotal,
      valorRestante: 0,
      status:        'liquidada',
      planeamento:   planeamentoAtualizado,
      liquidadaEm:   new Date().toISOString()
    });

    if (valorRestante > 0) {
      await addDoc(collection(db, 'movimentos_financeiros'), {
        entidadeId:     caucao.entidadeId,
        tipoEntidade:   caucao.tipoEntidade,
        tipoMovimento:  'credito', // Registado como crédito positivo de garantia
        categoria:      'caucao',
        valor:          valorRestante,
        descricao:      'Liquidação Antecipada de Caução [Quitação Total]',
        dataLancamento: new Date().toISOString().split('T')[0],
        dataCriacao:    new Date().toISOString(),
        criadoPor:      'Sistema',
        pagoNoFechoId:  ''
      });
    }

    return { 
      sucesso: true, 
      msg: `Caução de ${caucao.valorTotal}€ marcada como liquidada. Ajuste de ${valorRestante}€ registado como crédito.` 
    };
  } catch (error) {
    console.error('[financeiroService] liquidarCaucao:', error);
    return { sucesso: false, msg: error.message };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// SECÇÃO 3 — RENEGOCIAÇÕES
// Plano de pagamento faseado de dívida (saldo negativo)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Obtém a renegociação activa de uma entidade.
 */
export const getRenegociacaoAtiva = async (db, entidadeId) => {
  try {
    const q = query(
      collection(db, 'renegociacoes'),
      where('entidadeId', '==', entidadeId),
      where('status', '==', 'ativa')
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() };
  } catch (error) {
    console.error('[financeiroService] getRenegociacaoAtiva:', error);
    return null;
  }
};

/**
 * Obtém o histórico completo de renegociações de uma entidade.
 */
export const getHistoricoRenegociacoes = async (db, entidadeId) => {
  try {
    const q = query(
      collection(db, 'renegociacoes'),
      where('entidadeId', '==', entidadeId)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('[financeiroService] getHistoricoRenegociacoes:', error);
    return [];
  }
};

/**
 * Cria um novo plano de renegociação de dívida.
 */
export const criarRenegociacao = async (db, entidadeId, tipoEntidade, dados, aprovadoPor) => {
  try {
    const ativa = await getRenegociacaoAtiva(db, entidadeId);
    if (ativa) {
      return {
        sucesso: false,
        id: null,
        msg: 'Já existe um plano de renegociação activo. Conclui-o ou cancela-o antes de criar um novo.',
        parcelaSemanal: 0
      };
    }

    const valorDivida    = Number(dados.valorDivida    ?? 0);
    const numeroParcelas = Number(dados.numeroParcelas ?? 1);
    const parcelaSemanal = Number((valorDivida / numeroParcelas).toFixed(2));

    const payload = {
      entidadeId,
      tipoEntidade,
      valorDivida,
      valorPago:       0,
      valorRestante:   valorDivida,
      numeroParcelas,
      parcelaSemanal,
      motivoDivida:    dados.motivoDivida || 'Saldo negativo acumulado',
      status:          'ativa',
      fechosDebitados: [],
      aprovadoPor:     aprovadoPor || 'Sistema',
      criadoEm:        new Date().toISOString()
    };

    const docRef = await addDoc(collection(db, 'renegociacoes'), payload);
    return {
      sucesso: true,
      id: docRef.id,
      parcelaSemanal,
      msg: `Plano criado: ${valorDivida}€ em ${numeroParcelas} semanas (${parcelaSemanal}€/semana).`
    };
  } catch (error) {
    console.error('[financeiroService] criarRenegociacao:', error);
    return { sucesso: false, id: null, msg: error.message, parcelaSemanal: 0 };
  }
};

/**
 * Regista o pagamento de uma parcela de renegociação num fecho semanal.
 */
export const registarPagamentoRenegociacao = async (db, renegociacaoId, valorPago, fechoId) => {
  try {
    const rnegRef  = doc(db, 'renegociacoes', renegociacaoId);
    const rnegSnap = await getDoc(rnegRef);
    if (!rnegSnap.exists()) {
      return { sucesso: false, liquidada: false, msg: 'Renegociação não encontrada.' };
    }

    const rneg          = rnegSnap.data();
    const novoValorPago  = Number((rneg.valorPago + valorPago).toFixed(2));
    const novoRestante   = Number((rneg.valorRestante - valorPago).toFixed(2));
    const liquidada      = novoRestante <= 0;

    await updateDoc(rnegRef, {
      valorPago:       novoValorPago,
      valorRestante:   Math.max(novoRestante, 0),
      status:          liquidada ? 'liquidada' : 'ativa',
      fechosDebitados: [...(rneg.fechosDebitados || []), fechoId],
      ...(liquidada && { liquidadaEm: new Date().toISOString() })
    });

    return {
      sucesso: true,
      liquidada,
      msg: liquidada
        ? `Dívida liquidada! Total pago: ${novoValorPago}€.`
        : `Parcela de ${valorPago}€ debitada. Restam ${Math.max(novoRestante, 0)}€.`
    };
  } catch (error) {
    console.error('[financeiroService] registarPagamentoRenegociacao:', error);
    return { sucesso: false, liquidada: false, msg: error.message };
  }
};

/**
 * Cancela um plano de renegociação activo.
 */
export const cancelarRenegociacao = async (db, renegociacaoId, motivo) => {
  try {
    await updateDoc(doc(db, 'renegociacoes', renegociacaoId), {
      status:       'cancelada',
      canceladaEm:  new Date().toISOString(),
      motivoCancelamento: motivo || 'Cancelado pelo gestor'
    });
    return { sucesso: true, msg: 'Plano de renegociação cancelado.' };
  } catch (error) {
    console.error('[financeiroService] cancelarRenegociacao:', error);
    return { sucesso: false, msg: error.message };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// SECÇÃO 4 — FUNÇÃO AGREGADORA (usada pelo Fecho Semanal)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcula todos os débitos automáticos aplicáveis a uma entidade num fecho.
 */
export const calcularDebitosAutomaticos = async (db, entidadeId, receitaBruta = 0) => {
  const [config, caucao, renegociacao] = await Promise.all([
    getConfiguracaoFinanceira(db, entidadeId),
    getCaucaoAtiva(db, entidadeId),
    getRenegociacaoAtiva(db, entidadeId)
  ]);

  const taxaGestao         = calcularTaxaGestao(config, receitaBruta);
  const parcelaCaucao      = caucao      ? Number(caucao.parcelaSemanal      ?? 0) : 0;
  const parcelaRenegociacao = renegociacao ? Number(renegociacao.parcelaSemanal ?? 0) : 0;

  return {
    taxaGestao,
    parcelaCaucao,
    caucaoId:           caucao?.id      || null,
    parcelaRenegociacao,
    renegociacaoId:     renegociacao?.id || null,
    totalDebitosAutomaticos: Number(
      (taxaGestao + parcelaCaucao + parcelaRenegociacao).toFixed(2)
    )
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// SECÇÃO 5 — EXTRATOS MULTI-ENTIDADE (Filtração em Memória & Categorização Inteligente)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Consolida lançamentos e dados de caução de qualquer entidade.
 * Filtra dados em memória e analisa descrições para categorizar débitos de forma inteligente.
 * 
 * ✨ ATUALIZAÇÃO: Exclui pagamentos de entrada de caução do extrato operativo semanal corriqueiro.
 * Devolve o histórico exclusivo de caução para alimentar o subextrato da caixa de ponto de situação.
 */
export const obterDadosExtratoEntidade = async (db, entidadeId, tipoEntidade, dataInicio, dataFim) => {
  try {
    console.log("[financeiroService] A iniciar consulta de movimentos para o ID:", entidadeId);

    // 1. Procurar movimentos gerais vinculados à entidade
    const qMovimentos = query(
      collection(db, 'movimentos_financeiros'),
      where('entidadeId', '==', entidadeId)
    );
    const snapMovimentos = await getDocs(qMovimentos);
    const todosMovimentos = snapMovimentos.docs.map(d => ({ id: d.id, ...d.data() }));

    // 2. Filtrar o intervalo de datas na memória para movimentos correntes
    const movimentos = todosMovimentos.filter(mov => {
      const data = mov.dataLancamento;
      return data >= dataInicio && data <= dataFim;
    });

    console.log(`[financeiroService] Período: ${dataInicio} a ${dataFim}. Movimentos filtrados: ${movimentos.length}`);

    // 3. Procurar se existe caução para esta entidade
    const qCaucao = query(
      collection(db, 'caucoes'),
      where('entidadeId', '==', entidadeId)
    );
    const snapCaucao = await getDocs(qCaucao);
    let dadosCaucao = null;
    if (!snapCaucao.empty) {
      dadosCaucao = { id: snapCaucao.docs[0].id, ...snapCaucao.docs[0].data() };
    }

    // ✨ Extrair histórico completo de movimentos de caução para o subextrato
    const historicoMovimentosCaucao = todosMovimentos.filter(mov => mov.categoria === 'caucao');

    // 4. Inicialização dos campos do extrato para agregação
    let totalRecebimentosLiquido = 0;
    let totalImpostos = 0;
    let aluguer = 0;
    let taxaGestao = 0;
    let seguro = 0;
    let combustivel = 0;
    let portagens = 0;
    let oficina = 0;
    let debitosGerais = 0;
    let creditosGerais = 0;

    const plataformas = {
      UBER:     { bruto: 0, liquido: 0, impostos: 0 },
      BOLT:     { bruto: 0, liquido: 0, impostos: 0 },
      TRANSFER: { bruto: 0, liquido: 0, impostos: 0 }
    };

    movimentos.forEach(mov => {
      const valor = Number(mov.valor || 0);
      const descLower = (mov.descricao || '').toLowerCase();

      if (mov.tipoMovimento === 'credito') {
        if (mov.categoria === 'plataforma') {
          totalRecebimentosLiquido += valor;
          const plat = mov.plataforma ? mov.plataforma.toUpperCase() : 'TRANSFER';
          if (plataformas[plat]) {
            plataformas[plat].liquido += valor;
            plataformas[plat].bruto += Number(mov.bruto || 0);
            plataformas[plat].impostos += Number(mov.impostos || 0);
            totalImpostos += Number(mov.impostos || 0);
          }
        } else if (mov.categoria === 'caucao') {
          // ✨ EXCLUSÃO: Se for a entrada da caução, não entra no cálculo de créditos correntes do extrato semanal operativo!
          if (descLower.includes('entrada') || descLower.includes('inicial') || descLower.includes('integral') || descLower.includes('depósito de caução')) {
            console.log("[financeiroService] Entrada de caução ignorada no subtotal de créditos semanais correntes.");
          } else {
            // Outros créditos associados (amortizações, bónus, etc.) contam normalmente
            creditosGerais += valor;
          }
        } else {
          creditosGerais += valor;
        }
      } else if (mov.tipoMovimento === 'debito') {
        // Heurística Inteligente: Mapeamento de categorias baseado no texto da descrição
        if (mov.categoria === 'gestao' || descLower.includes('gestão') || descLower.includes('gestao') || descLower.includes('taxa')) {
          taxaGestao += valor;
        } else if (mov.categoria === 'aluguer' || descLower.includes('aluguer') || descLower.includes('viatura') || descLower.includes('renda')) {
          aluguer += valor;
        } else if (mov.categoria === 'seguro' || descLower.includes('seguro')) {
          seguro += valor;
        } else if (mov.categoria === 'combustivel' || descLower.includes('combustivel') || descLower.includes('combustível') || descLower.includes('gasoleo') || descLower.includes('reabastecimento')) {
          combustivel += valor;
        } else if (mov.categoria === 'portagens' || descLower.includes('portagem') || descLower.includes('via verde') || descLower.includes('viaverde') || descLower.includes('scut')) {
          portagens += valor;
        } else if (mov.categoria === 'oficina' || descLower.includes('oficina') || descLower.includes('oficina') || descLower.includes('manutenção') || descLower.includes('manutencao') || descLower.includes('pneu')) {
          oficina += valor;
        } else if (mov.categoria === 'caucao') {
          // Débito corrente de parcela de caução semanal (se for o caso)
          console.log("[financeiroService] Parcela de caução processada no cálculo corrente.");
        } else {
          debitosGerais += valor;
        }
      }
    });

    // 5. Verificar se existe uma parcela de caução prevista para cair neste período específico
    let parcelaCaucaoAplicavel = null;
    if (dadosCaucao && dadosCaucao.status === 'ativa' && dadosCaucao.faseado !== false) {
      parcelaCaucaoAplicavel = (dadosCaucao.planeamento || []).find(p => 
        p.status === 'pendente' &&
        p.dataPrevista >= dataInicio &&
        p.dataPrevista <= dataFim
      );
    }

    return {
      periodo: { inicio: dataInicio, fim: dataFim },
      tipoEntidade,
      totalRecebimentosLiquido: Number(totalRecebimentosLiquido.toFixed(2)),
      totalImpostos:            Number(totalImpostos.toFixed(2)),
      aluguer:                  Number(aluguer.toFixed(2)),
      taxaGestao:               Number(taxaGestao.toFixed(2)),
      seguro:                   Number(seguro.toFixed(2)),
      combustivel:              Number(combustivel.toFixed(2)),
      portagens:                Number(portagens.toFixed(2)),
      oficina:                  oficina,
      debitosGerais:            debitosGerais,
      creditosGerais:           creditosGerais,
      dadosCaucao,
      historicoMovimentosCaucao,
      parcelaCaucaoAplicavel:   parcelaCaucao ? { valor: parcelaCaucao } : null
    };
  } catch (error) {
    console.error('[financeiroService] obterDadosExtratoEntidade:', error);
    return null;
  }
};