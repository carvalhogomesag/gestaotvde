import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Send, Sparkles, Wallet, Trash2, User, Loader2, Bot, CheckCircle2, AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, setDoc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { perguntarAoAgente } from '../services/geminiService';
import { MICRO_AGENTES } from '../services/microAgentes';

// 🌟 Importação dos Handlers Componentizados e do Painel Lateral
import { capturarDadosSistema, executorFuncoes } from '../services/centroComandoHandlers';
import SidebarAgentes from './SidebarAgentes';

export default function CentroComando() {
  const { userData, user } = useAuth();
  const [input, setInput]                 = useState('');
  const [messages, setMessages]           = useState([]);
  const [loading, setLoading]             = useState(false);
  const [custoAcumulado, setCustoAcumulado] = useState(0);
  const scrollRef = useRef(null);
  const [portalTarget, setPortalTarget] = useState(null);

  useEffect(() => {
    setPortalTarget(document.getElementById('navbar-slot-ia'));
  }, []);

  // Carrega e persiste o histórico de conversas no Firestore (Mantido Intacto)
  useEffect(() => {
    if (!user?.uid) return;
    const chatRef = doc(db, "conversas_ia", user.uid);
    const unsubscribe = onSnapshot(chatRef, (docSnap) => {
      if (docSnap.exists()) {
        setMessages(docSnap.data().messages || []);
      } else {
        const msg = {
          role: 'ai', 
          agent: 'orquestrador',
          content: `Olá ${userData?.nome || 'Diretor'}! Bem-vindo à Sala de Reuniões Digital do TVDE Gestão.\n\nTodos os nossos agentes especializados estão online e a acompanhar este canal em tempo real. Podes pedir análises financeiras, gestão de frotas ou validações de RH num único lugar.`,
          resultadosFuncoes: []
        };
        setMessages([msg]);
        setDoc(chatRef, { messages: [msg], lastUpdate: new Date().toISOString() });
      }
    });
    return () => unsubscribe();
  }, [user?.uid, userData?.nome]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // ENVIO DE MENSAGENS COM ROTEAMENTO INTELIGENTE
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userContent = input.trim();
    setInput('');
    setLoading(true);

    const userMsg = { role: 'user', content: userContent };
    const currentMessages = [...messages, userMsg];

    try {
      // Executa a captura externa importada injetando a instância conectada do db
      const contextoReal = await capturarDadosSistema(db);

      let agenteKey = 'orquestrador';
      const inputLower = userContent.toLowerCase();
      if (/(débito|credito|lançamento|pagar|custo|euro|€|financ|excluir|apagar|deletar|eliminar|contabil)/i.test(inputLower)) agenteKey = 'financeiro';
      else if (/(carro|veículo|matrícula|frota|manutenção|viatura|quilometragem)/i.test(inputLower)) agenteKey = 'frota';
      else if (/(rh|recursos humanos|motorista|contrato|documento|admissão|onboarding|nif|carta|cmtvde|criminal|validade|expira)/i.test(inputLower)) agenteKey = 'rh';

      // Dispara a pergunta encapsulando o executorFuncoes importado para aceitar o db nativo
      const respostaIA = await perguntarAoAgente(
        userContent,
        agenteKey, 
        contextoReal,
        currentMessages, 
        (name, args) => executorFuncoes(db, name, args)
      );

      const aiMsg = { 
        role: 'ai', 
        agent: agenteKey, 
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
      console.error("[Pipeline Error]", error);
      const errMsg = {
        role: 'ai', agent: 'orquestrador',
        content: `❌ Ocorreu uma interrupção na comunicação interna. Detalhes: ${error.message}`,
        resultadosFuncoes: []
      };
      await setDoc(doc(db, "conversas_ia", user.uid), { messages: [...currentMessages, errMsg], lastUpdate: new Date().toISOString() }, { merge: true });
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = async () => {
    if (window.confirm("Pretende limpar o histórico desta reunião?")) {
      await deleteDoc(doc(db, "conversas_ia", user.uid));
    }
  };

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col gap-3">
      
      {portalTarget && createPortal(
        <div className="flex items-center gap-6 animate-in fade-in duration-300">
          <div className="flex items-center gap-1.5">
            <Sparkles size={13} className="text-slate-500 shrink-0" />
            <h1 className="text-[11px] font-black tracking-wider text-slate-700 uppercase whitespace-nowrap">
              Sala de Comando
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
              title="Limpar Sala"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>,
        portalTarget
      )}

      <div className="flex-1 flex gap-3 min-h-0 items-stretch">
        
        {/* Chat Principal */}
        <div className="flex-1 bg-white rounded-[2rem] border border-slate-100 shadow-sm flex flex-col overflow-hidden">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30">
            {messages.map((msg, idx) => {
              const configAgente = MICRO_AGENTES[msg.agent] || MICRO_AGENTES.orquestrador;
              const IconeAgente = configAgente?.icon || Bot;
              const isUser = msg.role === 'user';

              return (
                <div key={idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] flex gap-3 ${isUser ? 'flex-row-reverse' : 'items-start'}`}>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm border text-white ${
                      isUser ? 'bg-slate-950 border-slate-950' : `${configAgente?.cor || 'bg-slate-700'} border-transparent`
                    }`}>
                      {isUser ? <User size={16} /> : <IconeAgente size={16} />}
                    </div>

                    <div className="space-y-1.5">
                      <div className={`px-5 py-3.5 rounded-[1.75rem] ${
                        isUser 
                          ? 'bg-slate-950 text-white rounded-tr-none text-right' 
                          : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none shadow-sm'
                      }`}>
                        {!isUser && (
                          <p className="text-[9px] font-black uppercase tracking-wider mb-1 text-slate-400">
                            {configAgente?.nome}
                          </p>
                        )}
                        <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium">{msg.content}</p>
                      </div>

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

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white px-4 py-2.5 rounded-full text-[11px] text-slate-400 flex items-center gap-2 border border-slate-100 shadow-sm">
                  <Loader2 className="animate-spin text-slate-500" size={13} />
                  Algum agente está a processar a ação na base de dados...
                </div>
              </div>
            )}
          </div>

          <div className="p-4 bg-white border-t border-slate-100 shrink-0">
            <form onSubmit={handleSendMessage} className="relative max-w-4xl mx-auto">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escreve uma instrução geral, alteração financeira ou auditoria documental..."
                className="w-full pl-6 pr-16 py-4 bg-slate-50 focus:bg-white border border-slate-100 focus:border-slate-200 rounded-xl shadow-inner outline-none focus:ring-4 focus:ring-slate-900/5 text-sm transition-all text-slate-800 font-medium placeholder:text-slate-400"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="absolute right-2 top-2 bottom-2 px-5 bg-slate-950 hover:bg-slate-800 text-white rounded-lg transition-all disabled:opacity-20 flex items-center justify-center shadow-md"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </form>
          </div>
        </div>

        {/* Painel Lateral Direito Isolado */}
        <SidebarAgentes />

      </div>
    </div>
  );
}