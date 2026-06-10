/**
 * Utilitários de Extração de Dados e Geração SEPA
 */

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

export const parseUberCSV = (csvText) => {
  const lines = csvText.split('\n');
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
  const results = {};
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',').map(c => c.replace(/"/g, '').trim());
    if (row.length < headers.length) continue;
    const motorista = row[headers.indexOf('Nome do motorista')] || row[1];
    if (!motorista) continue;
    if (!results[motorista]) results[motorista] = { bruto: 0, liquido: 0, gorjetas: 0, portagens: 0 };
    results[motorista].bruto += parseFloat(row[headers.indexOf('Tarifa:Tarifa')] || 0);
    results[motorista].liquido += parseFloat(row[headers.indexOf('Pago a si')] || 0);
    results[motorista].gorjetas += parseFloat(row[headers.indexOf('Os seus rendimentos:Gratificação')] || 0);
    results[motorista].portagens += parseFloat(row[headers.indexOf('Saldo da viagem:Reembolsos:Portagem')] || 0);
  }
  return results;
};

export const parseBoltCSV = (csvText) => {
  const lines = csvText.split('\n');
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
  const results = {};
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',').map(c => c.replace(/"/g, '').trim());
    if (row.length < headers.length) continue;
    const motorista = row[headers.indexOf('Driver name')] || row[0];
    if (!motorista) continue;
    if (!results[motorista]) results[motorista] = { bruto: 0, liquido: 0 };
    results[motorista].bruto += parseFloat(row[headers.indexOf('Gross amount')] || 0);
    results[motorista].liquido += parseFloat(row[headers.indexOf('Net amount')] || 0);
  }
  return results;
};

export const parseViaVerdeCSV = (csvText) => {
  const lines = csvText.split('\n');
  const results = {};
  lines.forEach((line, index) => {
    if (index === 0) return;
    const row = line.split(';');
    if (row.length < 5) return;
    const matricula = row[2]?.replace(/-/g, '').trim();
    const valor = parseFloat(row[4]?.replace(',', '.'));
    if (matricula && !isNaN(valor)) {
      results[matricula] = (results[matricula] || 0) + valor;
    }
  });
  return results;
};

export const parseCartoesConsumoCSV = (csvText) => {
  const lines = csvText.split('\n');
  const headers = lines[0].toLowerCase().split(/[;,]/);
  const results = {};
  const colCartao = headers.findIndex(h => h.includes('cart') || h.includes('ref') || h.includes('pan'));
  const colValor = headers.findIndex(h => h.includes('val') || h.includes('total') || h.includes('montante'));
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(/[;,]/);
    if (row.length <= Math.max(colCartao, colValor)) continue;
    const numCartao = row[colCartao]?.trim();
    const valor = parseFloat(row[colValor]?.replace(',', '.').trim());
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