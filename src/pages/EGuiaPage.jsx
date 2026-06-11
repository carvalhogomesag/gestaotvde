/**
 * EGuiaPage.jsx
 * Localização: src/pages/EGuiaPage.jsx
 *
 * Página pública de exibição e download do eGuia Novo Motorista TVDE.
 * Possui barreira de segurança (só acede quem preencheu o formulário).
 */

import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import { 
  ArrowLeft, Download, Shield, Check, BookOpen, 
  ChevronRight, Printer, Clock, FileText, PhoneCall
} from 'lucide-react';

export default function EGuiaPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [gerandoPDF, setGerandoPDF] = useState(false);

  // Validação estrita do fluxo de autorização
  const isAuthorized = location.state?.authorized;

  useEffect(() => {
    if (!isAuthorized) {
      // Redireciona imediatamente para a Landing Page caso não tenha submetido o formulário
      navigate('/', { replace: true });
    }
  }, [isAuthorized, navigate]);

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-600 font-bold text-xs">A validar a sua autorização de acesso...</p>
        </div>
      </div>
    );
  }

  // Estrutura organizada de dados para renderização e exportação para PDF
  const conteudoGuia = {
    titulo: "GUIA DE ONBOARDING: Como se Tornar um Motorista TVDE em Portugal",
    subtitulo: "O Caminho Estratégico da Decisão à Primeira Viagem",
    introducao: {
      titulo: "Introdução: O Mercado TVDE e a Oportunidade em Portugal",
      paragrafos: [
        "Trabalhar como motorista TVDE em Portugal é sinónimo de autonomia, flexibilidade de horários e uma excelente oportunidade de rendimento diário. No entanto, desde a implementação da \"Lei TVDE\", o mercado tornou-se altamente regulamentado.",
        "Hoje, já não basta apenas ter uma carta de condução e um smartphone. Existe uma jornada burocrática rigorosa que separa quem quer trabalhar de quem realmente consegue colocar o carro na estrada. Este guia rápido foi desenhado para lhe dar uma visão clara e realista de todas as etapas obrigatórias.",
        "Prepare-se para conhecer o caminho, evitar os erros mais comuns que bloqueiam milhares de candidatos todos os meses e entender como se destacar profissionalmente."
      ]
    },
    fases: [
      {
        id: "fase1",
        numero: "Fase 1",
        titulo: "A Decisão e os Requisitos Críticos Iniciais",
        paragrafos: [
          "O seu processo começa no momento em que decide ser motorista. Mas, antes de gastar qualquer cêntimo em cursos ou exames, precisa validar se cumpre os critérios base exigidos por lei.",
          "Carta de Condução da Categoria B: É obrigatório ter a carta há mais de 3 anos.",
          "Registo Criminal Impecável: Para exercer a atividade de motorista TVDE, o seu registo criminal não pode conter antecedentes para determinados tipos de crimes (como crimes rodoviários graves, crimes contra as pessoas, entre outros).",
          "Idade Mínima: Alinhada com os tempos de carta exigidos por lei.",
          "⚠️ Atenção: Um erro comum nesta fase é avançar sem verificar a validade ou a certidão correta do Registo Criminal para fins específicos de motorista. Se o documento for emitido com o fim errado, o processo será rejeitado mais à frente."
        ]
      },
      {
        id: "fase2",
        numero: "Fase 2",
        titulo: "Aptidão Física e Mental (Grupo 2 e Psicotécnicos)",
        paragrafos: [
          "Para conduzir passageiros em regime de TVDE, a lei portuguesa exige que o motorista esteja inserido no chamado Grupo 2 de condutores (o mesmo grupo exigido para motoristas de ambulâncias, táxis e autocarros).",
          "Exame Médico do Grupo 2: Realizado por um médico que atestará as suas condições físicas e visuais.",
          "Exame Psicotécnico: Uma avaliação obrigatória feita por um psicólogo para testar os seus reflexos, atenção e estabilidade emocional para o exercício da profissão.",
          "Estes exames geram relatórios específicos que precisam de estar devidamente preenchidos e assinados de acordo com as normas exigidas pelas entidades reguladoras."
        ]
      },
      {
        id: "fase3",
        numero: "Fase 3",
        titulo: "A Formação Homologada TVDE",
        paragrafos: [
          "Nenhum motorista pode exercer a atividade sem o Curso de Formação Rodoviária para Motoristas TVDE. Este curso tem uma carga horária obrigatória por lei e só pode ser ministrado por escolas de condução ou entidades formadoras formalmente homologadas pelo IMT (Instituto da Mobilidade e dos Transportes).",
          "O curso aborda módulos vitais como: Condução defensiva e segurança rodoviária; Relações interpessoais e atendimento ao cliente; Legislação TVDE vigente em Portugal.",
          "💡 Dica de Ouro: Existem centenas de escolas no mercado, mas os preços, os horários e a rapidez na entrega do certificado final variam drasticamente. Escolher a escola errada pode significar semanas perdidas à espera de uma vaga ou de um certificado."
        ]
      },
      {
        id: "fase4",
        numero: "Fase 4",
        titulo: "O Labirinto do IMT (Emissão do Certificado e Código 997)",
        paragrafos: [
          "Esta é a fase onde 90% dos candidatos independentes cometem erros e acabam com os seus processos parados por meses. Após conseguir os exames e o curso, é necessário submeter todo o dossier ao IMT para solicitar a emissão do seu Certificado de Motorista TVDE e o averbamento do Código 997 na sua Carta de Condução.",
          "Esta etapa exige: Submissão eletrónica de ficheiros e formulários específicos; Organização minuciosa de toda a documentação acumulada nas fases anteriores; Pagamento das taxas estatais devidas ao IMT.",
          "Se um único ficheiro for submetido com qualidade baixa, rasurado ou fora do formato padrão, o IMT colocará o seu processo em \"comunique\", o que significa que voltará para o fim da fila de espera."
        ]
      },
      {
        id: "fase5",
        numero: "Fase 5",
        titulo: "Ativação nas Plataformas (Uber e Bolt)",
        paragrafos: [
          "Com o Certificado TVDE emitido pelo IMT em mãos, chega o momento de dar o passo final: a criação e ativação da sua conta de motorista nas plataformas parceiras (como a Uber e a Bolt).",
          "Nesta etapa, o motorista precisa de: Criar o perfil profissional na plataforma escolhida; Fazer o upload correto da documentação (Carta com Código 997, Certificado IMT, etc.); Associar-se a um parceiro de frota ativo (caso não opere com frota própria); Aprender o funcionamento prático da aplicação para aceitar viagens, gerir tarifas e garantir boas avaliações dos clientes desde o primeiro dia."
        ]
      }
    ],
    conclusao: {
      titulo: "Conclusão: O Atalho Profissional para Começar a Faturar",
      paragrafos: [
        "Como pôde ver, o caminho para se tornar um motorista TVDE legalizado em Portugal é claro, mas cheio de armadilhas burocráticas. Cada documento errado ou submissão falhada representa dias ou semanas sem poder trabalhar e faturar.",
        "Você não precisa passar por este stress sozinho.",
        "Na Gestão TVDE, nós criámos soluções completas para tratar de toda a burocracia por si, enquanto se foca no que realmente importa: preparar-se para o seu novo negócio."
      ]
    }
  };

  // Função para descarregar o PDF do Guia usando jsPDF
  const lidarComDownloadPDF = () => {
    setGerandoPDF(true);
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const margem = 20;
      const larguraPagina = 210;
      const alturaPagina = 297;
      const larguraConteudo = larguraPagina - (margem * 2);
      let y = 25;
      let numeroPagina = 1;

      // Helper para desenhar Cabeçalho e Rodapé
      const desenharHeaderFooter = (documento, pagina) => {
        documento.setFont('helvetica', 'normal');
        documento.setFontSize(8);
        documento.setTextColor(148, 163, 184); // slate-400
        // Header
        documento.text("eGuia Novo Motorista TVDE — Gestão TVDE Portugal", margem, 12);
        documento.line(margem, 14, larguraPagina - margem, 14);
        // Footer
        documento.text(`Página ${pagina}`, larguraPagina - margem - 15, alturaPagina - 10);
      };

      // Helper para verificar limite da folha e criar nova página
      const verificarQuebraDePagina = (espacoNecessario) => {
        if (y + espacoNecessario > alturaPagina - 20) {
          doc.addPage();
          numeroPagina++;
          desenharHeaderFooter(doc, numeroPagina);
          y = 25;
        }
      };

      // ─── PÁGINA DE CAPA / TÍTULO INICIAL ───────────────────────────────────
      desenharHeaderFooter(doc, numeroPagina);
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(15, 23, 42); // slate-900
      const titulosQuebrados = doc.splitTextToSize(conteudoGuia.titulo, larguraConteudo);
      doc.text(titulosQuebrados, margem, y);
      y += (titulosQuebrados.length * 8) + 4;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(59, 130, 246); // blue-500
      doc.text(conteudoGuia.subtitulo, margem, y);
      y += 15;

      // Separador Estético
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.line(margem, y, larguraPagina - margem, y);
      y += 12;

      // 1. Introdução
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text(conteudoGuia.introducao.titulo, margem, y);
      y += 8;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105); // slate-600

      conteudoGuia.introducao.paragrafos.forEach(p => {
        const pQuebrado = doc.splitTextToSize(p, larguraConteudo);
        const alturaBloco = pQuebrado.length * 5;
        verificarQuebraDePagina(alturaBloco + 4);
        doc.text(pQuebrado, margem, y);
        y += alturaBloco + 5;
      });

      // 2. Fases
      conteudoGuia.fases.forEach(fase => {
        verificarQuebraDePagina(15);
        y += 4;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(30, 41, 59); // slate-800
        doc.text(`${fase.numero}: ${fase.titulo}`, margem, y);
        y += 8;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(71, 85, 105);

        fase.paragrafos.forEach(p => {
          const pQuebrado = doc.splitTextToSize(p, larguraConteudo);
          const alturaBloco = pQuebrado.length * 5;
          verificarQuebraDePagina(alturaBloco + 4);
          doc.text(pQuebrado, margem, y);
          y += alturaBloco + 5;
        });
      });

      // 3. Conclusão
      verificarQuebraDePagina(20);
      y += 6;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text(conteudoGuia.conclusao.titulo, margem, y);
      y += 8;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);

      conteudoGuia.conclusao.paragrafos.forEach(p => {
        const pQuebrado = doc.splitTextToSize(p, larguraConteudo);
        const alturaBloco = pQuebrado.length * 5;
        verificarQuebraDePagina(alturaBloco + 4);
        doc.text(pQuebrado, margem, y);
        y += alturaBloco + 5;
      });

      // Salvar Ficheiro PDF
      doc.save("eGuia_Onboarding_TVDE_Portugal.pdf");
    } catch (err) {
      console.error("Erro na geração do PDF: ", err);
    } finally {
      setGerandoPDF(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased">
      
      {/* BARRA DE NAVEGAÇÃO SUPERIOR DO EGUIA */}
      <nav className="sticky top-0 z-50 bg-white border-b border-slate-200 px-4 py-4 shadow-xs">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <Link 
            to="/" 
            className="flex items-center gap-2 text-slate-600 hover:text-slate-950 font-bold text-xs transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Voltar ao Site</span>
          </Link>
          
          <button
            onClick={lidarComDownloadPDF}
            disabled={gerandoPDF}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50"
          >
            {gerandoPDF ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Download size={14} />
            )}
            <span>Descarregar Guia (PDF)</span>
          </button>
        </div>
      </nav>

      {/* ÁREA CENTRAL DE LEITURA (ESTILO DOCUMENTAÇÃO) */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        
        {/* CABEÇALHO DO ARTIGO */}
        <header className="space-y-4 text-center md:text-left mb-10 pb-8 border-b border-slate-200">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 text-[10px] font-black uppercase tracking-wider">
            <BookOpen size={12} />
            Leitura Online Liberada
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 leading-tight">
            {conteudoGuia.titulo}
          </h1>
          <p className="text-slate-500 font-bold text-sm sm:text-base">
            {conteudoGuia.subtitulo}
          </p>
          <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-400 justify-center md:justify-start">
            <span className="flex items-center gap-1"><Clock size={14} /> 7 min de leitura</span>
            <span className="flex items-center gap-1"><FileText size={14} /> Versão PDF A4 Disponível</span>
          </div>
        </header>

        {/* ARTIGO COMPLETO */}
        <article className="prose prose-slate max-w-none space-y-8 text-slate-700 text-sm sm:text-base leading-relaxed text-justify">
          
          {/* Introdução */}
          <section className="space-y-4">
            <h2 className="text-lg sm:text-xl font-black text-slate-900 border-l-4 border-blue-600 pl-3">
              {conteudoGuia.introducao.titulo}
            </h2>
            {conteudoGuia.introducao.paragrafos.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </section>

          {/* Fases */}
          {conteudoGuia.fases.map((fase) => (
            <section key={fase.id} className="space-y-4 pt-4">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 border-l-4 border-slate-800 pl-3">
                {fase.numero}: {fase.titulo}
              </h2>
              {fase.paragrafos.map((p, i) => (
                <p key={i} className={p.startsWith('⚠️') || p.startsWith('💡') ? "bg-amber-50/50 border border-amber-200 text-amber-900 px-4 py-3 rounded-xl text-xs sm:text-sm font-medium" : ""}>
                  {p}
                </p>
              ))}
            </section>
          ))}

          {/* Conclusão */}
          <section className="space-y-4 pt-6 border-t border-slate-200">
            <h2 className="text-lg sm:text-xl font-black text-slate-900 border-l-4 border-emerald-600 pl-3">
              {conteudoGuia.conclusao.titulo}
            </h2>
            {conteudoGuia.conclusao.paragrafos.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </section>

        </article>

        {/* 🛠️ PLANOS DE ASSESSORIA DE APOIO DOCUMENTAL NO FINAL DO GUIA */}
        <section className="mt-16 bg-slate-900 text-white rounded-3xl p-6 sm:p-10 text-left space-y-8">
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-400">Pronto para começar?</span>
            <h3 className="text-xl sm:text-2xl font-black">Os Nossos Planos de Assessoria</h3>
            <p className="text-slate-400 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Evite atrasos burocráticos e filas desnecessárias junto do IMT ou escolas de condução. Trate de tudo de forma organizada com o nosso apoio documental especializado.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 flex flex-col justify-between">
              <div className="space-y-3">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Essencial</span>
                <h4 className="text-base font-black">Apoio Documental</h4>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Orientação para providenciar a documentação obrigatória inicial (exames, psicotécnicos e registo criminal).
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-700 text-left">
                <span className="text-[9px] font-bold text-blue-400 uppercase tracking-wider">Apoio Documental</span>
              </div>
            </div>

            <div className="bg-slate-800 border-2 border-blue-500 rounded-2xl p-5 flex flex-col justify-between relative">
              <span className="absolute top-0 right-4 -translate-y-1/2 bg-blue-500 text-white text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
                Recomendado
              </span>
              <div className="space-y-3">
                <span className="text-[9px] font-bold text-blue-400 uppercase tracking-wider">Avançado</span>
                <h4 className="text-base font-black">Organização IMT</h4>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Apoio na organização completa do dossier de candidatura e submissão eletrónica junto do IMT para emissão do certificado.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-700 text-left">
                <span className="text-[9px] font-bold text-blue-400 uppercase tracking-wider">Organização IMT</span>
              </div>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 flex flex-col justify-between">
              <div className="space-y-3">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Premium</span>
                <h4 className="text-base font-black">Ativação & Instrução</h4>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Acompanhamento de ponta a ponta: apoio na etapa de formação, submissão ao IMT, criação de contas e instrução de apps.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-700 text-left">
                <span className="text-[9px] font-bold text-blue-400 uppercase tracking-wider">Ativação & Instrução</span>
              </div>
            </div>

          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800">
            <p className="text-[11px] sm:text-xs text-slate-400 text-center sm:text-left leading-relaxed">
              Quer acelerar o seu processo? Entre em contacto com um especialista da Gestão TVDE.
            </p>
            <a 
              href="https://gestaotvde.netlify.app/"
              className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-md shrink-0 cursor-pointer"
            >
              <PhoneCall size={14} />
              <span>Solicitar Assessoria</span>
            </a>
          </div>

        </section>

      </main>

    </div>
  );
}