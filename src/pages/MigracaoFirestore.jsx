import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs, updateDoc, doc, query, where } from 'firebase/firestore';

/**
 * UTILITÁRIO DE MIGRAÇÃO — Executar UMA única vez
 *
 * Problema: lançamentos criados antes da correcção têm pagoNoFechoId: null
 * A query actual filtra por pagoNoFechoId == "" — esses documentos ficam invisíveis.
 *
 * Esta página percorre todos os movimentos_financeiros com pagoNoFechoId == null
 * e actualiza para pagoNoFechoId == "" (string vazia), tornando-os visíveis novamente.
 *
 * COMO USAR:
 * 1. Adiciona esta rota temporariamente no App.jsx:
 *    <Route path="/migracao" element={<MigracaoFirestore />} />
 * 2. Acede a localhost:5173/migracao
 * 3. Clica "Executar Migração"
 * 4. Aguarda a mensagem de conclusão
 * 5. Remove a rota e este ficheiro
 */
export default function MigracaoFirestore() {
  const [status, setStatus]     = useState('idle'); // idle | running | done | error
  const [log, setLog]           = useState([]);
  const [totalFixed, setTotal]  = useState(0);

  const addLog = (msg) => setLog(prev => [...prev, `${new Date().toLocaleTimeString('pt-PT')} — ${msg}`]);

  const executarMigracao = async () => {
    if (!window.confirm(
      'Esta operação vai actualizar todos os lançamentos financeiros com pagoNoFechoId: null para pagoNoFechoId: "". Confirmas?'
    )) return;

    setStatus('running');
    setLog([]);
    setTotal(0);
    let count = 0;

    try {
      addLog('A carregar documentos com pagoNoFechoId: null...');

      // O Firestore permite filtrar por null directamente em getDocs
      // (o problema é no onSnapshot com índices compostos — aqui é só uma query simples)
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
      addLog('Podes remover esta página do App.jsx agora.');
      setStatus('done');

    } catch (error) {
      addLog(`❌ Erro: ${error.message}`);
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 max-w-2xl w-full space-y-6">
        
        <div>
          <h1 className="text-2xl font-black text-slate-800">Migração Firestore</h1>
          <p className="text-slate-500 text-sm mt-1">
            Corrige lançamentos financeiros invisíveis — executa uma única vez.
          </p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
          <strong>O que isto faz:</strong> Actualiza todos os documentos em{' '}
          <code className="bg-amber-100 px-1 rounded">movimentos_financeiros</code> onde{' '}
          <code className="bg-amber-100 px-1 rounded">pagoNoFechoId</code> é <code className="bg-amber-100 px-1 rounded">null</code>{' '}
          para <code className="bg-amber-100 px-1 rounded">""</code> (string vazia),
          tornando-os visíveis nas queries dos formulários.
        </div>

        {status === 'idle' && (
          <button
            onClick={executarMigracao}
            className="w-full py-4 bg-tvde-primary text-white font-black rounded-2xl hover:bg-blue-600 transition-colors text-lg"
          >
            Executar Migração
          </button>
        )}

        {status === 'running' && (
          <div className="flex items-center gap-3 text-tvde-primary font-bold">
            <div className="w-5 h-5 border-2 border-tvde-primary border-t-transparent rounded-full animate-spin" />
            A migrar documentos...
          </div>
        )}

        {status === 'done' && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-green-800 font-bold text-center">
            ✅ {totalFixed} documentos migrados com sucesso!
            <p className="text-sm font-normal mt-1">Podes remover esta página agora.</p>
          </div>
        )}

        {status === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-800 font-bold text-center">
            ❌ Erro durante a migração. Vê o log abaixo.
          </div>
        )}

        {log.length > 0 && (
          <div className="bg-slate-900 rounded-2xl p-4 font-mono text-xs text-green-400 space-y-1 max-h-60 overflow-y-auto">
            {log.map((line, i) => <div key={i}>{line}</div>)}
          </div>
        )}

      </div>
    </div>
  );
}