/**
 * MigracaoFirestore.jsx
 * Localização: src/pages/MigracaoFirestore.jsx
 *
 * Centro de controlo de manutenção da base de dados.
 * [ATUALIZADO]: Funcionalidade de importação de mocks desativada devido à exclusão 
 * do ficheiro mockVeiculos.js para transição para produção real.
 */

import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';

export default function MigracaoFirestore() {
  const [status, setStatus]     = useState('idle'); // idle | running | done | error
  const [log, setLog]           = useState([]);
  const [totalFixed, setTotal]  = useState(0);

  const addLog = (msg) => setLog(prev => [...prev, `${new Date().toLocaleTimeString('pt-PT')} — ${msg}`]);

  // 1. Migração de Movimentos Financeiros
  const executarMigracaoFinanceira = async () => {
    if (!window.confirm(
      'Esta operação vai actualizar todos os lançamentos financeiros com pagoNoFechoId: null para pagoNoFechoId: "". Confirmas?'
    )) return;

    setStatus('running');
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

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8 text-left">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 max-w-2xl w-full space-y-6">
        
        <div>
          <h1 className="text-2xl font-black text-slate-800">Centro de Migrações Firestore</h1>
          <p className="text-slate-500 text-sm mt-1">
            Utilitários de manutenção de registos.
          </p>
        </div>

        {/* Painel de Ações */}
        <div className="grid grid-cols-1 gap-4">
          
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
        </div>

        {/* Feedback de Execução */}
        {status === 'running' && (
          <div className="flex items-center gap-3 text-blue-600 font-bold justify-center bg-blue-50 py-3 rounded-2xl border border-blue-100 text-sm">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            A executar correção financeira...
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