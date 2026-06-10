import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';

/**
 * UTILITÁRIO DE MIGRAÇÃO — Executar UMA única vez.
 *
 * Normaliza o campo `tipo` de todos os cartões para lowercase sem acentos:
 *   "Combustivel" → "combustivel"
 *   "Combustível" → "combustivel"
 *   "Eletrico"    → "eletrico"
 *   "Elétrico"    → "eletrico"
 *
 * COMO USAR:
 * 1. Adiciona ao App.jsx: <Route path="/migracao-cartoes" element={<MigracaoCartoes />} />
 * 2. Acede a localhost:5173/migracao-cartoes
 * 3. Clica "Executar Migração" e aguarda conclusão
 * 4. Remove a rota e este ficheiro
 */
export default function MigracaoCartoes() {
  const [log, setLog]         = useState([]);
  const [status, setStatus]   = useState('idle'); // idle | running | done | error
  const [total, setTotal]     = useState(0);

  const addLog = (msg) => setLog(prev => [...prev, `${new Date().toLocaleTimeString('pt-PT')} — ${msg}`]);

  const normalizarTipo = (tipo) =>
    (tipo || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  const executar = async () => {
    if (!window.confirm(
      'Esta operação vai normalizar o campo "tipo" de todos os cartões para lowercase sem acentos. Confirmas?'
    )) return;

    setStatus('running');
    setLog([]);
    setTotal(0);
    let count = 0;

    try {
      addLog('A carregar todos os cartões...');
      const snap = await getDocs(collection(db, 'cartoes'));
      addLog(`${snap.size} cartões encontrados. A verificar...`);

      for (const d of snap.docs) {
        const tipoAtual = d.data().tipo || '';
        const tipoNovo  = normalizarTipo(tipoAtual);

        if (tipoAtual !== tipoNovo) {
          await updateDoc(doc(db, 'cartoes', d.id), { tipo: tipoNovo });
          addLog(`✅ ${d.data().fornecedor || d.id}: "${tipoAtual}" → "${tipoNovo}"`);
          count++;
        }
      }

      if (count === 0) {
        addLog('Nenhum cartão precisou de migração — já estavam no formato correcto.');
      } else {
        addLog(`✅ Migração concluída! ${count} cartão(ões) actualizado(s).`);
        addLog('Podes remover esta página e a rota do App.jsx agora.');
      }

      setTotal(count);
      setStatus('done');

    } catch (error) {
      addLog(`❌ Erro: ${error.message}`);
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 max-w-xl w-full space-y-6">

        <div>
          <h1 className="text-2xl font-black text-slate-800">Migração de Cartões</h1>
          <p className="text-slate-500 text-sm mt-1">
            Normaliza o campo <code className="bg-slate-100 px-1 rounded">tipo</code> de todos os cartões para lowercase sem acentos.
          </p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800 space-y-1">
          <p><strong>O que isto faz:</strong></p>
          <p><code className="bg-amber-100 px-1 rounded">"Combustivel"</code> → <code className="bg-amber-100 px-1 rounded">"combustivel"</code></p>
          <p><code className="bg-amber-100 px-1 rounded">"Combustível"</code> → <code className="bg-amber-100 px-1 rounded">"combustivel"</code></p>
          <p><code className="bg-amber-100 px-1 rounded">"Elétrico"</code> → <code className="bg-amber-100 px-1 rounded">"eletrico"</code></p>
        </div>

        {status === 'idle' && (
          <button
            onClick={executar}
            className="w-full py-4 bg-tvde-primary text-white font-black rounded-2xl hover:bg-blue-600 transition-colors text-lg"
          >
            Executar Migração
          </button>
        )}

        {status === 'running' && (
          <div className="flex items-center gap-3 text-tvde-primary font-bold">
            <div className="w-5 h-5 border-2 border-tvde-primary border-t-transparent rounded-full animate-spin" />
            A migrar cartões...
          </div>
        )}

        {status === 'done' && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-green-800 font-bold text-center">
            ✅ {total === 0 ? 'Nada a migrar — tudo já estava correcto!' : `${total} cartão(ões) migrado(s) com sucesso!`}
            <p className="text-sm font-normal mt-1">Podes remover esta página agora.</p>
          </div>
        )}

        {status === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-800 font-bold text-center">
            ❌ Erro durante a migração. Vê o log abaixo.
          </div>
        )}

        {log.length > 0 && (
          <div className="bg-slate-900 rounded-2xl p-4 font-mono text-xs text-green-400 space-y-1 max-h-64 overflow-y-auto">
            {log.map((line, i) => <div key={i}>{line}</div>)}
          </div>
        )}

      </div>
    </div>
  );
}