/**
 * PublicChatWidget.jsx
 * Localização: src/components/public/PublicChatWidget.jsx
 *
 * Widget flutuante de chat com assistente especializado em legislação,
 * trânsito e contabilidade TVDE em Portugal. Disponível 24/7 para visitantes.
 * Grava e sincroniza as interações em tempo real no Firestore para análise do ERP.
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageSquare, X, Send, Loader2, BookOpen, 
  HelpCircle, AlertCircle, Sparkles, Scale, Info 
} from 'lucide-react';
import { perguntarAoAssistentePublico } from '../../services/geminiService';

// Importação do Firebase Firestore para gravação de interações
import { db } from '../../firebase';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';

export default function PublicChatWidget() {
  const [aberto, setAberto] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [loading, setLoading] = useState(false);
  const [historico, setHistorico] = useState([]);
  const [mostrouAviso, setMostrouAviso] = useState(false);
  
  // Estado para guardar o ID do documento desta sessão de chat no Firestore
  const [conversaDocId, setConversaDocId] = useState(null);

  const fimMensagensRef = useRef(null);

  // Auto-scroll para manter a visualização sempre no fim da conversa
  useEffect(() => {
    if (fimMensagensRef.current) {
      fimMensagensRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [historico, loading]);

  // Lista de tópicos treinados para exibição inicial estruturada
  const topicosTreinados = [
    { icone: "⚖️", titulo: "Legislação TVDE", desc: "Lei n.º 45/2018, contratos de operadores e plataformas." },
    { icone: "🩺", titulo: "Código 997 & IMT", desc: "Curso de 125h, exames médicos Grupo 2 e registo criminal específico." },
    { icone: "🧾", titulo: "Contabilidade & Finanças", desc: "Abertura de CAE 49320, Isenção de IVA do Art.º 53.º (15.000 €) e ENI." },
    { icone: "🚗", titulo: "Código da Estrada PT", desc: "Limite profissional de álcool (0,20 g/l) e regras de trânsito." }
  ];

  // Sugestões de perguntas rápidas para conversão instantânea
  const sugestoesRapidas = [
    "Como funciona a isenção de IVA (Artigo 53º)?",
    "Quais os documentos exigidos para o Código 997?",
    "Um motorista TVDE pode conduzir quantas horas por dia?",
    "Qual a taxa máxima de álcool permitida para TVDE?"
  ];

  // Handler de envio de mensagens
  const handleEnviarMensagem = async (textoParaEnviar) => {
    const textoLimpo = textoParaEnviar?.trim() || mensagem.trim();
    if (!textoLimpo) return;

    // Adiciona a mensagem do utilizador ao histórico
    const novaMensagemUser = { role: 'user', content: textoLimpo };
    const novoHistorico = [...historico, novaMensagemUser];
    setHistorico(novoHistorico);
    setMensagem("");
    setLoading(true);

    try {
      // Chama o microagente público especializado
      const resposta = await perguntarAoAssistentePublico(textoLimpo, historico);
      const novaMensagemModel = { role: 'model', content: resposta.text };
      const historicoAtualizado = [...novoHistorico, novaMensagemModel];
      
      setHistorico(historicoAtualizado);

      // Persistência em background no Firestore para análise comercial posterior
      try {
        if (!conversaDocId) {
          // Sessão nova: cria documento na coleção conversas_suporte_publicas
          const docRef = await addDoc(collection(db, 'conversas_suporte_publicas'), {
            criadoEm: new Date().toISOString(),
            atualizadoEm: new Date().toISOString(),
            mensagens: historicoAtualizado
          });
          setConversaDocId(docRef.id);
        } else {
          // Sessão existente: atualiza o array de mensagens e a data de atividade
          await updateDoc(doc(db, 'conversas_suporte_publicas', conversaDocId), {
            atualizadoEm: new Date().toISOString(),
            mensagens: historicoAtualizado
          });
        }
      } catch (fsErr) {
        console.error("[PublicChatWidget] Erro ao gravar interação no Firestore:", fsErr);
      }

    } catch (err) {
      console.error("[PublicChatWidget] Erro ao obter resposta:", err);
      setHistorico(prev => [...prev, { 
        role: 'model', 
        content: "Lamento, mas ocorreu um erro técnico ao processar a sua resposta. Por favor, tente novamente." 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans text-slate-800 antialiased">
      
      {/* 🟢 1. BOTÃO FLUTUANTE (CHAT CHAFARIZ) */}
      {!aberto && (
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="relative p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-2xl transition-all duration-300 hover:scale-105 cursor-pointer flex items-center justify-center group"
          title="Fale com o nosso Assistente TVDE"
        >
          <MessageSquare size={24} className="group-hover:rotate-12 transition-transform" />
          
          {/* Badge Indicador de Online 24/7 flutuante */}
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white"></span>
          </span>

          {/* Dica de Utilidade Oculta que surge em hover */}
          <span className="absolute right-16 bg-slate-900 text-white text-[10px] font-black py-1.5 px-3 rounded-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md">
            💬 Apoio Legislativo & Fiscal (Online 24/7)
          </span>
        </button>
      )}

      {/* 💬 2. CAIXA DE DIÁLOGO DO CHAT */}
      {aberto && (
        <div className="w-[350px] sm:w-[400px] h-[550px] bg-white border border-slate-200 rounded-3xl shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
          
          {/* Cabeçalho do Chat */}
          <header className="bg-slate-950 text-white p-4 flex justify-between items-center shrink-0 border-b border-slate-900">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="p-2 bg-blue-600/10 text-blue-400 rounded-xl border border-blue-500/20">
                  <Scale size={16} />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-slate-950"></span>
                </span>
              </div>
              <div className="text-left">
                <h4 className="text-xs font-black tracking-tight flex items-center gap-1.5">
                  Assistente Legislativo TVDE
                </h4>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  Online 24/7 • Apoio Imediato
                </p>
              </div>
            </div>
            
            <button
              type="button"
              onClick={() => setAberto(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-900 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </header>

          {/* Área de Mensagens / Corpo do Chat */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            
            {/* Mensagem Inicial Padrão da IA */}
            <div className="flex gap-2 text-left">
              <div className="w-6 h-6 rounded-full bg-slate-900 text-white text-[10px] font-black flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                AI
              </div>
              <div className="bg-white border border-slate-200/60 text-slate-700 text-xs rounded-2xl p-3.5 shadow-2xs space-y-3 leading-relaxed max-w-[85%]">
                <p>
                  Olá! Sou o <strong>Assistente Virtual da Gestão TVDE</strong>. Estou online <strong>24 horas por dia, 7 dias por semana</strong> para responder instantaneamente às suas dúvidas [2].
                </p>

                {/* Bloco de Tópicos Treinados */}
                <div className="border-t border-slate-100 pt-3 space-y-2.5">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                    🔍 Tire as suas dúvidas sobre:
                  </span>
                  <div className="grid grid-cols-1 gap-2 text-left">
                    {topicosTreinados.map((t, idx) => (
                      <div key={idx} className="flex gap-2 items-start text-[11px] leading-tight">
                        <span className="shrink-0 text-xs">{t.icone}</span>
                        <div>
                          <p className="font-bold text-slate-800">{t.titulo}</p>
                          <p className="text-slate-400 text-[10px] font-medium">{t.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 italic">
                  O que gostaria de saber para iniciar o seu negócio de motorista TVDE?
                </p>
              </div>
            </div>

            {/* Renderização do Histórico Reativo de Diálogo */}
            {historico.map((msg, i) => {
              const isUser = msg.role === 'user';
              return (
                <div 
                  key={i} 
                  className={`flex gap-2 text-left ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-6 h-6 rounded-full bg-slate-900 text-white text-[10px] font-black flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                      AI
                    </div>
                  )}
                  <div className={`text-xs rounded-2xl p-3.5 shadow-2xs max-w-[85%] leading-relaxed ${
                    isUser 
                      ? 'bg-blue-600 text-white rounded-br-none' 
                      : 'bg-white border border-slate-200/60 text-slate-700 rounded-bl-none whitespace-pre-wrap'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              );
            })}

            {/* Indicador de "A pensar..." */}
            {loading && (
              <div className="flex gap-2 justify-start text-left">
                <div className="w-6 h-6 rounded-full bg-slate-900 text-white text-[10px] font-black flex items-center justify-center shrink-0 shadow-sm">
                  AI
                </div>
                <div className="bg-white border border-slate-200/60 text-slate-500 text-xs rounded-2xl px-4 py-3 shadow-2xs flex items-center gap-1.5 font-bold">
                  <Loader2 size={12} className="animate-spin text-blue-600" />
                  <span>A analisar legislação...</span>
                </div>
              </div>
            )}

            {/* Referência Invisível para Auto-Scroll */}
            <div ref={fimMensagensRef} />
          </div>

          {/* 💡 Atalhos Rápidos (Exibidos como Pílulas) */}
          {historico.length === 0 && (
            <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-1.5 shrink-0 select-none">
              {sugestoesRapidas.map((sugestao, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleEnviarMensagem(sugestao)}
                  className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 hover:border-blue-500 hover:text-blue-600 px-2.5 py-1.5 rounded-full transition-all cursor-pointer text-left max-w-full truncate"
                >
                  💡 {sugestao}
                </button>
              ))}
            </div>
          )}

          {/* Footer de Envio + Disclaimer */}
          <footer className="p-3 bg-white border-t border-slate-100 shrink-0 space-y-2">
            
            {/* Formulário de Input de Texto */}
            <form 
              onSubmit={(e) => { e.preventDefault(); handleEnviarMensagem(); }}
              className="flex gap-2"
            >
              <input
                type="text"
                placeholder="Escreva a sua dúvida aqui (ex: IVA, IMT, CAE)..."
                value={mensagem}
                onChange={e => setMensagem(e.target.value)}
                disabled={loading}
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={loading || !mensagem.trim()}
                className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all cursor-pointer disabled:opacity-40 shadow-sm shrink-0"
              >
                <Send size={14} />
              </button>
            </form>

            {/* Disclaimer obrigatório de conformidade legislativa */}
            <div className="flex items-start gap-1 text-[8.5px] text-slate-400 font-medium leading-normal text-left px-1">
              <Info size={10} className="shrink-0 mt-0.5 text-slate-300" />
              <span>
                As respostas da IA têm caráter meramente informativo e de apoio, não dispensando o aconselhamento de um Contabilista Certificado (CC) ou legislação em Diário da República.
              </span>
            </div>

          </footer>

        </div>
      )}

    </div>
  );
}