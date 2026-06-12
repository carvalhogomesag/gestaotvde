/**
 * GeradorDistico.jsx
 * Localização: src/pages/GeradorDistico.jsx
 *
 * Serviço público gratuito para geração de dísticos TVDE regulamentares em Portugal.
 * Valida a licença, gera uma pré-visualização reativa e exporta um PDF A4 100% à escala legal com marcas de corte [2].
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import { 
  ArrowLeft, Download, ShieldCheck, Printer, AlertTriangle, 
  HelpCircle, Info, Sparkles, CheckCircle2 
} from 'lucide-react';
import ReactGA from 'react-ga4';

export default function GeradorDistico() {
  const [licenca, setLicenca] = useState("");
  const [erro, setErro] = useState("");
  const [gerando, setGerando] = useState(false);

  // Expressão regular para validar a licença: 6 dígitos, uma barra e o ano de 4 dígitos
  const regexLicenca = /^\d{6}\/\d{4}$/;

  // Formatador automático do input à medida que o utilizador digita
  const handleInputChange = (e) => {
    setErro("");
    let val = e.target.value.replace(/\D/g, ''); // Remove tudo o que não for dígito

    if (val.length > 6) {
      val = val.slice(0, 6) + '/' + val.slice(6, 10);
    }
    setLicenca(val);
  };

  // Função para desenhar e descarregar o PDF regulamentar no formato A4 a 100% de escala
  const handleGerarPDF = () => {
    if (!regexLicenca.test(licenca)) {
      setErro("Por favor, introduza a licença no formato correto: 6 dígitos, barra e ano (ex: 123456/2018).");
      return;
    }

    setGerando(true);

    try {
      // Inicializar o PDF em formato A4 vertical (portrait) em milímetros
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // ─── DIMENSÕES REAIS DO DÍSTICO TVDE PT ───────────────────────────────
      const larguraDistico = 145; // mm
      const alturaDistico = 68;   // mm
      const espessuraBorda = 5;   // mm

      // Posicionamento centralizado na folha A4 (210mm x 297mm)
      const x = (210 - larguraDistico) / 2; // 32.5 mm
      const y = (297 - alturaDistico) / 2;  // 114.5 mm

      // ─── 1. DESENHO DAS MARCAS DE CORTE TRACEJADAS (HAIRLINES) ─────────────
      doc.setDrawColor(180, 180, 180); // cinzento suave
      doc.setLineWidth(0.2); // espessura fina para não carregar o corte

      // Marcas Canto Superior Esquerdo
      doc.line(x - 8, y, x, y);
      doc.line(x, y - 8, x, y);

      // Marcas Canto Superior Direito
      doc.line(x + larguraDistico, y, x + larguraDistico + 8, y);
      doc.line(x + larguraDistico, y - 8, x + larguraDistico, y);

      // Marcas Canto Inferior Esquerdo
      doc.line(x - 8, y + alturaDistico, x, y + alturaDistico);
      doc.line(x, y + alturaDistico, x, y + alturaDistico + 8);

      // Marcas Canto Inferior Direito
      doc.line(x + larguraDistico, y + alturaDistico, x + larguraDistico + 8, y + alturaDistico);
      doc.line(x + larguraDistico, y + alturaDistico, x + larguraDistico, y + alturaDistico + 8);

      // ─── 2. DESENHO DO DÍSTICO REGULAMENTAR ────────────────────────────────
      // jsPDF desenha a borda a partir do centro da linha. Para obtermos
      // exatamente 145x68mm de tamanho externo com borda de 5mm, compensamos as coordenadas:
      doc.setDrawColor(0, 0, 0); // preto sólido
      doc.setFillColor(255, 255, 255); // fundo branco
      doc.setLineWidth(espessuraBorda);
      
      doc.rect(
        x + (espessuraBorda / 2), 
        y + (espessuraBorda / 2), 
        larguraDistico - espessuraBorda, 
        alturaDistico - espessuraBorda, 
        "FD"
      );

      // ─── 3. TEXTO "TVDE" CENTRADO ──────────────────────────────────────────
      doc.setFont("helvetica", "bold");
      doc.setFontSize(100); // Fonte grande para ocupar a largura interior de 135mm
      doc.setTextColor(0, 0, 0);
      doc.text("TVDE", 105, 149.5, { align: "center" }); // 105 é o centro da página A4

      // ─── 4. SUBTEXTO DA LICENÇA DE OPERADOR (ALINHADO À DIREITA) ───────────
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11); // Tamanho regulamentar para subtexto legível
      // Alinhado ligeiramente recuado em relação à borda preta direita
      doc.text(`Licença de Operador nº ${licenca}`, 168, 172.5, { align: "right" });

      // ─── 5. INSTRUÇÕES DE IMPRESSÃO (FORA DO DÍSTICO - BASE DA FOLHA) ──────
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text("⚠️ INSTRUÇÕES DE IMPRESSÃO IMPORTANTES (LEIA ANTES DE IMPRIMIR):", 20, 240);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105); // slate-600
      doc.text("1. Configurações da Impressora: Imprima este ficheiro em tamanho real (Escala a 100%). NUNCA selecione 'ajustar à página'.", 20, 246);
      doc.text("2. Tipo de Papel: Recomenda-se a utilização de uma folha de papel branca ou cartolina com gramagem superior (ex: 120g a 200g).", 20, 251);
      doc.text("3. Aplicação do Dístico: Recorte cuidadosamente ao longo das marcas tracejadas cinzentas exteriores do dístico.", 20, 256);
      doc.text("4. Afixação Legal: Fixe as duas cópias (uma no vidro dianteiro direito e outra no vidro traseiro esquerdo) pelo interior do carro.", 20, 261);

      // Rodapé institucional na folha de impressão
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text("Serviço Gratuito de Utilidade Pública — Gestão TVDE Portugal", 105, 275, { align: "center" });

      // Rastreamento Analítico do Google Analytics 4
      ReactGA.event({
        category: 'Free Service',
        action: 'Gerou_Distico_TVDE',
        label: licenca
      });

      // Gravação e download do ficheiro
      doc.save(`Distico_TVDE_Licenca_${licenca.replace('/', '_')}.pdf`);

    } catch (err) {
      console.error("[GeradorDistico] Erro técnico de exportação:", err);
      setErro("Ocorreu um erro ao processar o seu ficheiro PDF. Por favor, tente de novo.");
    } finally {
      setGerando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased">
      
      {/* BARRA DE NAVEGAÇÃO SUPERIOR */}
      <nav className="sticky top-0 z-50 bg-white border-b border-slate-200 px-4 py-4 shadow-xs">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <Link 
            to="/" 
            className="flex items-center gap-2 text-slate-600 hover:text-slate-950 font-bold text-xs transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Voltar ao Site</span>
          </Link>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-black text-slate-900">Gestão</span>
            <span className="text-sm font-black text-blue-600">TVDE</span>
            <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md">
              Serviço Gratuito
            </span>
          </div>
        </div>
      </nav>

      {/* ÁREA CENTRAL DO GERADOR */}
      <main className="max-w-6xl mx-auto px-4 py-12 space-y-12">
        
        {/* Cabeçalho da Página */}
        <div className="text-center space-y-3 max-w-xl mx-auto">
          <div className="inline-flex items-center gap-1.5 justify-center text-xs font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
            <Printer size={14} />
            Impressão Regulamentar TVDE
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
            Gerador de Dístico TVDE Gratuito
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
            Gere o dístico regulamentar em formato PDF pronto a imprimir à escala real exata (145x68mm) com as marcas de corte legais [2].
          </p>
        </div>

        {/* Painel de Controlo e Pré-Visualização */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start max-w-5xl mx-auto">
          
          {/* Lado Esquerdo: Formulário */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs space-y-6 text-left">
            <div className="space-y-2">
              <h3 className="text-base font-black text-slate-900">Configurar Licença</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Introduza os dados da licença de operador TVDE da sua empresa parceira ou frota [2]. O dístico legal exige o formato: <strong>6 dígitos / Ano</strong> [2].
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  N.º da Licença de Operador
                </label>
                <input
                  type="text"
                  placeholder="Ex: 123456/2018"
                  value={licenca}
                  onChange={handleInputChange}
                  maxLength="11"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 uppercase placeholder-slate-300"
                />
              </div>

              {erro && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-xs font-semibold text-red-700 leading-relaxed">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{erro}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleGerarPDF}
                disabled={gerando || !regexLicenca.test(licenca)}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-40 cursor-pointer"
              >
                {gerando ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Download size={14} />
                )}
                Descarregar PDF Pronto a Imprimir
              </button>
            </div>

            {/* Aviso Técnico / Regulamentar */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-2 flex gap-2">
              <Info size={20} className="shrink-0 text-slate-400" />
              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Regra de Fiscalização</span>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  O dístico TVDE impresso não deve ser deformado ou modificado. A utilização de cópias de dístico deformadas, rasuradas ou de tamanho incorreto pode ser punida com coimas pesadas pelas autoridades [2].
                </p>
              </div>
            </div>

          </div>

          {/* Lado Direito: Pré-Visualização Física Real Reativa */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xs space-y-4">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1 text-left">
                <Sparkles size={12} className="text-blue-500" /> Pré-visualização do dístico no ecrã
              </span>

              {/* Caixa da placa TVDE com proporções 145x68mm real */}
              <div className="w-full bg-slate-100 rounded-2xl p-6 sm:p-12 flex items-center justify-center border border-dashed border-slate-200 select-none">
                
                <div className="w-full max-w-sm aspect-[145/68] bg-white border-[10px] sm:border-[14px] border-black flex flex-col justify-between p-3 relative shadow-md">
                  
                  {/* Espaço Vazio para compensar alinhamento vertical */}
                  <div></div>

                  {/* Letras Centradas "TVDE" */}
                  <div className="text-slate-900 font-black text-4xl sm:text-5xl md:text-6xl tracking-widest text-center">
                    TVDE
                  </div>

                  {/* Número de licença ao canto inferior direito */}
                  <div className="text-[8px] sm:text-[10px] font-normal text-slate-900 text-right pr-2">
                    {licenca ? (
                      <span>Licença de Operador nº {licenca}</span>
                    ) : (
                      <span className="text-slate-300 italic">Licença de Operador nº xxxxxx/AAAA</span>
                    )}
                  </div>

                </div>

              </div>

              {/* Nota sobre marcas de corte */}
              <p className="text-[10px] text-slate-400 italic text-center leading-relaxed">
                * O PDF gerado incluirá marcas de corte para que possa recortar perfeitamente a placa a 145mm de largura por 68mm de altura [2].
              </p>

            </div>
          </div>

        </div>

      </main>

    </div>
  );
}