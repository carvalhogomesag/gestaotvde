/**
 * Blog.jsx
 * Localização: src/pages/Blog.jsx
 *
 * Módulo de Blog público integrado com índice de artigos e leitor dinâmico.
 * Otimizado para SEO em Portugal com base nos termos mais pesquisados do AnswerThePublic.
 */

import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, BookOpen, Clock, Calendar, ShieldCheck, 
  ChevronRight, PhoneCall, FileText, Sparkles, Scale, AlertTriangle 
} from 'lucide-react';
import { formatDatePT } from '../utils/formatters';

// Base de Dados de Artigos do Blog (Conteúdos Estáticos e Completos Otimizados para SEO)
const ARTIGOS = [
  {
    id: 1,
    slug: "cae-correto-tvde-isencao-iva-artigo-53",
    titulo: "Abertura de Atividade TVDE: Qual o CAE Correto e como Funciona a Isenção de IVA?",
    resumo: "Descubra qual o Código de Atividade Económica (CAE) obrigatório para motoristas em Portugal e como beneficiar do regime de isenção de IVA ao abrigo do Artigo 53.º do CIVA.",
    categoria: "Fiscalidade & Contabilidade",
    dataPublicacao: "2026-06-12T08:00:00.000Z",
    tempoLeitura: "5 min",
    imagemCapa: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80",
    conteudoCompleto: (
      <div className="space-y-6 text-slate-700 leading-relaxed text-sm sm:text-base">
        <p>
          Iniciar atividade profissional como motorista de plataformas em Portugal exige uma passagem obrigatória pelas Finanças [2]. No entanto, uma das maiores dúvidas de quem começa é saber que enquadramento fiscal escolher para faturar legalmente e evitar surpresas no final do ano fiscal.
        </p>

        <h3 className="text-lg font-black text-slate-900 pt-2">1. Qual o CAE Correto para TVDE?</h3>
        <p>
          Quer opte por trabalhar em Nome Individual (Recibos Verdes) ou por abrir uma empresa de cariz comercial (Unipessoal Lda. ou Lda.), o código de atividade exigido pela Autoridade Tributária e Aduaneira em Portugal é o <strong>CAE 49320</strong> (*Transporte ocasional de passageiros em veículos ligeiros*).
        </p>
        <p>
          Este código de classificação engloba as atividades de transporte de passageiros em veículos descaracterizados a partir de plataforma eletrónica, garantindo que o seu faturamento nas plataformas seja reportado sob a natureza legal correta.
        </p>

        <h3 className="text-lg font-black text-slate-900 pt-2">2. Como funciona a Isenção de IVA (Artigo 53.º do CIVA)?</h3>
        <p>
          Para os motoristas que decidem atuar em nome próprio como Empresários em Nome Individual (ENI), a lei portuguesa oferece uma vantagem significativa para quem está a começar a faturar. 
        </p>
        <p>
          Ao abrigo do <strong>Artigo 53.º do Código do IVA (CIVA)</strong>, fica isento de cobrar ou declarar IVA se o seu volume de negócios (faturamento bruto estimado) não ultrapassar o teto legal de <strong>15.000 € por ano civil</strong>.
        </p>
        <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-2xl text-xs sm:text-sm font-semibold flex gap-2">
          <AlertTriangle size={20} className="shrink-0 text-amber-600" />
          <div>
            <p className="font-bold">Regra de Proporcionalidade:</p>
            <p className="font-normal mt-1">
              Atenção! Se abrir atividade a meio do ano civil, o teto de 15.000 € é calculado proporcionalmente aos meses restantes de faturamento. Ultrapassar este teto proporcional obriga à transição imediata para o regime normal de IVA à taxa de 23%.
            </p>
          </div>
        </div>

        <h3 className="text-lg font-black text-slate-900 pt-2">3. O que acontece se ultrapassar os 15.000 €?</h3>
        <p>
          Caso o seu faturamento real ou previsto ultrapasse o limite de 15.000 € (ou ultrapasse a tolerância de 18.750 € no próprio ano), passará automaticamente para o <strong>Regime Normal de IVA (23%)</strong>. 
        </p>
        <p>
          A partir desse momento, as faturas e recibos que emite para o seu Operador ou para as plataformas devem incluir a liquidação de IVA. Adicionalmente, as comissões cobradas pela Uber e pela Bolt (que também estão sujeitas a regras de faturação europeia sob o regime de *reverse charge*) passam a exigir uma gestão contabilística minuciosa.
        </p>

        <h3 className="text-lg font-black text-slate-900 pt-2">4. Autofaturação e Recibos Verdes</h3>
        <p>
          As plataformas Uber e Bolt não emitem faturas comuns de prestação de serviços diretas de forma manual. Elas operam sob acordos de <strong>autofaturação</strong>. Semanalmente, os sistemas emitem e registam faturas automáticas em nome do motorista ou do operador, correspondentes às viagens liquidadas. Cabe ao motorista ou ao seu contabilista garantir que estes registos são validados e integrados junto do portal das Finanças.
        </p>

        <div className="border-t border-slate-200 pt-4 mt-6">
          <p className="text-[10px] text-slate-400 italic">
            Nota: Esta informação é de caráter meramente informativo e de apoio comercial, não dispensando de forma alguma a consulta de legislação oficial em Diário da República ou o apoio contínuo de um Contabilista Certificado (CC).
          </p>
        </div>
      </div>
    )
  },
  {
    id: 2,
    slug: "requisitos-licenca-imt-codigo-997",
    titulo: "Como obter o Certificado de Motorista TVDE e o Código 997 na Carta?",
    resumo: "Um guia prático sobre os exames médicos, escolas de formação rodoviária homologadas e os passos para averbar o Código 997 e conseguir a licença do IMT em Portugal.",
    categoria: "Requisitos & IMT",
    dataPublicacao: "2026-06-11T14:30:00.000Z",
    tempoLeitura: "6 min",
    imagemCapa: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=800&q=80",
    conteudoCompleto: (
      <div className="space-y-6 text-slate-700 leading-relaxed text-sm sm:text-base">
        <p>
          O mercado TVDE em Portugal é rigorosamente regulado. Já lá vai o tempo em que bastava ter uma conta de utilizador ativa e começar a conduzir passageiros. Hoje, para estar apto e legalizado, existe um conjunto de exames, cursos e autorizações governamentais que deve concluir [2].
        </p>

        <h3 className="text-lg font-black text-slate-900 pt-2">1. Os Requisitos de Base Obrigatórios</h3>
        <p>
          Antes de avançar para a inscrição em qualquer escola ou clínica, deve garantir que cumpre cumulativamente as seguintes regras básicas [2]:
        </p>
        <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm font-medium text-slate-600">
          <li><strong>Carta de Condução Categoria B</strong>: Obbtida há mais de 3 anos (requisito legal absoluto).</li>
          <li><strong>Idade Mínima</strong>: 21 anos (associada aos 3 anos de experiência mínima de condução exigida por lei).</li>
          <li><strong>Registo Criminal Limpo</strong>: Focado especificamente no exercício da profissão TVDE [2].</li>
        </ul>

        <h3 className="text-lg font-black text-slate-900 pt-2">2. Aptidão Médica e Psicotécnica (Grupo 2)</h3>
        <p>
          Por se tratar de transporte público de passageiros, o condutor deve pertencer ao <strong>Grupo 2 de condutores</strong> [2]. Isto exige:
        </p>
        <p>
          <strong>Exame Médico do Grupo 2:</strong> Realizado por um médico certificado, que valida a aptidão física e visão [2].
        </p>
        <p>
          <strong>Avaliação Psicotécnica:</strong> Exame psicotécnico conduzido por um psicólogo creditado, focado em reflexos, estabilidade emocional, controlo de stresse e capacidade de atenção [2].
        </p>

        <h3 className="text-lg font-black text-slate-900 pt-2">3. O Curso de Formação Homologada (125 Horas)</h3>
        <p>
          O motorista TVDE deve frequentar obrigatoriamente o <strong>Curso de Formação Rodoviária para Motoristas TVDE (CFRTVDE)</strong> [2]. Este curso possui uma carga horária mínima legal de <strong>125 horas</strong> (divididas em formação teórica e prática de condução defensiva) [2].
        </p>
        <p>
          A formação aborda legislação rodoviária, mecânica básica, atendimento ao cliente, condução defensiva urbana e relações interpessoais [2]. Nota: este curso só é válido se ministrado por uma escola de condução ou entidade certificada formalmente homologada pelo IMT [2].
        </p>

        <h3 className="text-lg font-black text-slate-900 pt-2">4. O Averbamento do Código 997 e o Pedido ao IMT</h3>
        <p>
          Concluído o curso e os exames de Grupo 2, o motorista TVDE deve submeter todo o dossier eletrónico através do portal do IMT online [2].
        </p>
        <p>
          Este pedido irá resultar no averbamento do <strong>Código 997</strong> no verso da sua Carta de Condução física e na emissão do seu **Certificado de Motorista TVDE** [2]. A falta deste dístico técnico impossibilita a ativação da sua conta de motorista nas aplicações parceiras da Uber e Bolt [2].
        </p>

        <div className="border-t border-slate-200 pt-4 mt-6">
          <p className="text-[10px] text-slate-400 italic">
            Nota: Esta informação é de caráter meramente informativo e de apoio comercial, não dispensando de forma alguma a consulta de legislação oficial em Diário da República ou o apoio contínuo do IMT.
          </p>
        </div>
      </div>
    )
  },
  {
    id: 3,
    slug: "distico-tvde-regulamento-onde-comprar-fiscalizacao",
    titulo: "Dístico TVDE em Portugal: Onde Comprar, Regras e como Evitar Coimas?",
    resumo: "Entenda a regulamentação dos dísticos TVDE obrigatórios (placas) em Portugal, a proibição de cópias em papel comum e como passar com sucesso nas fiscalizações de trânsito.",
    categoria: "Regulamento de Frota",
    dataPublicacao: "2026-06-10T11:15:00.000Z",
    tempoLeitura: "4 min",
    imagemCapa: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=800&q=80",
    conteudoCompleto: (
      <div className="space-y-6 text-slate-700 leading-relaxed text-sm sm:text-base">
        <p>
          As viaturas que operam ao serviço das plataformas Uber e Bolt são consideradas legalmente veículos ligeiros descaracterizados [2]. No entanto, para garantir que as forças de segurança (como a PSP, GNR e inspetores da ACT e IMT) identifiquem a viatura em exercício de funções, a lei portuguesa exige a afixação visível de dísticos de identificação [2].
        </p>

        <h3 className="text-lg font-black text-slate-900 pt-2">1. Como e Onde Devem ser Afixados os Dísticos TVDE?</h3>
        <p>
          O dístico TVDE é uma placa retangular, amarela, com a inscrição "TVDE" a preto. A lei determina a afixação obrigatória de <strong>dois dísticos idênticos</strong> por viatura:
        </p>
        <ul className="list-disc pl-5 space-y-1 text-slate-600 text-xs sm:text-sm font-medium">
          <li><strong>Dístico Dianteiro:</strong> Afixado no canto inferior direito do para-brisas (pelo interior, no lado do passageiro).</li>
          <li><strong>Dístico Traseiro:</strong> Afixado no canto inferior esquerdo do vidro traseiro (pelo interior, no lado oposto ao condutor).</li>
        </ul>
        <p>
          Ambos os dísticos devem estar completamente desimpedidos, livres de quaisquer películas ou decorações de vidro que impeçam a sua leitura clara pelo exterior do veículo.
        </p>

        <h3 className="text-lg font-black text-slate-900 pt-2">2. É Permitido Usar Dísticos de Papel Impressos?</h3>
        <p>
          Esta é uma causa comum de contraordenações e coimas pesadas em Portugal. <strong>Não é permitido imprimir o dístico em papel simples de impressora de escritório comum</strong>.
        </p>
        <p>
          A regulamentação do IMT exige que o dístico possua propriedades de rigidez e espessura específicas (normalmente acrílico ou material plástico homologado de alta resistência) com as dimensões oficiais exatas. Dísticos em papel que se deformem com a humidade, sol ou calor são considerados infrações, originando autos de coima em fiscalizações rodoviárias.
        </p>

        <h3 className="text-lg font-black text-slate-900 pt-2">3. Onde Comprar Placas Regulamentares?</h3>
        <p>
          As placas devem ser adquiridas em lojas de acessórios auto, centros de impressão industrial de matrículas homologados ou através de operadores de frota credenciados. Garanta sempre que a loja ou fornecedor confirma que a placa segue rigorosamente as dimensões, o tom de amarelo e os acabamentos regulados por lei.
        </p>

        <h3 className="text-lg font-black text-slate-900 pt-2">4. Quem Fiscaliza a Atividade na Estrada?</h3>
        <p>
          A fiscalização da atividade TVDE em Portugal é efetuada por várias entidades:
        </p>
        <ul className="list-disc pl-5 space-y-1 text-slate-600 text-xs sm:text-sm font-medium">
          <li><strong>GNR e PSP:</strong> Fiscalização rodoviária, verificação de seguros específicos e averbamento do Código 997 [2].</li>
          <li><strong>IMT:</strong> Conformidade das licenças de operador da empresa e dísticos de motoristas [2].</li>
          <li><strong>ACT (Autoridade para as Condições do Trabalho):</strong> Fiscalização das relações laborais, garantindo que motoristas de frotas possuem contratos válidos de trabalho ou de prestação de serviços declarados [2].</li>
        </ul>

        <div className="border-t border-slate-200 pt-4 mt-6">
          <p className="text-[10px] text-slate-400 italic">
            Nota: Esta informação é de caráter meramente informativo e de apoio comercial, não dispensando de forma alguma a consulta de legislação oficial em Diário da República ou o apoio contínuo do IMT.
          </p>
        </div>
      </div>
    )
  },
  {
    id: 4,
    slug: "aima-atrasos-documentais-motoristas-tvde",
    titulo: "AIMA e TVDE: Como Lidar com os Atrasos Documentais para Motoristas Estrangeiros?",
    resumo: "Análise sobre como os atrasos de agendamentos e emissões documentais da AIMA afetam os motoristas TVDE imigrantes e quais as alternativas legais de conformidade.",
    categoria: "Regularização & Migrações",
    dataPublicacao: "2026-06-09T09:00:00.000Z",
    tempoLeitura: "5 min",
    imagemCapa: "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&w=800&q=80",
    conteudoCompleto: (
      <div className="space-y-6 text-slate-700 leading-relaxed text-sm sm:text-base">
        <p>
          O mercado TVDE em Portugal é caracterizado por uma forte componente multicultural, atraindo milhares de motoristas de países terceiros (especialmente do Brasil, PALOP e Sul da Ásia). No entanto, a transição do antigo SEF para a <strong>AIMA (Agência para a Integração, Migrações e Asilo)</strong> trouxe desafios burocráticos significativos e atrasos que afetam diretamente o direito ao trabalho destes condutores.
        </p>

        <h3 className="text-lg font-black text-slate-900 pt-2">1. O Impacto dos Atrasos na Emissão de Licenças</h3>
        <p>
          Para obter o Certificado de Motorista TVDE junto do IMT, o motorista imigrante tem de apresentar, além do registo criminal e curso homologado, um documento de residência válido em território nacional [2].
        </p>
        <p>
          Com os atrasos persistentes da AIMA na concessão e renovação de **Autorizações de Residência (AR)** e na análise de manifestações de interesse, milhares de motoristas veem-se bloqueados, incapazes de iniciar ou renovar o seu Certificado de Motorista no portal do IMT.
        </p>

        <h3 className="text-lg font-black text-slate-900 pt-2">2. Manifestação de Interesse e Vistos de Procura de Trabalho</h3>
        <p>
          O IMT apenas aceita documentos que atestem a legalidade de permanência e de direito ao trabalho em Portugal. Atualmente, os documentos mais comuns aceites nas candidaturas TVDE para cidadãos estrangeiros são:
        </p>
        <ul className="list-disc pl-5 space-y-1 text-slate-600 text-xs sm:text-sm font-medium">
          <li><strong>Título de Residência Válido:</strong> Físico ou em formato digital certificado [2].</li>
          <li><strong>Visto de Procura de Trabalho / Residência:</strong> Emitido nos consulados de origem, com o devido enquadramento legal de entrada [2].</li>
          <li><strong>Manifestação de Interesse com Recibo de Submissão:</strong> Aceite pelo IMT sob regimes transitórios específicos, desde que acompanhado por contrato de trabalho ou abertura de atividade em vigor [2].</li>
        </ul>

        <h3 className="text-lg font-black text-slate-900 pt-2">3. O Erro do Registo Criminal</h3>
        <p>
          Candidatos estrangeiros enfrentam uma armadilha burocrática dupla: devem apresentar o Registo Criminal do país de nacionalidade (devidamente apostilado na Haia ou consularizado) e o Registo Criminal português [2].
        </p>
        <p>
          Ambos os documentos devem ser requeridos para o fim específico de <strong>"Motorista de TVDE"</strong> [2]. Um registo criminal geral para "fim comercial" ou "trabalho geral" emitido pelo país de origem será recusado pelo IMT, obrigando a reiniciar o processo do zero e a sofrer novas semanas de atraso.
        </p>

        <h3 className="text-lg font-black text-slate-900 pt-2">4. Como a Gestão TVDE Apoia Estes Processos?</h3>
        <p>
          Como assessoria documental especializada, não conseguimos acelerar os agendamentos da AIMA, mas garantimos que <strong>todo o dossiê do motorista seja submetido sem erros ao IMT</strong>.
        </p>
        <p>
          Analisamos os seus documentos de vistos, certidões criminais estrangeiras e averbamentos antes de serem submetidos, evitando que o IMT coloque o seu processo em estado de "Comunique" (o que causaria a rejeição temporária do pedido e meses adicionais de paragem laboral).
        </p>

        <div className="border-t border-slate-200 pt-4 mt-6">
          <p className="text-[10px] text-slate-400 italic">
            Nota: Esta informação é de caráter meramente informativo e de apoio comercial, não dispensando de forma alguma a consulta oficial do Diário da República ou aconselhamento profissional de advogados especialistas em migrações.
          </p>
        </div>
      </div>
    )
  }
];

export default function Blog() {
  const { slug } = useParams();

  // Verifica se estamos em modo Leitura de Artigo
  const artigoAtivo = slug ? ARTIGOS.find(a => a.slug === slug) : null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased">
      
      {/* ─── BARRA DE NAVEGAÇÃO SUPERIOR DO BLOG ────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white border-b border-slate-200 px-4 py-4 shadow-xs">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <Link 
            to="/" 
            className="flex items-center gap-2 text-slate-600 hover:text-slate-950 font-bold text-xs transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Voltar à Landing Page</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-slate-900">Gestão</span>
            <span className="text-sm font-black text-blue-600">TVDE</span>
            <span className="text-[9px] font-black uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded-md text-slate-500 border border-slate-200">
              Blog & SEO
            </span>
          </div>
        </div>
      </nav>

      {/* ─── 1. MODO: LEITOR DE ARTIGO INDIVIDUAL ──────────────────────────────── */}
      {artigoAtivo ? (
        <div className="max-w-6xl mx-auto px-4 py-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Lado Esquerdo: Conteúdo do Artigo */}
          <article className="lg:col-span-8 bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xs space-y-6 text-left">
            
            <Link 
              to="/blog" 
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
            >
              <ArrowLeft size={14} /> Voltar à lista de artigos
            </Link>

            <header className="space-y-4">
              <span className="inline-block text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-100 px-2.5 py-1 rounded-md">
                {artigoAtivo.categoria}
              </span>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 leading-tight">
                {artigoAtivo.titulo}
              </h1>
              <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-400">
                <span className="flex items-center gap-1"><Calendar size={14} /> {formatDatePT(new Date(artigoAtivo.dataPublicacao))}</span>
                <span className="flex items-center gap-1"><Clock size={14} /> {artigoAtivo.tempoLeitura} de leitura</span>
              </div>
            </header>

            {/* Imagem de Capa do Artigo */}
            <div className="w-full h-56 sm:h-80 bg-slate-100 rounded-2xl overflow-hidden shadow-inner">
              <img 
                src={artigoAtivo.imagemCapa} 
                alt={artigoAtivo.titulo} 
                className="w-full h-full object-cover"
              />
            </div>

            {/* Corpo do Artigo */}
            <div className="pt-2">
              {artigoAtivo.conteudoCompleto}
            </div>

          </article>

          {/* Lado Direito: Barra Lateral de Conversão (CTA) */}
          <aside className="lg:col-span-4 space-y-6 text-left sticky top-24">
            
            <div className="bg-slate-950 text-white rounded-3xl p-6 shadow-xl space-y-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1 bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded text-[10px] font-bold">
                  <Sparkles size={10} className="animate-pulse" />
                  Facilitamos a Burocracia
                </div>
                <h4 className="text-lg font-black leading-tight">Precisa de Assessoria no seu Processo TVDE?</h4>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Não perca semanas a decifrar portais estatais do IMT ou Finanças. Tratamos de toda a organização documental, encaminhamento de exames e submissão por si.
                </p>
              </div>

              <div className="space-y-3 pt-2 text-xs font-semibold text-slate-200">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-blue-500 shrink-0" />
                  <span>Apoio na abertura do CAE correto</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-blue-500 shrink-0" />
                  <span>Submissão correta no IMT (Código 997)</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-blue-500 shrink-0" />
                  <span>Vinculação a Operadores parceiros</span>
                </div>
              </div>

              <Link 
                to="/"
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
              >
                <PhoneCall size={14} />
                Falar com um Consultor
              </Link>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
              <h5 className="text-sm font-black text-slate-900">📖 Descarregue o eGuia Completo</h5>
              <p className="text-slate-500 text-xs leading-relaxed">
                Preencha os dados na página inicial para obter o eGuia de Onboarding e as melhores práticas comerciais para faturar mais.
              </p>
              <Link 
                to="/"
                className="inline-flex items-center gap-1.5 text-xs font-black text-blue-600 hover:text-blue-700 transition-colors"
              >
                Aceder ao eGuia Grátis <ChevronRight size={14} />
              </Link>
            </div>

          </aside>

        </div>
      ) : (
        
        // ─── 2. MODO: ÍNDICE DO BLOG (GRID DE ARTIGOS) ───────────────────────────
        <div className="max-w-6xl mx-auto px-4 py-12 space-y-12">
          
          {/* Cabeçalho da Lista */}
          <div className="text-center space-y-3 max-w-xl mx-auto">
            <div className="inline-flex items-center gap-1.5 justify-center text-xs font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
              <BookOpen size={14} />
              Blog Central do Motorista
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
              Tudo o que precisa de saber sobre TVDE em Portugal
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
              Esclareça de forma exata e fundamentada as suas dúvidas sobre CAE, fiscalidade, dísticos obrigatórios, IMT e regularização documental [2, 3].
            </p>
          </div>

          {/* Grelha de Artigos */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8 items-stretch">
            {ARTIGOS.map((artigo) => (
              <div 
                key={artigo.id}
                className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xs flex flex-col justify-between hover:shadow-md transition-shadow group text-left"
              >
                <div className="space-y-4">
                  {/* Foto de Capa */}
                  <div className="w-full h-48 bg-slate-100 relative overflow-hidden">
                    <img 
                      src={artigo.imagemCapa} 
                      alt={artigo.titulo} 
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                    />
                    <span className="absolute top-3 left-3 text-[9px] font-black uppercase tracking-wider bg-white/95 text-slate-900 px-2.5 py-1 rounded-md border border-slate-200">
                      {artigo.categoria}
                    </span>
                  </div>

                  {/* Detalhes Técnicos */}
                  <div className="px-5 sm:px-6 space-y-2">
                    <div className="flex gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <span className="flex items-center gap-1"><Calendar size={12} /> {formatDatePT(new Date(artigo.dataPublicacao))}</span>
                      <span className="flex items-center gap-1"><Clock size={12} /> {artigo.tempoLeitura}</span>
                    </div>

                    <h2 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-blue-600 transition-colors leading-tight">
                      {artigo.titulo}
                    </h2>
                    
                    <p className="text-xs text-slate-500 leading-relaxed font-medium">
                      {artigo.resumo}
                    </p>
                  </div>
                </div>

                <div className="p-5 sm:px-6 shrink-0 pt-4 border-t border-slate-50 flex justify-end">
                  <Link
                    to={`/blog/${artigo.slug}`}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Ler Artigo <ChevronRight size={14} />
                  </Link>
                </div>

              </div>
            ))}
          </div>

          {/* Banner de Encerramento Inferior */}
          <section className="bg-slate-900 text-white rounded-3xl p-6 sm:p-10 text-left space-y-4 max-w-4xl mx-auto">
            <h4 className="text-lg font-black">Pretende iniciar atividade na estrada sem dores de cabeça?</h4>
            <p className="text-slate-400 text-xs sm:text-sm max-w-xl leading-relaxed">
              Dispomos de pacotes completos de assessoria documental chave-na-mão para tratar de toda a burocracia do IMT, abertura de atividade em Finanças e integração em frotas idóneas.
            </p>
            <div className="pt-2">
              <Link 
                to="/"
                className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer"
              >
                Falar com um Especialista <PhoneCall size={12} />
              </Link>
            </div>
          </section>

        </div>
      )}

    </div>
  );
}