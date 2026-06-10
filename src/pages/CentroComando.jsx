import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Send, Sparkles, Wallet, Trash2, User, Loader2, Bot, CheckCircle2, AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, setDoc, onSnapshot, deleteDoc, getDoc } from 'firebase/firestore';
import { perguntarAoAgente } from '../services/geminiService';
import { capturarDadosSistema, executorFuncoes } from '../services/centroComandoHandlers';

// Configuração fixa do único assistente
const ASSISTENTE = {
  nome: "Assistente TVDE",
  cor:  "bg-slate-800",
  icon: Bot
};

export default function CentroComando() {
  const { userData, user } = useAuth();
  const [input, setInput]               = useState('');
  const [messages, setMessages]         = useState([]);
  const [loading, setLoading]           = useState(false);
  const [custoAcumulado, setCustoAcumulado] = useState(0);
  const scrollRef   = useRef(null);
  const [portalTarget, setPortalTarget] = useState(null);

  useEffect(() => {
    setPortalTarget(document.getElementById('navbar-slot-ia'));
  }, []);

  // Carrega e persiste o histórico de conversas no Firestore
  useEffect(() => {
    if (!user?.uid) return;
    const chatRef = doc(db, "conversas_ia", user.uid);
    const unsubscribe = onSnapshot(chatRef, (docSnap) => {
      if (docSnap.exists()) {
        setMessages(docSnap.data().messages || []);
      } else {
        const msg = {
          role: 'ai',
          content: `Olá ${userData?.nome || 'Diretor'}! Sou o Assistente TVDE, o teu gestor operacional completo.\n\nPosso criar, editar e eliminar motoristas, veículos, proprietários, cartões e lançamentos financeiros. Basta pedires.`,
          resultadosFuncoes: []
        };
        setMessages([msg]);
        setDoc(chatRef, { messages: [msg], lastUpdate: new Date().toISOString() });
      }
    });
    return () => unsubscribe();
  }, [user?.uid, userData?.nome]);

  // Scroll automático para a última mensagem
  useEffect(() => {
    if (scrollRef.current) {
      const timer = setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [messages, loading]);

  // FILA DE MEMÓRIA — Retentativa automática em caso de erro 503
  const executarRetentativaBackground = async (userId, userContent, mensagensAnteriores, rodada = 1) => {
    const maxRodadas  = 2;
    const tempoEspera = rodada === 1 ? 30000 : 60000;

    setTimeout(async () => {
      try {
        const contextoReal = await capturarDadosSistema(db);

        const respostaIA = await perguntarAoAgente(
          userContent,
          contextoReal,
          mensagensAnteriores,
          (name, args) => executorFuncoes(db, name, args)
        );

        const docSnap = await getDoc(doc(db, "conversas_ia", userId));
        const historicoFresco = docSnap.exists() ? docSnap.data().messages : mensagensAnteriores;

        const msgSucesso = {
          role: 'ai',
          content: `✅ *Instrução Executada via Fila de Memória:*\n\n${respostaIA.text || ""}`,
          resultadosFuncoes: respostaIA.resultadosFuncoes || []
        };

        await setDoc(
          doc(db, "conversas_ia", userId),
          { messages: [...historicoFresco, msgSucesso], lastUpdate: new Date().toISOString() },
          { merge: true }
        );

        setCustoAcumulado(prev => prev + (respostaIA.custo || 0));

      } catch (err) {
        console.warn(`[Fila de Memória] Falha na rodada ${rodada}:`, err.message);
        const textError = JSON.stringify(err);
        const is503 = err.message?.includes("503") || textError.includes("503") || textError.includes("UNAVAILABLE");

        if (is503 && rodada < maxRodadas) {
          const docSnap = await getDoc(doc(db, "conversas_ia", userId));
          const historicoFresco = docSnap.exists() ? docSnap.data().messages : mensagensAnteriores;

          const msgAviso = {
            role: 'ai',
            content: `⏳ *Fila de Memória (Tentativa ${rodada + 1}/${maxRodadas}):* Servidores com carga elevada. Vou aguardar mais 60 segundos antes de tentar novamente.`,
            resultadosFuncoes: []
          };

          await setDoc(
            doc(db, "conversas_ia", userId),
            { messages: [...historicoFresco, msgAviso], lastUpdate: new Date().toISOString() },
            { merge: true }
          );

          executarRetentativaBackground(userId, userContent, [...historicoFresco, msgAviso], rodada + 1);

        } else {
          const docSnap = await getDoc(doc(db, "conversas_ia", userId));
          const historicoFresco = docSnap.exists() ? docSnap.data().messages : mensagensAnteriores;

          const msgFalha = {
            role: 'ai',
            content: `❌ *Fila de Memória:* Não foi possível processar o comando após várias retentativas. Por favor, repete a operação manualmente.`,
            resultadosFuncoes: []
          };

          await setDoc(
            doc(db, "conversas_ia", userId),
            { messages: [...historicoFresco, msgFalha], lastUpdate: new Date().toISOString() },
            { merge: true }
          );
        }
      }
    }, tempoEspera);
  };

  // ENVIO DE MENSAGEM
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userContent = input.trim();
    setInput('');
    setLoading(true);

    const userMsg       = { role: 'user', content: userContent };
    const currentMessages = [...messages, userMsg];

    try {
      const contextoReal = await capturarDadosSistema(db);

      // Nova assinatura — sem agenteKey
      const respostaIA = await perguntarAoAgente(
        userContent,
        contextoReal,
        currentMessages,
        (name, args) => executorFuncoes(db, name, args)
      );

      const aiMsg = {
        role: 'ai',
        content: respostaIA.text || "",
        resultadosFuncoes: respostaIA.resultadosFuncoes || []
      };

      const finalMessages = [...currentMessages, aiMsg];

      await setDoc(
        doc(db, "conversas_ia", user.uid),
        { messages: finalMessages, lastUpdate: new Date().toISOString() },
        { merge: true }
      );

      setCustoAcumulado(prev => prev + respostaIA.custo);

    } catch (error) {
      console.error("[CentroComando]", error);

      const errString   = JSON.stringify(error);
      const isHighDemand = error.message?.includes("503") || errString.includes("503") || errString.includes("UNAVAILABLE");

      if (isHighDemand) {
        const msgRetentativa = {
          role: 'ai',
          content: `⚠️ *Servidores Sob Alta Carga (Erro 503):* O modelo está instável. Retive a instrução na fila de memória e vou executá-la automaticamente em segundo plano.`,
          resultadosFuncoes: [{ resultado: { sucesso: false, msg: "Retentativa automática agendada." } }]
        };

        const finalMessagesWithWarning = [...currentMessages, msgRetentativa];
        await setDoc(
          doc(db, "conversas_ia", user.uid),
          { messages: finalMessagesWithWarning, lastUpdate: new Date().toISOString() },
          { merge: true }
        );

        // Sem await — executa em background para libertar o UI imediatamente
        executarRetentativaBackground(user.uid, userContent, finalMessagesWithWarning, 1);

      } else {
        const errMsg = {
          role: 'ai',
          content: `❌ Ocorreu uma interrupção na comunicação. Detalhes: ${error.message}`,
          resultadosFuncoes: []
        };
        await setDoc(
          doc(db, "conversas_ia", user.uid),
          { messages: [...currentMessages, errMsg], lastUpdate: new Date().toISOString() },
          { merge: true }
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = async () => {
    if (window.confirm("Pretende limpar o histórico desta conversa?")) {
      await deleteDoc(doc(db, "conversas_ia", user.uid));
    }
  };

  const IconeAssistente = ASSISTENTE.icon;

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col gap-3">

      {/* Portal para o Header — custo e botão limpar */}
      {portalTarget && createPortal(
        <div className="flex items-center gap-6 animate-in fade-in duration-300">
          <div className="flex items-center gap-1.5">
            <Sparkles size={13} className="text-slate-500 shrink-0" />
            <h1 className="text-[11px] font-black tracking-wider text-slate-700 uppercase whitespace-nowrap">
              Assistente TVDE
            </h1>
          </div>
          <div className="flex gap-2 items-center">
            <div className="bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100 flex items-center gap-1">
              <Wallet size={11} className="text-slate-400" />
              <p className="text-[10px] font-bold text-slate-600 whitespace-nowrap">
                {custoAcumulado.toFixed(4)} €
              </p>
            </div>
            <button
              onClick={handleClearChat}
              className="p-1 text-slate-300 hover:text-red-500 transition-colors"
              title="Limpar Conversa"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>,
        portalTarget
      )}

      {/* Chat — ocupa toda a largura (sem sidebar) */}
      <div className="flex-1 bg-white rounded-[2rem] border border-slate-100 shadow-sm flex flex-col overflow-hidden min-h-0">

        {/* Mensagens */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30">
          {messages.map((msg, idx) => {
            const isUser = msg.role === 'user';

            return (
              <div key={idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] flex gap-3 ${isUser ? 'flex-row-reverse' : 'items-start'}`}>

                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm border text-white ${
                    isUser
                      ? 'bg-slate-950 border-slate-950'
                      : `${ASSISTENTE.cor} border-transparent`
                  }`}>
                    {isUser ? <User size={16} /> : <IconeAssistente size={16} />}
                  </div>

                  {/* Balão */}
                  <div className="space-y-1.5">
                    <div className={`px-5 py-3.5 rounded-[1.75rem] ${
                      isUser
                        ? 'bg-slate-950 text-white rounded-tr-none text-right'
                        : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none shadow-sm'
                    }`}>
                      {!isUser && (
                        <p className="text-[9px] font-black uppercase tracking-wider mb-1 text-slate-400">
                          {ASSISTENTE.nome}
                        </p>
                      )}
                      <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium">
                        {msg.content}
                      </p>
                    </div>

                    {/* Resultados das funções executadas */}
                    {!isUser && msg.resultadosFuncoes && msg.resultadosFuncoes.length > 0 && (
                      <div className="flex flex-col gap-1 px-2">
                        {msg.resultadosFuncoes.map((f, fIdx) => (
                          <div key={fIdx} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                            {f.resultado?.sucesso ? (
                              <CheckCircle2 size={11} className="text-emerald-500 shrink-0" />
                            ) : (
                              <AlertCircle size={11} className="text-amber-500 shrink-0" />
                            )}
                            <span className="truncate max-w-xs">{f.resultado?.msg}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Indicador de loading */}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white px-4 py-2.5 rounded-full text-[11px] text-slate-400 flex items-center gap-2 border border-slate-100 shadow-sm">
                <Loader2 className="animate-spin text-slate-500" size={13} />
                O Assistente TVDE está a processar a acção...
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 bg-white border-t border-slate-100 shrink-0">
          <form onSubmit={handleSendMessage} className="relative max-w-4xl mx-auto">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enviar instrução ao Assistente TVDE..."
              className="w-full pl-6 pr-16 py-4 bg-slate-50 focus:bg-white border border-slate-100 focus:border-slate-200 rounded-xl shadow-inner outline-none focus:ring-4 focus:ring-slate-900/5 text-sm transition-all text-slate-800 font-medium placeholder:text-slate-400"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="absolute right-2 top-2 bottom-2 px-5 bg-slate-950 hover:bg-slate-800 text-white rounded-lg transition-all disabled:opacity-20 flex items-center justify-center shadow-md"
            >
              {loading
                ? <Loader2 size={16} className="animate-spin" />
                : <Send size={16} />
              }
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}