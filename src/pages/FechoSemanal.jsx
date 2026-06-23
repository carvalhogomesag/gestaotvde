/**
 * FechoSemanal.jsx
 * Localização: src/pages/FechoSemanal.jsx
 *
 * Processador de fecho financeiro semanal (Upload de CSVs e Geração de SEPA/PDF).
 * [ATUALIZADO]: Passagem de coleções do Firestore para o gerador de PDF permitindo rastreabilidade temporal de motoristas por transponder.
 */

import React, { useState, useEffect } from 'react';
import { 
  UploadCloud, FileSpreadsheet, Calculator, 
  CheckCircle2, Download, ArrowRight, Loader2, Banknote, Fuel, Zap, FileText,
  PlusCircle, MinusCircle, Lock, Radio
} from 'lucide-react';
import { db } from '../firebase';
import { 
  collection, getDocs, addDoc, query, where, writeBatch, doc 
} from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { logAcaoGlobal } from '../utils/logger';
import { formatCurrency } from '../utils/formatters';
import { 
  parseUberCSV, parseBoltCSV, parseViaVerdeCSV, 
  parseCartoesConsumoCSV, generateSEPAXML 
} from '../utils/parsers';
import { generateDriverPDF, generateViaVerdeValidationPDF } from '../utils/pdfGenerator';
import Button from '../components/ui/Button';

export default function FechoSemanal() {
  const { userData, loading: authLoading } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Dados do Firestore
  const [motoristasDB, setMotoristasDB] = useState([]);
  const [veiculosDB, setVeiculosDB] = useState([]);
  const [cartoesDB, setCartoesDB] = useState([]);
  const [viaVerdeDB, setViaVerdeDB] = useState([]); // Stock de aparelhos e histórico de atribuições
  
  // Dados Processados
  const [dadosProcessados, setDadosProcessados] = useState([]);
  const [viaVerdeProcessed, setViaVerdeProcessed] = useState({}); // Estado para auditoria em lote
  
  // Ficheiros (armazenar strings ou ArrayBuffers de Excel)
  const [files, setFiles] = useState({ 
    uber: null, bolt: null, viaverde: null, combustivel: null, eletrico: null 
  });

  // Configuração da Empresa
  const empresaConfig = {
    nome: "OPERADOR TVDE PORTUGAL LDA",
    nif: "500123456",
    iban: "PT50000000000000000000000",
    bic: "BCCCPTPT"
  };

  useEffect(() => {
    // Só carrega os dados se for admin
    if (userData?.role === 'admin') {
      const loadBaseData = async () => {
        const [mSnap, vSnap, cSnap, vvSnap] = await Promise.all([
          getDocs(collection(db, "motoristas")),
          getDocs(collection(db, "veiculos")),
          getDocs(collection(db, "cartoes")),
          getDocs(collection(db, "viaverde_aparelhos"))
        ]);
        setMotoristasDB(mSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setVeiculosDB(vSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setCartoesDB(cSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setViaVerdeDB(vvSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      };
      loadBaseData();
    }
  }, [userData]);

  // BLOQUEIO DE SEGURANÇA: Se não for admin, mostra ecrã de erro
  if (!authLoading && userData?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center animate-in fade-in duration-500">
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4 shadow-sm">
          <Lock size={40} />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">Acesso Restrito</h2>
        <p className="text-slate-500 max-w-sm mx-auto text-sm">
          Apenas o Diretor tem permissão para aceder e processar o fecho financeiro semanal.
        </p>
        <Button variant="secondary" className="mt-6" onClick={() => window.location.href = '/'}>
          Voltar ao Dashboard
        </Button>
      </div>
    );
  }

  /**
   * Leitor híbrido com suporte a leitura de binários (Excel) ou texto simples (CSV)
   */
  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

      reader.onload = (event) => {
        setFiles(prev => ({ ...prev, [type]: event.target.result }));
      };

      if (isExcel) {
        reader.readAsArrayBuffer(file);
      } else {
        reader.readAsText(file);
      }
    }
  };

  /**
   * Executa o processamento e a exportação direta do PDF de auditoria Via Verde
   * no Passo 1, cruzando em tempo real com a base de dados de aparelhos e frotas.
   */
  const exportarApenasViaVerde = () => {
    if (!files.viaverde) return;
    try {
      const viaVerdeData = parseViaVerdeCSV(files.viaverde);
      
      // [ATUALIZADO] Passamos as coleções do Firestore para auditoria cronológica em lote antes de gerar o PDF
      const docPdf = generateViaVerdeValidationPDF(viaVerdeData, empresaConfig, viaVerdeDB, veiculosDB);
      
      docPdf.save(`Validacao_ViaVerde_Avulsa_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error("Erro ao gerar PDF de auditoria avulsa:", error);
      alert("Não foi possível processar o PDF da Via Verde. Verifique se o ficheiro importado está correto.");
    }
  };

  const processarSemana = async () => {
    setLoading(true);
    try {
      const uberData = files.uber ? parseUberCSV(files.uber) : {};
      const boltData = files.bolt ? parseBoltCSV(files.bolt) : {};
      const viaVerdeData = files.viaverde ? parseViaVerdeCSV(files.viaverde) : {};
      const combustivelData = files.combustivel ? parseCartoesConsumoCSV(files.combustivel) : {};
      const eletricoData = files.eletrico ? parseCartoesConsumoCSV(files.eletrico) : {};

      // Guarda os dados processados da Via Verde para o painel de auditoria do Passo 2
      setViaVerdeProcessed(viaVerdeData);

      // Busca movimentos financeiros pendentes no Firestore [2]
      const qMov = query(collection(db, "movimentos_financeiros"), where("pagoNoFechoId", "==", ""));
      const movSnap = await getDocs(qMov);
      const todosMovimentos = movSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Mapa para acumulação e distribuição inteligente de Portagens/Parques por Motorista
      const distribuicaoPortagens = {};
      motoristasDB.forEach(m => {
        distribuicaoPortagens[m.id] = {
          portagensAtivas: 0,
          portagensRetroativas: 0,
          retroativasList: [] // Detalhes individuais para justificação de lançamentos manuais
        };
      });

      // ALGORITMO DE AUDITORIA CRONOLÓGICA DE VIA VERDE (INTERSECÇÃO DE POSSE)
      const transacoesDetalhadas = viaVerdeData.transacoesDetalhadas || [];
      
      transacoesDetalhadas.forEach(tx => {
        let motoristaResponsavelId = null;
        let nomeMotoristaResponsavel = null;
        let isAtiva = false;

        // 1. Procurar o transponder correspondente no nosso stock
        const dispositivo = viaVerdeDB.find(vv => 
          vv.numeroAparelho === tx.identificador || 
          vv.id === tx.identificador
        );

        if (dispositivo && dispositivo.historico) {
          const txTime = new Date(tx.dataHora).getTime();

          // Procurar na timeline de atribuições qual o motorista detinha o aparelho naquele instante
          const atribuicaoCorrespondente = dispositivo.historico.find(h => {
            if (h.tipo !== 'atribuicao') return false;
            const start = new Date(h.dataInicio).getTime();
            const end = h.dataFim ? new Date(h.dataFim).getTime() : null;
            return txTime >= start && (end === null || txTime <= end);
          });

          if (atribuicaoCorrespondente) {
            motoristaResponsavelId = atribuicaoCorrespondente.motoristaId;
            nomeMotoristaResponsavel = atribuicaoCorrespondente.nomeMotorista;
            isAtiva = (atribuicaoCorrespondente.dataFim === null); // Ativa se não houver data de término
          }
        }

        // 2. FALLBACK INTELIGENTE: Se o aparelho não foi mapeado manualmente no histórico,
        // cruza o débito com o motorista habitual associado à matrícula do carro
        if (!motoristaResponsavelId) {
          const veiculo = veiculosDB.find(v => v.matricula.replace(/-/g, '').toUpperCase() === tx.matricula);
          if (veiculo) {
            motoristaResponsavelId = veiculo.motoristaId;
            nomeMotoristaResponsavel = veiculo.motoristaNome;
            isAtiva = true; // Cai no fluxo regular semanal por defeito
          }
        }

        // 3. Acumular os valores conforme a tipologia de responsabilidade
        if (motoristaResponsavelId && distribuicaoPortagens[motoristaResponsavelId]) {
          if (tx.tipo === 'portagem' || tx.tipo === 'parque') {
            if (isAtiva) {
              distribuicaoPortagens[motoristaResponsavelId].portagensAtivas += tx.valor;
            } else {
              distribuicaoPortagens[motoristaResponsavelId].portagensRetroativas += tx.valor;
              distribuicaoPortagens[motoristaResponsavelId].retroativasList.push({
                valor: tx.valor,
                local: tx.local,
                dataHora: tx.dataHora,
                identificador: tx.identificador,
                tipo: tx.tipo
              });
            }
          }
        }
      });

      const consolidado = motoristasDB.map(m => {
        const u = uberData[m.nome] || { bruto: 0, liquido: 0, gorjetas: 0, portagens: 0 };
        const b = boltData[m.nome] || { bruto: 0, liquido: 0 };
        const veiculo = veiculosDB.find(v => v.motoristaId === m.id);
        
        // Extraímos as contas calculadas pelo nosso motor de intersecção temporal
        const mPortagens = distribuicaoPortagens[m.id] || { portagensAtivas: 0, portagensRetroativas: 0, retroativasList: [] };
        const portagemAtivaFinal = mPortagens.portagensAtivas;
        const portagemRetroativaFinal = mPortagens.portagensRetroativas;

        // Processamento de Combustível / Energia via Cartões (CSV) [2]
        let totalCombustivelCSV = 0;
        let totalEletricoCSV = 0;
        cartoesDB.filter(c => c.veiculoId === veiculo?.id).forEach(c => {
          if (c.tipo === 'combustivel') totalCombustivelCSV += (combustivelData[c.numero] || 0);
          if (c.tipo === 'eletrico') totalEletricoCSV += (eletricoData[c.numero] || 0);
        });

        const movsEntidade = todosMovimentos.filter(mov => 
          mov.entidadeId === m.id || (veiculo && mov.entidadeId === veiculo.id)
        );

        // Identifica se existem despesas fixas registadas na base de dados (Manual ou IA) [2]
        const movPortagemDB = movsEntidade.find(mov => mov.categoria === 'portagens');
        const movAbastecimentoDB = movsEntidade.find(mov => mov.categoria === 'abastecimento');

        // LÓGICA DE PRECEDÊNCIA: Lançamentos dedicados na DB sobrepõem os CSVs [2]
        const portagemFinal = movPortagemDB ? movPortagemDB.valor : portagemAtivaFinal;
        const abastecimentoFinal = movAbastecimentoDB ? movAbastecimentoDB.valor : (totalCombustivelCSV + totalEletricoCSV);

        const totalCreditosManuais = movsEntidade
          .filter(mov => mov.tipoMovimento === 'credito')
          .reduce((acc, curr) => acc + curr.valor, 0);

        // EXCLUSÃO CRÍTICA: Remove as categorias dedicadas da soma genérica de débitos para evitar dupla dedução [2]
        const totalDebitosManuais = movsEntidade
          .filter(mov => mov.tipoMovimento === 'debito' && mov.categoria !== 'abastecimento' && mov.categoria !== 'portagens')
          .reduce((acc, curr) => acc + curr.valor, 0);

        const liqPlataformas = u.liquido + b.liquido;
        const custosFixos = 125.00; // Taxa operacional semanal padrão

        const ganhosTotais = liqPlataformas + u.portagens + totalCreditosManuais;
        
        // O valor retroativo é deduzido como uma despesa na semana corrente
        const despesasTotais = portagemFinal + portagemRetroativaFinal + abastecimentoFinal + custosFixos + totalDebitosManuais;

        return {
          motoristaId: m.id,
          nomeMotorista: m.nome,
          iban: m.iban,
          uber: u,
          bolt: b,
          movimentosIds: movsEntidade.map(mov => mov.id),
          portagensRetroativasList: mPortagens.retroativasList, // Guardamos para criar os movimentos físicos na finalização
          contaCorrente: { creditos: totalCreditosManuais, debitos: totalDebitosManuais },
          despesas: { 
            viaVerde: portagemFinal, 
            viaVerdeRetroativas: portagemRetroativaFinal, // Exposição clara para UI e PDF de extrato
            combustivel: abastecimentoFinal, 
            eletrico: 0, 
            custosFixos: custosFixos 
          },
          ajustes: 0,
          saldoFinal: ganhosTotais - despesasTotais
        };
      }).filter(d => d.uber.bruto > 0 || d.bolt.bruto > 0 || d.contaCorrente.creditos > 0 || d.contaCorrente.debitos > 0 || d.despesas.viaVerdeRetroativas > 0);

      setDadosProcessados(consolidado);
      setStep(2);
    } catch (error) {
      console.error("Erro no processamento:", error);
      alert("Erro ao processar dados.");
    } finally {
      setLoading(false);
    }
  };

  const finalizarSemana = async () => {
    setLoading(true);
    const batch = writeBatch(db);
    try {
      for (const item of dadosProcessados) {
        const fechoRef = doc(collection(db, "fechos_semanais"));
        
        batch.set(fechoRef, {
          ...item,
          dataFecho: new Date().toISOString(),
          processadoPor: userData.nome,
          pago: false
        });

        item.movimentosIds.forEach(movId => {
          const movRef = doc(db, "movimentos_financeiros", movId);
          batch.update(movRef, { pagoNoFechoId: fechoRef.id });
        });

        // CRIAÇÃO AUTOMÁTICA DE LANÇAMENTOS DE VIA VERDE RETROATIVA NO HISTÓRICO DO MOTORISTA
        if (item.portagensRetroativasList && item.portagensRetroativasList.length > 0) {
          item.portagensRetroativasList.forEach(pRetro => {
            const novoMovRef = doc(collection(db, "movimentos_financeiros"));
            const dataPassagem = new Date(pRetro.dataHora).toLocaleDateString('pt-PT');
            
            const descCompleta = `[VIA VERDE RETROATIVA] Débito de ${pRetro.tipo.toUpperCase()} em ${dataPassagem} - ${pRetro.local} (Aparelho: ${pRetro.identificador})`;

            batch.set(novoMovRef, {
              entidadeId: item.motoristaId,
              tipoEntidade: "motorista",
              tipoMovimento: "debito",
              valor: pRetro.valor,
              descricao: descCompleta,
              dataLancamento: new Date().toISOString().split('T')[0],
              pagoNoFechoId: fechoRef.id, 
              criadoPor: "Auditoria Temporal Via Verde",
              dataCriacao: new Date().toISOString()
            });
          });
        }
      }
      
      await batch.commit();
      await logAcaoGlobal(userData.nome, "Finalização de Fecho", "Financeiro", `Semana ${new Date().toLocaleDateString()}`, "BATCH");
      setStep(3);
    } catch (error) {
      console.error("Erro ao finalizar lote:", error);
      alert("Erro ao finalizar semana.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDFs = () => {
    dadosProcessados.forEach(d => {
      const docPdf = generateDriverPDF(d, empresaConfig);
      docPdf.save(`Extrato_${d.nomeMotorista.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
    });
  };

  const downloadSEPA = () => {
    const xml = generateSEPAXML(dadosProcessados, empresaConfig);
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SEPA_TVDE_${new Date().toISOString().split('T')[0]}.xml`;
    a.click();
  };

  const handleDownloadViaVerdePDF = () => {
    // [ATUALIZADO] Passamos o histórico Firestore para a geração finalizada de auditoria
    const docPdf = generateViaVerdeValidationPDF(viaVerdeProcessed, empresaConfig, viaVerdeDB, veiculosDB);
    docPdf.save(`Validacao_ViaVerde_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const chavesViaVerde = Object.keys(viaVerdeProcessed);

  return (
    <div className="space-y-6 sm:space-y-8 pb-20 text-left">
      <header>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-3">
          <Calculator className="text-tvde-primary" /> Fecho de Semana
        </h1>
        <p className="text-slate-500 text-xs sm:text-sm">Consolidação de rendimentos e conta corrente.</p>
      </header>

      {step === 1 && (
        <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <UploadBox title="UBER" icon={UploadCloud} color="blue" onChange={(e) => handleFileChange(e, 'uber')} ready={!!files.uber} />
            <UploadBox title="BOLT" icon={UploadCloud} color="green" onChange={(e) => handleFileChange(e, 'bolt')} ready={!!files.bolt} />
            
            <UploadBox title="VIA VERDE" icon={FileSpreadsheet} color="purple" onChange={(e) => handleFileChange(e, 'viaverde')} ready={!!files.viaverde}>
              {files.viaverde && (
                <Button 
                  type="button"
                  onClick={exportarApenasViaVerde}
                  className="bg-purple-600 hover:bg-purple-700 text-[10px] font-black h-8 uppercase justify-center shadow-sm select-none animate-in fade-in duration-200 mt-2"
                >
                  <Download size={11} /> Validar PDF
                </Button>
              )}
            </UploadBox>

            <UploadBox title="PRIO/GALP" icon={Fuel} color="orange" onChange={(e) => handleFileChange(e, 'combustivel')} ready={!!files.combustivel} />
            <UploadBox title="MIIO/ZAP" icon={Zap} color="yellow" onChange={(e) => handleFileChange(e, 'eletrico')} ready={!!files.eletrico} />
          </div>
          <div className="flex justify-center">
            <Button onClick={processarSemana} disabled={loading} className="h-14 sm:h-16 w-full sm:w-auto px-12 text-sm sm:text-lg shadow-2xl justify-center">
              {loading ? <Loader2 className="animate-spin mr-2" /> : 'Processar Fecho Completo'}
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-8 animate-in fade-in zoom-in-95">
          
          {/* TABELA PRINCIPAL DE FECHO (MOTORISTAS) */}
          <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] border border-slate-200 shadow-sm overflow-x-auto w-full custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[750px]">
              <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <tr>
                  <th className="p-5">Motorista</th>
                  <th className="p-5 text-center">Líquido Apps</th>
                  <th className="p-5 text-center text-tvde-accent">Créditos (+)</th>
                  <th className="p-5 text-center text-tvde-danger">Débitos (-)</th>
                  <th className="p-5 text-center">Consumos/VV</th>
                  <th className="p-5 text-right">Saldo Final</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {dadosProcessados.map((d) => (
                  <tr key={d.motoristaId} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-5">
                      <p className="font-bold text-slate-800">{d.nomeMotorista}</p>
                      <p className="text-[9px] text-slate-400 font-mono uppercase tracking-tighter">Ref: {d.motoristaId.substring(0,8)}</p>
                    </td>
                    <td className="p-5 text-center font-bold text-green-600">{formatCurrency(d.uber.liquido + d.bolt.liquido)}</td>
                    <td className="p-5 text-center">
                      <span className="flex items-center justify-center gap-1 text-tvde-accent font-bold">
                        <PlusCircle size={12} /> {formatCurrency(d.contaCorrente.creditos)}
                      </span>
                    </td>
                    <td className="p-5 text-center">
                      <span className="flex items-center justify-center gap-1 text-tvde-danger font-bold">
                        <MinusCircle size={12} /> {formatCurrency(d.contaCorrente.debitos)}
                      </span>
                    </td>
                    <td className="p-5 text-center text-slate-500 font-medium space-y-1">
                      <div>-{formatCurrency(d.despesas.combustivel + d.despesas.viaVerde + d.despesas.custosFixos)}</div>
                      
                      {d.despesas.viaVerdeRetroativas > 0 && (
                        <div className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full text-[9px] font-black border border-amber-100">
                          <Radio size={8} className="animate-pulse" />
                          {formatCurrency(d.despesas.viaVerdeRetroativas)} Retroativo
                        </div>
                      )}
                    </td>
                    <td className="p-5 text-right">
                      <span className={`px-4 py-2 rounded-xl font-black text-sm ${d.saldoFinal >= 0 ? 'bg-slate-800 text-white' : 'bg-red-100 text-red-600'}`}>
                        {formatCurrency(d.saldoFinal)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* PAINEL DE AUDITORIA DE VIA VERDE */}
          {chavesViaVerde.length > 0 && (
            <div className="bg-white p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-slate-200 shadow-sm text-left space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                    <FileSpreadsheet className="text-purple-600" size={18} /> Auditoria Detalhada Via Verde
                  </h3>
                  <p className="text-xs text-slate-400">Verificação estruturada de passagens, portagens e mensalidades por matrícula.</p>
                </div>
                <Button 
                  onClick={handleDownloadViaVerdePDF}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-black uppercase h-9 px-3 gap-1.5 shadow-sm"
                >
                  <Download size={14} /> Descarregar Auditoria (PDF)
                </Button>
              </div>

              <div className="overflow-x-auto w-full custom-scrollbar">
                <table className="w-full text-left border-collapse text-xs min-w-[650px]">
                  <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <tr>
                      <th className="p-5">Matrícula</th>
                      <th className="p-5">Lançamento / Tipo</th>
                      <th className="p-5 text-right">Valor Unitário</th>
                      <th className="p-5 text-right">Subtotal Circulação</th>
                      <th className="p-5 text-right">Mensalidade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {chavesViaVerde.map((mat) => {
                      const dados = viaVerdeProcessed[mat];
                      return (
                        <React.Fragment key={mat}>
                          {/* Sub-Linha 1: Portagem */}
                          <tr className="hover:bg-slate-50/50 font-medium">
                            <td className="p-4 font-black text-slate-800" rowSpan={3}>
                              <span className="bg-slate-800 text-white text-[10px] font-mono font-black px-2 py-1 rounded shadow-sm">
                                {dados.matriculaFormatada || mat}
                              </span>
                            </td>
                            <td className="p-4 pl-6 text-slate-500">Portagens / Concessionárias</td>
                            <td className="p-4 text-right text-slate-600 font-bold">{formatCurrency(dados.portagens)}</td>
                            <td className="p-4 text-right font-black text-slate-800 text-sm" rowSpan={2}>
                              {formatCurrency(dados.totalCirculacao)}
                            </td>
                            <td className="p-4 text-right font-black text-slate-600" rowSpan={3}>
                              {dados.mensalidade > 0 ? (
                                <span className="text-purple-600 bg-purple-50 px-2.5 py-1 rounded-xl font-bold">
                                  {formatCurrency(dados.mensalidade)}
                                </span>
                              ) : (
                                <span className="text-slate-300 italic">---</span>
                              )}
                            </td>
                          </tr>
                          {/* Sub-Linha 2: Parque */}
                          <tr className="hover:bg-slate-50/50 font-medium">
                            <td className="p-4 pl-6 text-slate-500">Parques / Estacionamentos</td>
                            <td className="p-4 text-right text-slate-600 font-bold">{formatCurrency(dados.parques)}</td>
                          </tr>
                          {/* Sub-Linha 3: Mensalidade */}
                          <tr className="hover:bg-slate-50/50 font-medium bg-slate-50/20">
                            <td className="p-4 pl-6 text-slate-400 italic">Mensalidade Dispositivo / Aluguer</td>
                            <td className="p-4 text-right text-slate-400 italic">{formatCurrency(dados.mensalidade)}</td>
                            <td className="p-4 text-right text-slate-300">---</td>
                          </tr>
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TOTALIZADOR GLOBAL */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-tvde-dark p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] text-white shadow-2xl gap-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Global a Pagar</p>
              <p className="text-2xl sm:text-4xl font-black">{formatCurrency(dadosProcessados.reduce((acc, curr) => acc + curr.saldoFinal, 0))}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Button variant="secondary" onClick={() => setStep(1)} className="w-full sm:w-auto justify-center">Recomeçar</Button>
              <Button onClick={finalizarSemana} disabled={loading} className="bg-tvde-accent h-14 px-8 w-full sm:w-auto justify-center shrink-0">
                {loading ? <Loader2 className="animate-spin mr-2" /> : 'Finalizar Semana'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="max-w-3xl mx-auto text-center space-y-10 py-10 animate-in zoom-in-95">
          <div className="w-20 h-20 sm:w-24 sm:h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-inner"><CheckCircle2 size={40} /></div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-800">Semana Fechada!</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <button onClick={downloadSEPA} className="flex items-center justify-between p-6 sm:p-8 bg-white border border-slate-200 rounded-[2rem] sm:rounded-[2.5rem] hover:shadow-2xl transition-all group">
              <div className="flex items-center gap-4 sm:gap-5">
                <div className="p-3 sm:p-4 rounded-2xl bg-blue-50 text-blue-500"><Banknote size={28} /></div>
                <div className="text-left"><p className="font-black text-slate-800 text-base sm:text-lg leading-tight">Ficheiro SEPA</p><p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Bancos Portugal</p></div>
              </div>
              <Download size={22} className="text-slate-200 group-hover:text-tvde-primary shrink-0" />
            </button>
            <button onClick={handleDownloadPDFs} className="flex items-center justify-between p-6 sm:p-8 bg-white border border-slate-200 rounded-[2rem] sm:rounded-[2.5rem] hover:shadow-2xl transition-all group">
              <div className="flex items-center gap-4 sm:gap-5">
                <div className="p-3 sm:p-4 rounded-2xl bg-red-50 text-red-500"><FileText size={28} /></div>
                <div className="text-left"><p className="font-black text-slate-800 text-base sm:text-lg leading-tight">Extratos PDF</p><p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Recibos Motoristas</p></div>
              </div>
              <Download size={22} className="text-slate-200 group-hover:text-tvde-primary shrink-0" />
            </button>
          </div>
          <Button variant="secondary" onClick={() => setStep(1)} className="w-full h-14">Novo Fecho</Button>
        </div>
      )}
    </div>
  );
}

// UploadBox
const UploadBox = ({ title, icon: Icon, color, onChange, ready, children }) => {
  const colorMap = {
    blue:   'bg-blue-50 text-blue-500 hover:border-blue-400',
    green:  'bg-green-50 text-green-500 hover:border-green-400',
    purple: 'bg-purple-50 text-purple-500 hover:border-purple-400',
    orange: 'bg-orange-50 text-orange-500 hover:border-orange-400',
    yellow: 'bg-yellow-50 text-yellow-500 hover:border-yellow-400'
  };

  const idInput = `file-upload-${title.toLowerCase().replace(/\s/g, '-')}`;

  return (
    <div className="flex flex-col gap-2 h-full">
      <label 
        htmlFor={idInput}
        className={`bg-white p-5 rounded-[2rem] border-2 border-dashed transition-all flex flex-col items-center text-center group cursor-pointer flex-1 justify-center ${
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
      {children}
    </div>
  );
};