import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs, updateDoc, doc, setDoc } from 'firebase/firestore';
import { MOCK_VEICULOS } from '../utils/mockVeiculos';

/**
 * UTILITÁRIO DE MIGRAÇÃO — Executar conforme necessário
 * 
 * Permite:
 * 1. Corrigir movimentos financeiros antigos (pagoNoFechoId: null -> "")
 * 2. Popular a base de dados com as 25 viaturas de teste para o catálogo.
 */
export default function MigracaoFirestore() {
  const [status, setStatus]     = useState('idle'); // idle | running | done | error
  const [log, setLog]           = useState([]);
  const [totalFixed, setTotal]  = useState(0);
  const [acaoAtual, setAcaoAtual] = useState(''); // 'financeiro' | 'veiculos'

  const addLog = (msg) => setLog(prev => [...prev, `${new Date().toLocaleTimeString('pt-PT')} — ${msg}`]);

  // 1. Migração de Movimentos Financeiros (Existente)
  const executarMigracaoFinanceira = async () => {
    if (!window.confirm(
      'Esta operação vai actualizar todos os lançamentos financeiros com pagoNoFechoId: null para pagoNoFechoId: "". Confirmas?'
    )) return;

    setStatus('running');
    setAcaoAtual('financeiro');
    setLog([]);
    setTotal(0);
    let count = 0;

    try {
      addLog('A carregar documentos com pagoNoFechoId: null...');

      const snap = await getDocs(collection(db, 'movimentos_financeiros'));
      
      const docsComNull = snap.docs.filter(d => {
        const val = d.data().pagoNoFechoId;
        return val === null || val === undefined;
      });

      addLog(`Encontrados ${docsComNull.length} documentos a migrar.`);

      for (const docSnap of docsComNull) {
        await updateDoc(doc(db, 'movimentos_financeiros', docSnap.id), {
          pagoNoFechoId: ''
        });
        count++;
        if (count % 10 === 0) addLog(`${count} documentos migrados...`);
      }

      setTotal(count);
      addLog(`✅ Migração concluída! ${count} documentos actualizados.`);
      setStatus('done');

    } catch (error) {
      addLog(`❌ Erro: ${error.message}`);
      setStatus('error');
    }
  };

  // 2. Importação das 25 Viaturas de Teste (Nova)
  const executarImportacaoVeiculos = async () => {
    if (!window.confirm(
      'Esta operação vai importar 25 viaturas de teste para a coleção "veiculos" no Firestore. Se as viaturas já existirem, serão atualizadas. Confirmas?'
    )) return;

    setStatus('running');
    setAcaoAtual('veiculos');
    setLog([]);
    setTotal(0);
    let count = 0;

    try {
      addLog('A iniciar a importação de viaturas para o Firestore...');
      addLog(`Lendo ${MOCK_VEICULOS.length} viaturas do mock...`);

      for (const veiculo of MOCK_VEICULOS) {
        // Usamos setDoc com ID fixo para evitar duplicações se correr o script várias vezes
        await setDoc(doc(db, 'veiculos', veiculo.id), veiculo);
        count++;
        addLog(`[${count}/25] Guardado: ${veiculo.marca} ${veiculo.modelo} (${veiculo.matricula})`);
      }

      setTotal(count);
      addLog(`✅ Importação concluída! ${count} viaturas prontas no Firestore.`);
      setStatus('done');

    } catch (error) {
      addLog(`❌ Erro ao importar viaturas: ${error.message}`);
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 max-w-2xl w-full space-y-6">
        
        <div>
          <h1 className="text-2xl font-black text-slate-800">Centro de Migrações Firestore</h1>
          <p className="text-slate-500 text-sm mt-1">
            Utilitários de manutenção e carregamento de dados de teste.
          </p>
        </div>

        {/* Painel de Ações */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Caixa 1: Financeiro */}
          <div className="border border-slate-100 rounded-2xl p-4 flex flex-col justify-between space-y-4 hover:border-slate-200 transition-all bg-slate-50/50">
            <div>
              <h2 className="font-bold text-slate-800 text-sm">Correção Financeira</h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Corrige lançamentos com <code className="bg-slate-100 px-1 py-0.5 rounded">pagoNoFechoId: null</code> para string vazia.
              </p>
            </div>
            {status === 'idle' && (
              <button
                onClick={executarMigracaoFinanceira}
                className="w-full py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-blue-600 transition-colors text-xs"
              >
                Executar Correção
              </button>
            )}
          </div>

          {/* Caixa 2: Viaturas de Teste */}
          <div className="border border-slate-100 rounded-2xl p-4 flex flex-col justify-between space-y-4 hover:border-slate-200 transition-all bg-slate-50/50">
            <div>
              <h2 className="font-bold text-slate-800 text-sm">Catálogo de Teste (25)</h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Cria ou atualiza 25 viaturas reais na coleção <code className="bg-slate-100 px-1 py-0.5 rounded">veiculos</code> para a landing page.
              </p>
            </div>
            {status === 'idle' && (
              <button
                onClick={executarImportacaoVeiculos}
                className="w-full py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors text-xs"
              >
                Importar 25 Viaturas
              </button>
            )}
          </div>

        </div>

        {/* Feedback de Execução */}
        {status === 'running' && (
          <div className="flex items-center gap-3 text-blue-600 font-bold justify-center bg-blue-50 py-3 rounded-2xl border border-blue-100 text-sm">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            A executar {acaoAtual === 'financeiro' ? 'correção financeira' : 'importação de viaturas'}...
          </div>
        )}

        {status === 'done' && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-green-800 font-bold text-center text-sm">
            ✅ Concluído! {totalFixed} registos processados com sucesso.
            <button 
              onClick={() => setStatus('idle')}
              className="block mx-auto mt-2 text-xs text-green-700 underline hover:text-green-900"
            >
              Voltar ao início
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-800 font-bold text-center text-sm">
            ❌ Ocorreu um erro durante a execução. Verifique os registos no log abaixo.
            <button 
              onClick={() => setStatus('idle')}
              className="block mx-auto mt-2 text-xs text-red-700 underline hover:text-red-900"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* Logs */}
        {log.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Logs do Processo</p>
            <div className="bg-slate-900 rounded-2xl p-4 font-mono text-xs text-emerald-400 space-y-1 max-h-60 overflow-y-auto border border-slate-800">
              {log.map((line, i) => <div key={i}>{line}</div>)}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}