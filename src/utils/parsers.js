/**
 * parsers.js
 * Localização: src/utils/parsers.js
 *
 * Utilitários de Extração de Dados e Geração SEPA.
 * [ATUALIZADO]: Suporte híbrido a CSV (texto) e XLSX (Excel) usando SheetJS de forma dinâmica e imune a índices fixos.
 * [ATUALIZADO]: Adicionado suporte resiliente aos cabeçalhos reais da Via Verde ("Nr Equipamen", "Valor T", "Matrícu") 
 *               e suporte a células combinadas de Data e Hora (ex: "27-05-2026 02:15:08").
 */

import * as XLSX from 'xlsx';

/**
 * Converte o input (string ou ArrayBuffer de CSV/Excel) para um array bidimensional de células.
 * 
 * @param {string|ArrayBuffer} input - Dados do ficheiro carregado
 * @returns {Array<Array<any>>} Grelha de linhas e colunas
 */
const converterParaLinhasJSON = (input) => {
  if (!input) return [];
  try {
    let workbook;
    if (input instanceof ArrayBuffer || (typeof input === 'object' && input.byteLength !== undefined)) {
      const data = new Uint8Array(input);
      workbook = XLSX.read(data, { type: 'array' });
    } else if (typeof input === 'string') {
      workbook = XLSX.read(input, { type: 'string' });
    } else {
      return [];
    }
    
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    // Retorna array de arrays (grelha pura sem omissão de células vazias)
    return XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true });
  } catch (err) {
    console.error("[parsers] Erro ao converter folha com SheetJS:", err);
    return [];
  }
};

/**
 * Extrai e normaliza números em formato de texto (com vírgulas ou espaços) de forma segura.
 */
const extrairNumeroSeguro = (val) => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;
  const num = parseFloat(String(val).replace(/\s/g, '').replace(',', '.'));
  return isNaN(num) ? 0 : num;
};

// Função Pura de Higienização para conformidade bancária ISO 20022
const limparStringSEPA = (str) => {
  if (!str) return '';
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[çÇ]/g, "c")
    .replace(/[&]/g, "e")
    .replace(/[^a-zA-Z0-9 ]/g, ""); // Garante apenas alfanuméricos e espaços
};

/**
 * [ATUALIZADO] Algoritmo Resiliente de Reconstituição de Data/Hora da Via Verde
 * Lida de forma inteligente com células contendo data + hora no mesmo campo (ex: "27-05-2026 02:15:08")
 */
const formatarDataHoraViaVerde = (dataVal, horaVal) => {
  if (dataVal === undefined || dataVal === null || dataVal === '') return null;
  
  let dataParte = dataVal;
  let horaParte = horaVal;

  // Se a data for uma string e contiver data + hora num único campo separados por espaço
  if (typeof dataVal === 'string') {
    const trimmed = dataVal.trim();
    if (trimmed.includes(' ')) {
      const subParts = trimmed.split(/\s+/);
      dataParte = subParts[0]; // ex: "27-05-2026"
      if (!horaParte) {
        horaParte = subParts[1]; // ex: "02:15:08"
      }
    }
  }

  // Se o objeto for Date nativo de JavaScript, devolve o ISOString correspondente
  if (dataVal instanceof Date) {
    return dataVal.toISOString();
  }

  // Processamento da Data
  let dataStr = '';
  if (typeof dataParte === 'number') {
    try {
      const dateObj = XLSX.SSF.parse_date_code(dataParte);
      const y = dateObj.y;
      const m = String(dateObj.m).padStart(2, '0');
      const d = String(dateObj.d).padStart(2, '0');
      dataStr = `${y}-${m}-${d}`;
      
      // Se for número decimal (contém fração de hora do Excel) e não houver horaParte
      if (!horaParte && dataParte % 1 !== 0) {
        horaParte = dataParte % 1;
      }
    } catch (e) {
      return null;
    }
  } else {
    // Trata strings como "27/05/2026" ou "27-05-2026"
    const str = String(dataParte).trim().replace(/\//g, '-');
    const parts = str.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY-MM-DD
        dataStr = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      } else {
        // DD-MM-YYYY -> Converte para YYYY-MM-DD
        dataStr = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    } else {
      dataStr = str;
    }
  }

  // Processamento da Hora
  let horaStr = '00:00';
  if (horaVal !== undefined && horaVal !== null && horaVal !== '') {
    if (typeof horaVal === 'number') {
      try {
        const totalSeconds = Math.round(horaVal * 24 * 3600);
        const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
        const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
        horaStr = `${h}:${m}`;
      } catch (e) {
        horaStr = '00:00';
      }
    } else {
      // Trata strings como "02:15:08" ou "02:15"
      const str = String(horaParte).trim();
      const parts = str.split(':');
      if (parts.length >= 2) {
        horaStr = `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
      }
    }
  }

  try {
    const d = new Date(`${dataStr}T${horaStr}`);
    return isNaN(d.getTime()) ? null : d.toISOString();
  } catch (e) {
    return null;
  }
};

export const parseUberCSV = (input) => {
  const rows = converterParaLinhasJSON(input);
  if (rows.length === 0) return {};

  const headers = rows[0].map(h => String(h || '').trim());
  const results = {};

  const colMotorista = headers.indexOf('Nome do motorista');
  const colTarifa = headers.indexOf('Tarifa:Tarifa');
  const colLiquido = headers.indexOf('Pago a si');
  const colGorjetas = headers.indexOf('Os seus rendimentos:Gratificação');
  const colPortagens = headers.indexOf('Saldo da viagem:Reembolsos:Portagem');

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const motorista = row[colMotorista] || row[1];
    if (!motorista) continue;

    if (!results[motorista]) {
      results[motorista] = { bruto: 0, liquido: 0, gorjetas: 0, portagens: 0 };
    }

    results[motorista].bruto += extrairNumeroSeguro(row[colTarifa]);
    results[motorista].liquido += extrairNumeroSeguro(row[colLiquido]);
    results[motorista].gorjetas += extrairNumeroSeguro(row[colGorjetas]);
    results[motorista].portagens += extrairNumeroSeguro(row[colPortagens]);
  }
  return results;
};

export const parseBoltCSV = (input) => {
  const rows = converterParaLinhasJSON(input);
  if (rows.length === 0) return {};

  const headers = rows[0].map(h => String(h || '').trim());
  const results = {};

  const colBruto = headers.indexOf('Gross amount');
  const colLiquido = headers.indexOf('Net amount');
  const colMotorista = headers.indexOf('Driver name');

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const motoristaNome = row[colMotorista] || row[0];
    if (!motoristaNome) continue;

    if (!results[motoristaNome]) {
      results[motoristaNome] = { bruto: 0, liquido: 0 };
    }

    results[motoristaNome].bruto += extrairNumeroSeguro(row[colBruto]);
    results[motoristaNome].liquido += extrairNumeroSeguro(row[colLiquido]);
  }
  return results;
};

/**
 * Analisa e categoriza despesas da Via Verde por matrícula e por Identificador de forma simultânea.
 * [ATUALIZADO]: Resiliência total aos cabeçalhos reais (Ex: "Nr Equipamen", "Valor T", "Matrícu")
 *               e suporte híbrido a datas completas com hora acoplada na mesma célula.
 */
export const parseViaVerdeCSV = (input) => {
  const rows = converterParaLinhasJSON(input);
  if (rows.length === 0) return {};

  const headers = rows[0].map(h => String(h || '').trim().toLowerCase());
  
  // [ATUALIZADO]: Mapeamento flexível por aproximação estrita de sub-palavras dos cabeçalhos reais
  const colMatricula = headers.findIndex(h => h.includes('matrícula') || h.includes('matricula') || h.includes('matrícu') || h.includes('matri'));
  const colValor = headers.findIndex(h => h.includes('valor transação') || h.includes('valor transacao') || h.includes('valor t') || h.includes('valor') || h.includes('líquido') || h.includes('liquido'));
  const colTipo = headers.findIndex(h => h.includes('tipo de ev') || h.includes('tipo de') || h.includes('tipo') || h.includes('descrição') || h.includes('operador') || h.includes('barreira'));
  
  // [ATUALIZADO]: Mapeamento dinâmico para o identificador Via Verde (Nr Equipamen / Equipamento / Aparelho)
  const colIdentificador = headers.findIndex(h => h.includes('identificador') || h.includes('dispositivo') || h.includes('ref. ident') || h.includes('aparelho') || h.includes('equipamen') || h.includes('equipamento') || h.includes('equip'));
  
  const colDataSaida = headers.findIndex(h => h.includes('data saída') || h.includes('data saida') || h.includes('data trans') || h.includes('data sa'));
  const colHoraSaida = headers.findIndex(h => h.includes('hora saída') || h.includes('hora saida') || h.includes('hora trans') || h.includes('hora sa'));
  const colEntrada = headers.findIndex(h => h.includes('entrada') || h.includes('origem') || h.includes('barreira ent'));
  const colSaida = headers.findIndex(h => h.includes('saída') || h.includes('saida') || h.includes('local') || h.includes('destino') || h.includes('barreira sa'));

  // Estruturas de agregação
  const resultsMatricula = {};
  const resultsIdentificador = {};
  const listaTransacoes = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const matriculaOriginal = String(row[colMatricula] || '').trim();
    if (!matriculaOriginal || matriculaOriginal === '--') continue;

    const matriculaChave = matriculaOriginal.replace(/-/g, '').toUpperCase();
    const valor = extrairNumeroSeguro(row[colValor]);
    
    // Extração e normalização estrita do Identificador de Equipamento
    let identificadorFisico = String(row[colIdentificador] || '').replace(/\s/g, '').trim();
    if (!identificadorFisico || identificadorFisico === '--') {
      identificadorFisico = 'SEM_IDENTIFICADOR';
    }

    // Reconstituição cronológica com suporte a junções de strings na mesma célula
    const dataBruta = row[colDataSaida];
    const horaBruta = row[colHoraSaida];
    const dataHoraISO = formatarDataHoraViaVerde(dataBruta, horaBruta);

    // Extração das barreiras geográficas
    const entradaTexto = String(row[colEntrada] || '').trim();
    const saidaTexto = String(row[colSaida] || '').trim();
    const localidadeTexto = saidaTexto || entradaTexto || "Local Desconhecido";

    // Classificação inteligente da categoria
    const linhaTexto = row.map(cell => String(cell || '').toLowerCase()).join(' ');
    let categoria = 'portagem';

    if (
      linhaTexto.includes('mensalidade') || 
      linhaTexto.includes('identificador') || 
      linhaTexto.includes('aluguer') || 
      linhaTexto.includes('tarifa de servico') || 
      linhaTexto.includes('adesao')
    ) {
      categoria = 'mensalidade';
    } else if (
      linhaTexto.includes('parque') || 
      linhaTexto.includes('estacionamento') || 
      linhaTexto.includes('mcdrive') || 
      linhaTexto.includes('parking') || 
      linhaTexto.includes('silo') || 
      linhaTexto.includes('aeroporto')
    ) {
      categoria = 'parque';
    }

    // -------------------------------------------------------------
    // Agregação Clássica (Matrícula) - Mantém compatibilidade 100%
    // -------------------------------------------------------------
    if (!resultsMatricula[matriculaChave]) {
      resultsMatricula[matriculaChave] = {
        matriculaFormatada: matriculaOriginal,
        portagens: 0,
        parques: 0,
        mensalidade: 0,
        totalCirculacao: 0,
        totalGeral: 0
      };
    }

    if (categoria === 'mensalidade') {
      resultsMatricula[matriculaChave].mensalidade += valor;
    } else if (categoria === 'parque') {
      resultsMatricula[matriculaChave].parques += valor;
    } else {
      resultsMatricula[matriculaChave].portagens += valor;
    }

    // -------------------------------------------------------------
    // Agregação Avançada (Identificador)
    // -------------------------------------------------------------
    if (!resultsIdentificador[identificadorFisico]) {
      resultsIdentificador[identificadorFisico] = {
        identificador: identificadorFisico,
        matriculaOriginal: matriculaOriginal,
        portagens: 0,
        parques: 0,
        mensalidade: 0,
        totalGeral: 0
      };
    }

    if (categoria === 'mensalidade') {
      resultsIdentificador[identificadorFisico].mensalidade += valor;
    } else if (categoria === 'parque') {
      resultsIdentificador[identificadorFisico].parques += valor;
    } else {
      resultsIdentificador[identificadorFisico].portagens += valor;
    }

    // -------------------------------------------------------------
    // Registo de Transações Individuais (Delineamento Temporal)
    // -------------------------------------------------------------
    listaTransacoes.push({
      id: `${identificadorFisico}-${i}`,
      identificador: identificadorFisico,
      matricula: matriculaChave,
      matriculaOriginal: matriculaOriginal,
      dataHora: dataHoraISO || new Date().toISOString(),
      tipo: categoria,
      valor: valor,
      local: localidadeTexto,
      detalhes: `Via Verde - ${localidadeTexto} (${categoria.toUpperCase()})`
    });
  }

  // Arredondamentos matemáticos precisos (Matrícula)
  Object.keys(resultsMatricula).forEach(mat => {
    resultsMatricula[mat].portagens = Number(resultsMatricula[mat].portagens.toFixed(2));
    resultsMatricula[mat].parques = Number(resultsMatricula[mat].parques.toFixed(2));
    resultsMatricula[mat].mensalidade = Number(resultsMatricula[mat].mensalidade.toFixed(2));
    resultsMatricula[mat].totalCirculacao = Number((resultsMatricula[mat].portagens + resultsMatricula[mat].parques).toFixed(2));
    resultsMatricula[mat].totalGeral = Number((resultsMatricula[mat].totalCirculacao + resultsMatricula[mat].mensalidade).toFixed(2));
  });

  // Arredondamentos matemáticos precisos (Identificador)
  Object.keys(resultsIdentificador).forEach(id => {
    resultsIdentificador[id].portagens = Number(resultsIdentificador[id].portagens.toFixed(2));
    resultsIdentificador[id].parques = Number(resultsIdentificador[id].parques.toFixed(2));
    resultsIdentificador[id].mensalidade = Number(resultsIdentificador[id].mensalidade.toFixed(2));
    resultsIdentificador[id].totalGeral = Number((resultsIdentificador[id].portagens + resultsIdentificador[id].parques + resultsIdentificador[id].mensalidade).toFixed(2));
  });

  // Ordena a lista de transações por ordem cronológica (Mais antigas para mais recentes)
  listaTransacoes.sort((a, b) => new Date(a.dataHora) - new Date(b.dataHora));

  // ----------------------------------------------------------------------
  // ENGENHARIA DE COMPATIBILIDADE: Propriedades Invisíveis (Não-Enumeráveis)
  // ----------------------------------------------------------------------
  Object.defineProperty(resultsMatricula, 'transacoesDetalhadas', {
    value: listaTransacoes,
    enumerable: false,
    writable: true,
    configurable: true
  });

  Object.defineProperty(resultsMatricula, 'agrupadoPorIdentificador', {
    value: resultsIdentificador,
    enumerable: false,
    writable: true,
    configurable: true
  });

  return resultsMatricula;
};

export const parseCartoesConsumoCSV = (input) => {
  const rows = converterParaLinhasJSON(input);
  if (rows.length === 0) return {};

  const headers = rows[0].map(h => String(h || '').toLowerCase().trim());
  const results = {};
  const colCartao = headers.findIndex(h => h.includes('cart') || h.includes('ref') || h.includes('pan'));
  const colValor = headers.findIndex(h => h.includes('val') || h.includes('total') || h.includes('montante'));

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length <= Math.max(colCartao, colValor)) continue;

    const numCartao = String(row[colCartao] || '').trim();
    const valor = extrairNumeroSeguro(row[colValor]);

    if (numCartao && !isNaN(valor)) {
      results[numCartao] = (results[numCartao] || 0) + valor;
    }
  }
  return results;
};

export const generateSEPAXML = (pagamentos, contaEmpresa) => {
  const msgId = `TVDE-${Date.now()}`;
  const creDtTm = new Date().toISOString().split('.')[0];
  let transactions = '';
  let totalAmount = 0;
  
  pagamentos.forEach((p, index) => {
    if (p.saldoFinal <= 0 || !p.iban) return;
    totalAmount += p.saldoFinal;
    
    const nomeLimpo = limparStringSEPA(p.nomeMotorista);
    const remessaLimpa = limparStringSEPA(`PAGAMENTO TVDE SEMANA`);

    transactions += `
      <CdtTrfTxInf>
        <PmtId><EndToEndId>PAY${Date.now()}${index}</EndToEndId></PmtId>
        <Amt><InstdAmt Ccy="EUR">${p.saldoFinal.toFixed(2)}</InstdAmt></Amt>
        <Cdtr><Nm>${nomeLimpo.substring(0, 70)}</Nm></Cdtr>
        <CdtrAcct><Id><IBAN>${p.iban.replace(/\s/g, '')}</IBAN></Id></CdtrAcct>
        <RmtInf><Ustrd>${remessaLimpa}</Ustrd></RmtInf>
      </CdtTrfTxInf>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>${msgId}</MsgId>
      <CreDtTm>${creDtTm}</CreDtTm>
      <NbOfTxs>${pagamentos.length}</NbOfTxs>
      <CtrlSum>${totalAmount.toFixed(2)}</CtrlSum>
      <InitgPty><Nm>${limparStringSEPA(contaEmpresa.nome)}</Nm></InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>${msgId}</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <NbOfTxs>${pagamentos.length}</NbOfTxs>
      <CtrlSum>${totalAmount.toFixed(2)}</CtrlSum>
      <PmtTpInf><SvcLvl><Cd>SEPA</Cd></SvcLvl></PmtTpInf>
      <ReqdExctnDt>${new Date().toISOString().split('T')[0]}</ReqdExctnDt>
      <Dbtr><Nm>${limparStringSEPA(contaEmpresa.nome)}</Nm></Dbtr>
      <DbtrAcct><Id><IBAN>${contaEmpresa.iban.replace(/\s/g, '')}</IBAN></Id></DbtrAcct>
      <DbtrAgt><FinInstnId><BIC>${contaEmpresa.bic || ''}</BIC></FinInstnId></DbtrAgt>
      ${transactions}
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>`;
};