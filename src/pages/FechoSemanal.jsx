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
  parseUberCSV, parseBoltCSV, parseViaVerdeCSV, 
  parseCartoesConsumoCSV, generateSEPAXML 
} from '../utils/parsers';
import { generateDriverPDF } from '../utils/pdfGenerator';
import Button from '../components/ui/Button';

export default function FechoSemanal() {
  const { userData, loading: authLoading } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Dados do Firestore
  const [motoristasDB, setMotoristasDB] = useState([]);
  const [veiculosDB, setVeiculosDB] = useState([]);
  const [cartoesDB, setCartoesDB] = useState([]);
  
  // Dados Processados
  const [dadosProcessados, setDadosProcessados] = useState([]);
  
  // Ficheiros
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
        const [mSnap, vSnap, cSnap] = await Promise.all([
          getDocs(collection(db, "motoristas")),
          getDocs(collection(db, "veiculos")),
          getDocs(collection(db, "cartoes"))
        ]);
        setMotoristasDB(mSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setVeiculosDB(vSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setCartoesDB(cSnap.docs.map(d => ({ id: d.id, ...d.data() })));
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
        <p className="text-slate-500 max-w-sm mx-auto">
          Apenas o Diretor tem permissão para aceder e processar o fecho financeiro semanal.
        </p>
        <Button variant="secondary" className="mt-6" onClick={() => window.location.href = '/'}>
          Voltar ao Dashboard
        </Button>
      </div>
    );
  }

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => setFiles(prev => ({ ...prev, [type]: event.target.result }));
      reader.readAsText(file);
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

      // CORREÇÃO CRÍTICA: Busca por pagoNoFechoId: "" (string vazia) em vez de null
      const qMov = query(collection(db, "movimentos_financeiros"), where("pagoNoFechoId", "==", ""));
      const movSnap = await getDocs(qMov);
      const todosMovimentos = movSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const consolidado = motoristasDB.map(m => {
        const u = uberData[m.nome] || { bruto: 0, liquido: 0, gorjetas: 0, portagens: 0 };
        const b = boltData[m.nome] || { bruto: 0, liquido: 0 };
        const veiculo = veiculosDB.find(v => v.motoristaId === m.id);
        const vvCusto = veiculo ? (viaVerdeData[veiculo.matricula.replace(/-/g, '')] || 0) : 0;

        let totalCombustivel = 0;
        let totalEletrico = 0;
        cartoesDB.filter(c => c.veiculoId === veiculo?.id).forEach(c => {
          if (c.tipo === 'combustivel') totalCombustivel += (combustivelData[c.numero] || 0);
          if (c.tipo === 'eletrico') totalEletrico += (eletricoData[c.numero] || 0);
        });

        const movsEntidade = todosMovimentos.filter(mov => 
          mov.entidadeId === m.id || (veiculo && mov.entidadeId === veiculo.id)
        );

        const totalCreditosManuais = movsEntidade
          .filter(mov => mov.tipoMovimento === 'credito')
          .reduce((acc, curr) => acc + curr.valor, 0);

        const totalDebitosManuais = movsEntidade
          .filter(mov => mov.tipoMovimento === 'debito')
          .reduce((acc, curr) => acc + curr.valor, 0);

        const liqPlataformas = u.liquido + b.liquido;
        const custosFixos = 125.00; 

        const ganhosTotais = liqPlataformas + u.portagens + totalCreditosManuais;
        const despesasTotais = vvCusto + totalCombustivel + totalEletrico + custosFixos + totalDebitosManuais;

        return {
          motoristaId: m.id,
          nomeMotorista: m.nome,
          iban: m.iban,
          uber: u,
          bolt: b,
          movimentosIds: movsEntidade.map(mov => mov.id),
          contaCorrente: { creditos: totalCreditosManuais, debitos: totalDebitosManuais },
          despesas: { viaVerde: vvCusto, combustivel: totalCombustivel, eletrico: totalEletrico, custosFixos: custosFixos },
          ajustes: 0,
          saldoFinal: ganhosTotais - despesasTotais
        };
      }).filter(d => d.uber.bruto > 0 || d.bolt.bruto > 0 || d.contaCorrente.creditos > 0 || d.contaCorrente.debitos > 0);

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
      }
      await batch.commit();
      await logAcaoGlobal(userData.nome, "Finalização de Fecho", "Financeiro", `Semana ${new Date().toLocaleDateString()}`, "BATCH");
      setStep(3);
    } catch (error) {
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

  return (
    <div className="space-y-8 pb-20">
      <header>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
          <Calculator className="text-tvde-primary" /> Fecho de Semana
        </h1>
        <p className="text-slate-500 text-sm">Consolidação de rendimentos e conta corrente.</p>
      </header>

      {step === 1 && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <UploadBox title="UBER" icon={UploadCloud} color="blue" onChange={(e) => handleFileChange(e, 'uber')} ready={!!files.uber} />
            <UploadBox title="BOLT" icon={UploadCloud} color="green" onChange={(e) => handleFileChange(e, 'bolt')} ready={!!files.bolt} />
            <UploadBox title="VIA VERDE" icon={FileSpreadsheet} color="purple" onChange={(e) => handleFileChange(e, 'viaverde')} ready={!!files.viaverde} />
            <UploadBox title="PRIO/GALP" icon={Fuel} color="orange" onChange={(e) => handleFileChange(e, 'combustivel')} ready={!!files.combustivel} />
            <UploadBox title="MIIO/ZAP" icon={Zap} color="yellow" onChange={(e) => handleFileChange(e, 'eletrico')} ready={!!files.eletrico} />
          </div>
          <div className="flex justify-center">
            <Button onClick={processarSemana} disabled={loading} className="h-16 px-12 text-lg shadow-2xl">
              {loading ? <Loader2 className="animate-spin mr-2" /> : 'Processar Fecho Completo'}
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6 animate-in fade-in zoom-in-95">
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
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
                    <td className="p-5 text-center text-slate-500 font-medium">
                      -{formatCurrency(d.despesas.combustivel + d.despesas.eletrico + d.despesas.viaVerde + d.despesas.custosFixos)}
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
          <div className="flex justify-between items-center bg-tvde-dark p-8 rounded-[2.5rem] text-white shadow-2xl">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Global a Pagar</p>
              <p className="text-4xl font-black">{formatCurrency(dadosProcessados.reduce((acc, curr) => acc + curr.saldoFinal, 0))}</p>
            </div>
            <div className="flex gap-4">
              <Button variant="secondary" onClick={() => setStep(1)}>Recomeçar</Button>
              <Button onClick={finalizarSemana} disabled={loading} className="bg-tvde-accent h-14 px-8">
                {loading ? <Loader2 className="animate-spin mr-2" /> : 'Finalizar Semana'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="max-w-3xl mx-auto text-center space-y-10 py-10 animate-in zoom-in-95">
          <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-inner"><CheckCircle2 size={48} /></div>
          <h2 className="text-4xl font-black text-slate-800">Semana Fechada!</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button onClick={downloadSEPA} className="flex items-center justify-between p-8 bg-white border border-slate-200 rounded-[2.5rem] hover:shadow-2xl transition-all group">
              <div className="flex items-center gap-5">
                <div className="p-4 rounded-2xl bg-blue-50 text-blue-500"><Banknote size={32} /></div>
                <div className="text-left"><p className="font-black text-slate-800 text-lg">Ficheiro SEPA</p><p className="text-xs text-slate-400 font-bold uppercase">Bancos Portugal</p></div>
              </div>
              <Download size={24} className="text-slate-200 group-hover:text-tvde-primary" />
            </button>
            <button onClick={handleDownloadPDFs} className="flex items-center justify-between p-8 bg-white border border-slate-200 rounded-[2.5rem] hover:shadow-2xl transition-all group">
              <div className="flex items-center gap-5">
                <div className="p-4 rounded-2xl bg-red-50 text-red-500"><FileText size={32} /></div>
                <div className="text-left"><p className="font-black text-slate-800 text-lg">Extratos PDF</p><p className="text-xs text-slate-400 font-bold uppercase">Recibos Motoristas</p></div>
              </div>
              <Download size={24} className="text-slate-200 group-hover:text-tvde-primary" />
            </button>
          </div>
          <Button variant="secondary" onClick={() => setStep(1)} className="w-full h-14">Novo Fecho</Button>
        </div>
      )}
    </div>
  );
}

const UploadBox = ({ title, icon: Icon, color, onChange, ready }) => (
  <div className={`bg-white p-6 rounded-[2rem] border-2 border-dashed transition-all flex flex-col items-center text-center group ${ready ? 'border-green-500 bg-green-50/30' : 'border-slate-200 hover:border-tvde-primary'}`}>
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${ready ? 'bg-green-500 text-white' : `bg-${color}-50 text-${color}-500`}`}>
      {ready ? <CheckCircle2 size={24} /> : <Icon size={24} />}
    </div>
    <h3 className="font-bold text-slate-800 text-xs">{title}</h3>
    <input type="file" className="hidden" id={title} onChange={onChange} />
    <label htmlFor={title} className="mt-4 cursor-pointer bg-slate-800 text-white px-4 py-2 rounded-lg text-[9px] font-black uppercase hover:bg-tvde-primary transition-all">
      {ready ? 'Substituir' : 'Selecionar'}
    </label>
  </div>
);