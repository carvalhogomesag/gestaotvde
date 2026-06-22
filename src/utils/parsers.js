/**
 * parsers.js
 * Localização: src/utils/parsers.js
 *
 * Utilitários de Extração de Dados e Geração SEPA.
 * [ATUALIZADO]: Suporte híbrido a CSV (texto) e XLSX (Excel) usando SheetJS de forma dinâmica e imune a índices fixos!
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
 * Analisa e categoriza despesas da Via Verde por matrícula (Portagem, Parque e Mensalidade)
 * em conformidade com o layout desenhado no post-it do utilizador.
 * [ATUALIZADO]: Mapeamento flexível por cabeçalhos (Nomes de Colunas) resolvendo erros de colunas deslocadas.
 * 
 * @param {string|ArrayBuffer} input - Conteúdo bruto (CSV) ou binário (Excel) do extrato Via Verde
 * @returns {Object} Estrutura consolidada agrupada por matrícula
 */
export const parseViaVerdeCSV = (input) => {
  const rows = converterParaLinhasJSON(input);
  if (rows.length === 0) return {};

  const headers = rows[0].map(h => String(h || '').trim().toLowerCase());
  
  // Deteção dinâmica dos índices baseada nos cabeçalhos reais (conforme imagem do Excel)
  const colMatricula = headers.findIndex(h => h.includes('matrícula') || h.includes('matricula'));
  const colValor = headers.findIndex(h => h.includes('valor transação') || h.includes('valor transacao') || h.includes('valor') || h.includes('líquido') || h.includes('liquido'));
  const colTipo = headers.findIndex(h => h.includes('tipo de ev') || h.includes('tipo') || h.includes('descrição') || h.includes('operador') || h.includes('barreira'));

  const results = {};

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const matriculaOriginal = String(row[colMatricula] || '').trim();
    if (!matriculaOriginal || matriculaOriginal === '--') continue;

    const matriculaChave = matriculaOriginal.replace(/-/g, '').toUpperCase();
    const valor = extrairNumeroSeguro(row[colValor]);

    // Inicialização da estrutura da matrícula se ainda não existir
    if (!results[matriculaChave]) {
      results[matriculaChave] = {
        matriculaFormatada: matriculaOriginal, // Guarda a grafia original (ex: BI-49-FP)
        portagens: 0,
        parques: 0,
        mensalidade: 0,
        totalCirculacao: 0, // Portagens + Parques
        totalGeral: 0       // Portagens + Parques + Mensalidade
      };
    }

    // Varredura de classificação inteligente em toda a linha para robustez
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

    // Acumula os valores por categoria
    if (categoria === 'mensalidade') {
      results[matriculaChave].mensalidade += valor;
    } else if (categoria === 'parque') {
      results[matriculaChave].parques += valor;
    } else {
      results[matriculaChave].portagens += valor;
    }
  }

  // Arredonda todos os subtotais para 2 casas decimais no final
  Object.keys(results).forEach(mat => {
    results[mat].portagens = Number(results[mat].portagens.toFixed(2));
    results[mat].parques = Number(results[mat].parques.toFixed(2));
    results[mat].mensalidade = Number(results[mat].mensalidade.toFixed(2));
    results[mat].totalCirculacao = Number((results[mat].portagens + results[mat].parques).toFixed(2));
    results[mat].totalGeral = Number((results[mat].totalCirculacao + results[mat].mensalidade).toFixed(2));
  });

  return results;
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
    
    // Aplicação da higienização nos campos críticos
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