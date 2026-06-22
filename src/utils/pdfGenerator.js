/**
 * pdfGenerator.js
 * Localização: src/utils/pdfGenerator.js
 *
 * Gerador de PDF profissional em tamanho A4 utilizando jsPDF e jsPDF-AutoTable.
 * Suporta:
 *   - Extratos operacionais semanais de Motoristas, Veículos e Proprietários.
 *   - Relatório consolidado de auditoria e validação de despesas Via Verde.
 * 
 * CORRIGIDO: autoTable compatível com ES Modules e desenho de sublinhas baseado no post-it.
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDatePT, formatCurrency } from './formatters';

/**
 * Função Unificada e Principal para Geração de Extratos (A4 Folha Única)
 * 
 * @param {Object} dados - Estrutura agregada do extrato (retornada por obterDadosExtratoEntidade)
 * @param {Object} empresa - Informações do Operador/Empresa parceira (Fictícia)
 * @param {Object} entidadeInfo - Metadados da entidade (nome, NIF, IBAN)
 * @returns {jsPDF}
 */
export const generateStatementPDF = (dados, empresa, entidadeInfo) => {
  try {
    console.log("[pdfGenerator] A iniciar desenho vetorial do extrato unificado...");

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const margin = 15;
    const azulEscuro = '#1e293b';
    const cinzaClaro = '#f1f5f9';
    const cinzaTexto = '#475569';
    const preto = '#0f172a';

    // --- CABEÇALHO ESQUERDO ---
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(azulEscuro);
    
    let tituloPrincipal = 'Extrato de serviços prestados: Viatura';
    if (dados.tipoEntidade === 'motorista') tituloPrincipal = 'Extrato de serviços prestados: Viatura Própria';
    if (dados.tipoEntidade === 'proprietario') tituloPrincipal = 'Extrato consolidado: Parceiro Operador';
    
    doc.text(tituloPrincipal, margin, 18);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(cinzaTexto);
    
    const labelNome = dados.tipoEntidade === 'veiculo' ? 'Viatura' : 'Motorista';
    doc.text(`${labelNome}: ${entidadeInfo?.nome || '---'}`, margin, 24);
    doc.text(`NIF: ${entidadeInfo?.nif || '---'}`, margin, 29);
    doc.text(`IBAN: ${entidadeInfo?.iban || '---'}`, margin, 34);
    
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(preto);
    
    const dataInicioStr = dados?.periodo?.inicio ? formatDatePT(new Date(dados.periodo.inicio)) : '---';
    const dataFimStr = dados?.periodo?.fim ? formatDatePT(new Date(dados.periodo.fim)) : '---';
    doc.text(`Período de ${dataInicioStr} a ${dataFimStr}`, margin, 41);

    // --- CABEÇALHO DIREITO (Identidade Fictícia: Gestão TVDE) ---
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(21);
    doc.setTextColor(preto);
    doc.text('Gestão', 132, 19);
    doc.setTextColor('#3b82f6'); // Azul TVDE corporativo
    doc.text('TVDE', 159, 19);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(cinzaTexto);
    doc.text(empresa?.endereco || 'Avenida da Liberdade 100, 1250-145 Lisboa', 132, 24);
    doc.text(`NIF: ${empresa?.nif || '500123456'} | IBAN: ${empresa?.iban || 'PT50002312345678901234567'}`, 132, 28);
    doc.text(empresa?.contacto || 'geral@gestaotvde.pt - www.gestaotvde.pt', 132, 32);

    doc.setDrawColor('#e2e8f0');
    doc.setLineWidth(0.4);
    doc.line(margin, 45, 195, 45);

    // --- TABELA PRINCIPAL DE MOVIMENTOS ---
    doc.setFillColor(cinzaClaro);
    doc.rect(margin, 50, 180, 7, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(azulEscuro);
    doc.text('Resultado do período', margin + 3, 54.5);

    const linhasFinanceiras = [
      { label: 'Total de recebimentos líquido (Plataformas)', valor: dados.totalRecebimentosLiquido || 0, sinal: '' },
      { label: 'Créditos / Ajustes Manuais (+)', valor: dados.creditosGerais || 0, sinal: '' },
      { label: 'Total de impostos a descontar (-)', valor: dados.totalImpostos || 0, sinal: '-' },
      { label: 'Aluguer (-)', valor: dados.aluguer || 0, sinal: '-' },
      { label: 'Gestão (-)', valor: dados.taxaGestao || 0, sinal: '-' },
      { label: 'Seguro (-)', valor: dados.seguro || 0, sinal: '-' },
      { label: 'Combustível (-)', valor: dados.combustivel || 0, sinal: '-' },
      { label: 'Portagens / Via Verde (-)', valor: dados.portagens || 0, sinal: '-' },
      { label: 'Oficina / Manutenção (-)', valor: dados.oficina || 0, sinal: '-' },
      { label: 'Caução (-)', valor: dados.valorCaucaoAplicado ?? 0, sinal: '-' },
      { label: 'Outros Débitos / Ajustes (-)', valor: dados.debitosGerais || 0, sinal: '-' }
    ];

    let currentY = 62;
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(preto);

    linhasFinanceiras.forEach((linha) => {
      doc.text(linha.label, margin + 3, currentY);
      const montanteFormatado = `${linha.sinal ? `${linha.sinal} ` : ''}${formatCurrency(linha.valor)}`;
      doc.text(montanteFormatado, 192, currentY, { align: 'right' });

      doc.setDrawColor('#f8fafc');
      doc.line(margin, currentY + 2, 195, currentY + 2);
      currentY += 6.3;
    });

    // --- CÁLCULO DAS SOMAS CONSOLIDADAS ---
    const totalCreditos = (dados.totalRecebimentosLiquido || 0) + (dados.creditosGerais || 0);
    const totalDebitos = 
      (dados.totalImpostos || 0) + 
      (dados.aluguer || 0) + 
      (dados.taxaGestao || 0) + 
      (dados.seguro || 0) + 
      (dados.combustivel || 0) + 
      (dados.portagens || 0) + 
      (dados.oficina || 0) + 
      (dados.valorCaucaoAplicado ?? 0) + 
      (dados.debitosGerais || 0);

    const resultadoSemana = Number((totalCreditos - totalDebitos).toFixed(2));

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    
    // Subtotal de Créditos
    doc.text('Total de Créditos (Rendimentos + Ajustes)', margin + 3, currentY + 1);
    doc.text(formatCurrency(totalCreditos), 192, currentY + 1, { align: 'right' });
    currentY += 6.3;

    // Subtotal de Débitos Totais
    doc.setTextColor('#3b82f6'); // Destaque visual azul corporativo para os débitos totais
    doc.text('Débitos Totais (Soma de despesas e retenções) (-)', margin + 3, currentY + 1);
    doc.text(`- ${formatCurrency(totalDebitos)}`, 192, currentY + 1, { align: 'right' });
    doc.setTextColor(preto);
    currentY += 6.3;

    doc.setDrawColor('#cbd5e1');
    doc.line(margin, currentY, 195, currentY);
    currentY += 5;
    
    doc.setFont('Helvetica', 'bold');
    doc.text('Resultado da Semana', margin + 3, currentY);
    doc.text(formatCurrency(resultadoSemana), 192, currentY, { align: 'right' });

    currentY += 5;
    doc.setFillColor(cinzaClaro);
    doc.rect(margin, currentY, 180, 7, 'F');
    doc.text('Saldo acumulado', margin + 3, currentY + 4.5);
    doc.text(formatCurrency(0), 192, currentY + 4.5, { align: 'right' });

    // --- SECÇÃO DE CAUÇÃO ---
    currentY += 14;
    if (dados.dadosCaucao) {
      const cau = dados.dadosCaucao;
      doc.setDrawColor('#cbd5e1');
      doc.setLineWidth(0.3);
      doc.setFillColor('#f8fafc');
      doc.rect(margin, currentY, 180, 26, 'FD');

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(azulEscuro);
      doc.text('ESTADO DA CAUÇÃO (DEPÓSITO)', margin + 4, currentY + 5.5);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(cinzaTexto);
      
      doc.text(`Valor Total Contratado: ${formatCurrency(cau.valorTotal)}`, margin + 4, currentY + 12);
      doc.text(`Total Amortizado até à data: ${formatCurrency(cau.valorPago)}`, margin + 4, currentY + 17);
      const emFalta = Number((cau.valorTotal - cau.valorPago).toFixed(2));
      doc.text(`Valor Restante: ${formatCurrency(emFalta > 0 ? emFalta : 0)}`, margin + 4, currentY + 22);

      // --- LINHA DIVISÓRIA VERTICAL DO SUBEXTRATO ---
      doc.setDrawColor('#cbd5e1');
      doc.setLineWidth(0.2);
      doc.line(margin + 90, currentY + 2, margin + 90, currentY + 24);

      // Título Direito
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(azulEscuro);
      doc.text('HISTÓRICO & PREVISÕES', margin + 94, currentY + 5.5);

      const subextratoItens = [];
      
      if (dados.historicoMovimentosCaucao && dados.historicoMovimentosCaucao.length > 0) {
        const ordenados = [...dados.historicoMovimentosCaucao].sort((a, b) => b.dataLancamento.localeCompare(a.dataLancamento));
        ordenados.slice(0, 2).forEach(mov => {
          subextratoItens.push({
            data: formatDatePT(new Date(mov.dataLancamento)),
            label: mov.descricao.length > 25 ? mov.descricao.substring(0, 23) + '...' : mov.descricao,
            valor: mov.valor,
            tipo: 'credito'
          });
        });
      }

      if (cau.planeamento && cau.planeamento.length > 0) {
        const pendentes = cau.planeamento.filter(p => p.status === 'pendente');
        pendentes.slice(0, 2).forEach(p => {
          subextratoItens.push({
            data: formatDatePT(new Date(p.dataPrevista)),
            label: `Previsão: Parcela #${p.numeroParcela}`,
            valor: p.valor,
            tipo: 'pendente'
          });
        });
      }

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.2);
      let subextratoY = currentY + 11;

      subextratoItens.slice(0, 3).forEach(item => {
        doc.setTextColor(cinzaTexto);
        doc.text(item.data, margin + 94, subextratoY);
        doc.text(item.label, margin + 114, subextratoY);

        const sinal = item.tipo === 'credito' ? '+' : '-';
        if (item.tipo === 'credito') {
          doc.setTextColor('#10b981');
        } else {
          doc.setTextColor('#3b82f6');
        }
        doc.setFont('Helvetica', 'bold');
        doc.text(`${sinal}${formatCurrency(item.valor)}`, 191, subextratoY, { align: 'right' });
        doc.setFont('Helvetica', 'normal');
        subextratoY += 4.8;
      });
    }

    // --- PLATAFORMAS ---
    currentY += 32;
    const colWidth = 57;
    const colGutter = 4.5;
    const plataformasArray = ['UBER', 'BOLT', 'TRANSFER'];

    plataformasArray.forEach((plat, idx) => {
      const xPos = margin + idx * (colWidth + colGutter);

      doc.setFillColor(cinzaClaro);
      doc.rect(xPos, currentY, colWidth, 6, 'F');
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(azulEscuro);
      doc.text(`Rendimentos ${plat}`, xPos + (colWidth / 2), currentY + 4, { align: 'center' });

      doc.setDrawColor('#e2e8f0');
      doc.rect(xPos, currentY + 6, colWidth, 18, 'D');

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(preto);

      // Segurança em cascata para evitar quebra do PDF se as plataformas forem nulas
      const dadosPlat = (dados?.plataformas && dados.plataformas[plat]) || { bruto: 0, liquido: 0, impostos: 0 };

      doc.text('Bruto', xPos + 3, currentY + 10.5);
      doc.text(formatCurrency(dadosPlat.bruto), xPos + colWidth - 3, currentY + 10.5, { align: 'right' });

      doc.text('Líquido', xPos + 3, currentY + 15.5);
      doc.text(formatCurrency(dadosPlat.liquido), xPos + colWidth - 3, currentY + 15.5, { align: 'right' });

      doc.text('Impostos', xPos + 3, currentY + 20.5);
      doc.text(formatCurrency(dadosPlat.impostos), xPos + colWidth - 3, currentY + 20.5, { align: 'right' });
    });

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(150);
    const rodapeTexto = 'Este documento serve como extrato semanal informativo de prestação de serviços e acertos de contas.';
    doc.text(rodapeTexto, margin, 285);

    // --- DOWNLOAD SEGURO ---
    const nomeLimpo = (entidadeInfo?.nome || 'Extrato').replace(/\s+/g, '_');
    const dataInicioFicheiro = dados?.periodo?.inicio || 'Periodo';
    const nomeFicheiro = `Extrato_${nomeLimpo}_${dataInicioFicheiro}.pdf`;

    console.log(`[pdfGenerator] A tentar guardar o ficheiro fictício: ${nomeFicheiro}`);
    doc.save(nomeFicheiro);
    console.log("[pdfGenerator] Processo concluído.");

  } catch (err) {
    console.error("[pdfGenerator] Erro fatal durante a construção do PDF:", err);
    throw err;
  }
};

/**
 * [REESCRITO]: Desenha a grelha de verificação da Via Verde em A4
 * respeitando de forma exata a estrutura de sublinhas (rowSpan) do seu post-it.
 * 
 * @param {Object} viaVerdeProcessed - Dados estruturados agrupados por matrícula
 * @param {Object} empresa - Configurações da Empresa Operadora
 * @returns {jsPDF}
 */
export const generateViaVerdeValidationPDF = (viaVerdeProcessed, empresa) => {
  try {
    console.log("[pdfGenerator] A iniciar desenho da validação estruturada da Via Verde...");

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const margin = 15;
    const azulEscuro = '#1e293b';
    const cinzaTexto = '#475569';
    const preto = '#0f172a';

    // --- CABEÇALHO ESQUERDO ---
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(azulEscuro);
    doc.text('Reconciliação e Auditoria Via Verde', margin, 18);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(cinzaTexto);
    doc.text(`Data de Emissão: ${new Date().toLocaleDateString('pt-PT')}`, margin, 23);
    doc.text('Relatório semanal estruturado de validação de despesas por matrícula.', margin, 27);

    // --- CABEÇALHO DIREITO ---
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(21);
    doc.setTextColor(preto);
    doc.text('Gestão', 132, 19);
    doc.setTextColor('#3b82f6');
    doc.text('TVDE', 159, 19);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(cinzaTexto);
    doc.text(empresa?.nome || 'OPERADOR TVDE PORTUGAL LDA', 132, 24);
    doc.text(`NIF: ${empresa?.nif || '500123456'}`, 132, 28);
    doc.text(`IBAN: ${empresa?.iban || '---'}`, 132, 32);

    doc.setDrawColor('#e2e8f0');
    doc.setLineWidth(0.4);
    doc.line(margin, 36, 195, 36);

    // Configuração das colunas da tabela de validação
    const columns = [
      { header: 'Matrícula', dataKey: 'matricula' },
      { header: 'Lançamento / Tipo', dataKey: 'descricao' },
      { header: 'Valor Unitário', dataKey: 'unitario' },
      { header: 'Subtotal Circulação', dataKey: 'subtotal' },
      { header: 'Mensalidade', dataKey: 'mensalidade' }
    ];

    const rows = [];
    const chavesMatriculas = Object.keys(viaVerdeProcessed);

    chavesMatriculas.forEach((mat) => {
      const d = viaVerdeProcessed[mat];
      
      // Mapeamento modular de 3 sublinhas com rowSpan idêntico ao papel post-it!
      rows.push([
        { content: d.matriculaFormatada || mat, rowSpan: 3, styles: { valign: 'middle', fontStyle: 'bold', halign: 'center' } },
        'Portagens / Autoestradas',
        formatCurrency(d.portagens),
        { content: formatCurrency(d.totalCirculacao), rowSpan: 2, styles: { valign: 'middle', fontStyle: 'bold', halign: 'right' } },
        { content: d.mensalidade > 0 ? formatCurrency(d.mensalidade) : '---', rowSpan: 3, styles: { valign: 'middle', fontStyle: 'bold', halign: 'right', textColor: '#9333ea' } }
      ]);

      rows.push([
        // Matrícula rowspanned
        'Parques / Estacionamento',
        formatCurrency(d.parques)
        // Subtotal rowspanned
        // Mensalidade rowspanned
      ]);

      rows.push([
        // Matrícula rowspanned
        'Mensalidade Dispositivo / Aluguer',
        formatCurrency(d.mensalidade),
        '---' // Coluna Subtotal na 3.ª linha
        // Mensalidade rowspanned
      ]);
    });

    // Cálculos de Totais Gerais Consolidados para auditoria rápida
    const totalPortagens = Object.values(viaVerdeProcessed).reduce((acc, curr) => acc + curr.portagens, 0);
    const totalParques = Object.values(viaVerdeProcessed).reduce((acc, curr) => acc + curr.parques, 0);
    const totalCirculacao = Object.values(viaVerdeProcessed).reduce((acc, curr) => acc + curr.totalCirculacao, 0);
    const totalMensalidade = Object.values(viaVerdeProcessed).reduce((acc, curr) => acc + curr.mensalidade, 0);

    // Linha final consolidada
    rows.push([
      'TOTAIS CONSOLIDADOS',
      `Portagens: ${formatCurrency(totalPortagens)} | Parques: ${formatCurrency(totalParques)}`,
      '---',
      formatCurrency(totalCirculacao),
      formatCurrency(totalMensalidade)
    ]);

    // Executa a injeção modular via ESM (importação estrita)
    autoTable(doc, {
      columns,
      body: rows,
      startY: 42,
      margin: { left: margin, right: margin },
      theme: 'striped',
      styles: {
        fontSize: 8,
        font: 'Helvetica',
        cellPadding: 3,
        valign: 'middle'
      },
      headStyles: {
        fillColor: '#1e293b',
        textColor: '#ffffff',
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        matricula: { fontStyle: 'bold', halign: 'left' },
        descricao: { halign: 'left' },
        unitario: { halign: 'right' },
        subtotal: { fontStyle: 'bold', halign: 'right' },
        mensalidade: { fontStyle: 'bold', halign: 'right' }
      },
      didParseCell: function (data) {
        // Estilização customizada da linha final de Totais Consolidados (Rodapé cinzento)
        if (data.row.index === rows.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = '#cbd5e1'; // Cor de destaque
          data.cell.styles.textColor = '#0f172a';
          // Para as células normais da última linha, desativa rowSpan para compatibilidade
          if (data.column.index === 0) {
            data.cell.colSpan = 1;
          }
        }
      }
    });

    // Rodapé Normativo
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(150);
    doc.text('Este documento serve exclusivamente como relatório de validação e conciliação interna de despesas de circulação.', margin, 285);

    return doc;

  } catch (error) {
    console.error("[pdfGenerator] Erro ao gerar PDF de reconciliação Via Verde:", error);
    throw error;
  }
};

/**
 * Converte de forma adaptativa os dados processados na grelha de fecho semanal
 * para o gerador unificado de PDF, eliminando vulnerabilidades de NaN [2, 3].
 */
export const generateDriverPDF = (dados, empresa) => {
  const { ...entidadeInfo } = {
    nome: dados.nomeMotorista,
    nif: dados.nif || '---',
    iban: dados.iban || '---'
  };

  // CORRIGIDO: Coalescência nula (?.) e fallbacks (|| 0) robustos para evitar NaN e omissão de créditos [2, 3]
  const modelacaoDados = {
    periodo: dados.periodo || { inicio: new Date().toISOString(), fim: new Date().toISOString() },
    tipoEntidade: 'motorista',
    totalRecebimentosLiquido: Number((dados.uber?.liquido || 0) + (dados.bolt?.liquido || 0)),
    totalImpostos: Number((dados.uber?.impostos || 0) + (dados.bolt?.impostos || 0)),
    aluguer: Number(dados.despesas?.aluguer || dados.despesas?.custosFixos || 0),
    taxaGestao: Number(dados.despesas?.gestao || dados.despesas?.taxaGestao || 0),
    seguro: Number(dados.despesas?.seguro || 0),
    combustivel: Number(dados.despesas?.combustivel || 0),
    portagens: Number(dados.despesas?.viaVerde || dados.despesas?.portagens || 0),
    oficina: Number(dados.despesas?.oficina || 0),
    debitosGerais: Number(dados.despesas?.debitosGerais || dados.contaCorrente?.debitos || 0),
    creditosGerais: Number(dados.creditosGerais || dados.contaCorrente?.creditos || 0),
    valorCaucaoAplicado: Number(dados.despesas?.caucao || 0),
    dadosCaucao: dados.dadosCaucao || null,
    plataformas: {
      UBER: { bruto: dados.uber?.bruto || 0, liquido: dados.uber?.liquido || 0, impostos: dados.uber?.impostos || 0 },
      BOLT: { bruto: dados.bolt?.bruto || 0, liquido: dados.bolt?.liquido || 0, impostos: dados.bolt?.impostos || 0 },
      TRANSFER: { bruto: 0, liquido: 0, impostos: 0 }
    }
  };

  return generateStatementPDF(modelacaoDados, empresa, entidadeInfo);
};