/**
 * ContratoGerador.jsx
 * Localização: src/features/motoristas/ContratoGerador.jsx
 *
 * Componente modular autónomo para geração e descarga do PDF de Contrato 
 * de Prestação de Serviços TVDE baseado na minuta e parâmetros financeiros reais.
 * Otimizado com:
 * - Pesquisa inteligente de caução em dupla camada (Ativa ou Histórica/Liquidada).
 * - Quebras de página estritas, parágrafos enumerados e exclusão inteligente de rubricas na assinatura.
 */

import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { db } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { getConfiguracaoFinanceira, getCaucaoAtiva, getHistoricoCaucoes } from '../../services/financeiroService';
import { FileCheck, Loader2, AlertCircle, Euro, MapPin, Calendar, Sparkles } from 'lucide-react';
import Button from '../../components/ui/Button';

// Helper to format today's date in full PT-PT
const getTodayFullDatePT = () => {
  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  const hoje = new Date();
  return `${hoje.getDate()} de ${meses[hoje.getMonth()]} de ${hoje.getFullYear()}`;
};

export default function ContratoGerador({ motorista }) {
  const [operador, setOperador] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [isFinSynced, setIsFinSynced] = useState(false);

  // Editable parameters for Cláusula 3.ª and 4.ª
  const [params, setParams] = useState({
    valorSemanal: '50.00',
    valorCaucao: '200.00',
    local: 'Porto',
    dataContrato: getTodayFullDatePT()
  });

  useEffect(() => {
    const fetchAllContractData = async () => {
      const motoristaId = motorista.id;
      if (!motoristaId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // 1. Procurar Dados Corporativos do Operador
        const opRef = doc(db, "configuracoes", "operador");
        const opSnap = await getDoc(opRef);
        let opData = null;
        if (opSnap.exists()) {
          opData = opSnap.data();
          setOperador(opData);
        }

        // 2. Procurar Configuração da Taxa de Gestão [2]
        const configFin = await getConfiguracaoFinanceira(db, motoristaId);

        // 3. Procurar Caução (Camada 1: Ativa [2] | Camada 2: Mais recente do Histórico [2])
        let caucaoReal = await getCaucaoAtiva(db, motoristaId); [2]
        if (!caucaoReal) {
          const historico = await getHistoricoCaucoes(db, motoristaId); [2]
          if (historico && historico.length > 0) {
            // Ordenar por data de criação decrescente para apanhar a mais recente (como as liquidadas)
            historico.sort((a, b) => new Date(b.criadoEm || 0) - new Date(a.criadoEm || 0));
            caucaoReal = historico[0];
          }
        }

        // Atualizar os parâmetros editáveis com dados reais do Firestore
        setParams(prev => {
          let taxaStr = '50.00';
          if (configFin && configFin.ativo) {
            if (configFin.tipoTaxaGestao === 'percentagem') {
              taxaStr = `${(configFin.taxaGestaoPct * 100).toFixed(0)}%`;
            } else {
              taxaStr = `${Number(configFin.taxaGestao ?? 0).toFixed(2)}`;
            }
            setIsFinSynced(true);
          }

          let caucaoStr = '200.00';
          if (caucaoReal) {
            caucaoStr = `${Number(caucaoReal.valorTotal ?? 0).toFixed(2)}`;
            setIsFinSynced(true);
          }

          return {
            ...prev,
            valorSemanal: taxaStr,
            valorCaucao: caucaoStr,
            local: opData?.cidade || 'Porto',
          };
        });

      } catch (e) {
        console.error("Erro ao carregar dados consolidados para o contrato:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchAllContractData();
  }, [motorista.id]);

  const handleGeneratePdf = () => {
    if (!operador) return;
    setGenerating(true);

    try {
      const docPdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageHeight = docPdf.internal.pageSize.height;
      const pageWidth = docPdf.internal.pageSize.width;
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      let y = 25;

      const addPageIfNeeded = (neededHeight) => {
        if (y + neededHeight > pageHeight - margin - 15) {
          docPdf.addPage();
          y = 25;
        }
      };

      const writeText = (text, isTitle = false, spacingBefore = 2, fontStyle = 'normal', fontSize = 10, align = 'left') => {
        docPdf.setFont('Helvetica', fontStyle);
        docPdf.setFontSize(fontSize);
        docPdf.setTextColor(isTitle ? 40 : 80);
        
        const lines = docPdf.splitTextToSize(text, contentWidth);
        const textHeight = lines.length * (fontSize * 0.45);

        addPageIfNeeded(textHeight + spacingBefore);
        y += spacingBefore;

        lines.forEach(line => {
          addPageIfNeeded(fontSize * 0.45);
          if (align === 'center') {
            docPdf.text(line, pageWidth / 2, y, { align: 'center' });
          } else {
            docPdf.text(line, margin, y);
          }
          y += (fontSize * 0.45) + 1.2;
        });
      };

      // Título Principal
      writeText("CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE GESTÃO TVDE", true, 5, 'bold', 13, 'center');
      y += 4;

      // Introdução de Partes
      writeText("ENTRE AS PARTES:", true, 4, 'bold', 10);
      
      const moradaOperador = `${operador.rua || ''}, ${operador.numero || ''} ${operador.complemento ? ', ' + operador.complemento : ''}, ${operador.codigoPostal || ''} ${operador.cidade || ''}`;
      const outorgante1 = `1.º Outorgante (Operador): ${operador.nomeEmpresa || '[Empresa]'}, NIF ${operador.nif || '[NIF]'}, com sede em ${moradaOperador || '[Morada]'}, representada por ${operador.representante || '[Gerente]'}, na qualidade de Gerente, doravante designado como "Operador".`;
      writeText(outorgante1, false, 3, 'normal', 9.5);
      
      const moradaPrestador = `${motorista.moradaRua || ''}, ${motorista.moradaNumero || ''} ${motorista.moradaComplemento ? ', ' + motorista.moradaComplemento : ''}, ${motorista.codigoPostal || ''} ${motorista.localidade || ''}`;
      const outorgante2 = `2.º Outorgante (Prestador): ${motorista.nome || '[Nome]'}, NIF ${motorista.nif || '[NIF]'}, residente em ${moradaPrestador || '[Morada]'}, titular do certificado de motorista TVDE n.º ${motorista.numTVDE || '[Certificado]'}, doravante designado como "Prestador".`;
      writeText(outorgante2, false, 3, 'normal', 9.5);

      y += 3;
      writeText("Considerando a autonomia das partes e as respetivas declarações de vontade, é celebrado o presente contrato de prestação de serviços, nos termos das cláusulas seguintes:", false, 2, 'normal', 9.5);

      // CLÁUSULA 1
      writeText("CLÁUSULA 1.ª (Objeto)", true, 4, 'bold', 9.5);
      writeText("1. O presente contrato tem por objeto a prestação de serviços, pelo Prestador ao Operador, de condutor de transportes de passageiros em veículo descaracterizado, designadamente na atividade de TVDE (no âmbito da Lei n.º 45/2018, de 10 de agosto, e Declaração de Retificação de 10 de agosto), transferes e passeios turísticos em automóvel.", false, 2, 'normal', 9);

      // CLÁUSULA 2
      writeText("CLÁUSULA 2.ª (Autonomia e Independência)", true, 4, 'bold', 9.5);
      writeText("1. O Prestador exercerá a sua atividade de forma autónoma e independente, sem subordinação hierárquica, sendo a presente relação de natureza puramente civil, regida pelo artigo 1154.º e seguintes do Código Civil.", false, 2, 'normal', 9);

      // CLÁUSULA 3
      writeText("CLÁUSULA 3.ª (Contrapartida e Enquadramento Fiscal)", true, 4, 'bold', 9.5);
      const isPercentagem = params.valorSemanal.includes('%');
      const redaçãoTaxa = isPercentagem
        ? `1. Como remuneração pelos serviços de gestão prestados pelo Operador, o Prestador autoriza o desconto direto da quantia semanal de ${params.valorSemanal} de taxa de gestão sobre a sua receita bruta semanal.`
        : `1. Como remuneração pelos serviços de gestão prestados pelo Operador, o Prestador autoriza o desconto direto da quantia semanal de ${params.valorSemanal} € no seu extrato de rendimentos semanal.`;
      writeText(redaçãoTaxa, false, 2, 'normal', 9);
      
      const clasula3_2 = `2. O Prestador declara ter conhecimento de que, ao ultrapassar o limite de volume de faturação anual previsto no artigo 53.º do Código do IVA, passará a estar enquadrado no regime normal de IVA. Nessa condição, o Prestador obriga-se a aplicar a taxa de 6% de IVA aos valores faturados ao Operador (referentes à prestação de serviços de transporte), sendo o referido montante de IVA adicionado ao valor base da sua fatura/recibo, de forma a que o Prestador proceda à respectiva liquidação e entrega do imposto ao Estado na sua Declaração Periódica de IVA (trimestral ou mensal).`;
      writeText(clasula3_2, false, 2, 'normal', 9);

      const clasula3_3 = `3. O Operador disponibilizará ao Prestador o saldo líquido da sua atividade, após a dedução das taxas de gestão, comissões das plataformas, encargos com combustíveis, portagens e outros custos devidos pelo Prestador.`;
      writeText(clasula3_3, false, 2, 'normal', 9);

      // CLÁUSULA 4
      writeText("CLÁUSULA 4.ª (Caução de Garantia)", true, 4, 'bold', 9.5);
      const clasula4_1 = `1. O Prestador entrega a quantia de ${params.valorCaucao} € a título de caução, para garantia de danos na viatura, pagamento de franquias, multas ou valores em dívida.`;
      writeText(clasula4_1, false, 2, 'normal', 9);
      writeText("2. Esta caução poderá ser utilizada pelo Operador para compensar unilateralmente quaisquer créditos que detenha sobre o Prestador.", false, 2, 'normal', 9);
      writeText("3. A caução será devolvida ao Prestador no prazo de 30 dias após o termo do contrato, após verificação da inexistência de dívidas ou danos.", false, 2, 'normal', 9);

      // ==========================================
      // [QUEBRA DE PÁGINA FORÇADA 1]
      // ==========================================
      docPdf.addPage();
      y = 25;

      // CLÁUSULA 5
      writeText("CLÁUSULA 5.ª (Seguros, Transponder e Cartões)", true, 4, 'bold', 9.5);
      writeText("1. O Operador fornece ao Prestador o transponder de Via Verde e o cartão de abastecimento/carregamento para uso exclusivo na viatura afeta a este contrato.", false, 2, 'normal', 9);
      writeText("2. O Prestador é responsável pela utilização correta destes meios. A perda, dano ou utilização indevida implica a responsabilidade do Prestador pelo custo de reposição.", false, 2, 'normal', 9);
      writeText("3. O Operador é o tomador do seguro da viatura. Em caso de sinistro por culpa do Prestador, este obriga-se a pagar o valor da franquia de seguro no prazo de 48 horas após notificação do Operador.", false, 2, 'normal', 9);

      // CLÁUSULA 6
      writeText("CLÁUSULA 6.ª (Responsabilidade pela Viatura e Custos)", true, 4, 'bold', 9.5);
      writeText("1. O Prestador assume a responsabilidade pelos custos de combustível/energia, portagens e coimas resultantes da sua condução.", false, 2, 'normal', 9);
      writeText("2. A manutenção preventiva e corretiva da viatura (revisões programadas, pneus, óleo, desgaste natural) é da exclusiva responsabilidade e encargo do Operador. O Prestador obriga-se a colaborar na entrega da viatura nas oficinas designadas pelo Operador sempre que solicitado.", false, 2, 'normal', 9);
      writeText("3. Quaisquer danos, avarias ou degradações causados por mau uso, negligência, imperícia ou condução inadequada do Prestador, serão da sua exclusiva responsabilidade financeira. O Operador terá o direito de imputar ao Prestador o custo total da reparação, utilizando a caução para o efeito.", false, 2, 'normal', 9);
      writeText("4. O Prestador responde por danos causados à viatura ou a terceiros pelo uso da viatura fora do âmbito TVDE/Transferes/Passeios ou por condutores não autorizados.", false, 2, 'normal', 9);

      // CLÁUSULA 7
      writeText("CLÁUSULA 7.ª (Confidencialidade)", true, 4, 'bold', 9.5);
      writeText("1. O Prestador obriga-se a manter estrita confidencialidade sobre dados e documentos obtidos no âmbito deste contrato, sob pena de responsabilidade civil e indemnização.", false, 2, 'normal', 9);

      // CLÁUSULA 8
      writeText("CLÁUSULA 8.ª (Duração, Período Mínimo e Denúncia)", true, 4, 'bold', 9.5);
      writeText("1. O presente contrato tem a duração de 12 meses, renovável por iguais períodos.", false, 2, 'normal', 9);
      writeText("2. É estipulado um período mínimo de permanência de 15 (quinze) dias. A desistência antes deste prazo constitui incumprimento contratual, autorizando o Operador a reter a totalidade da caução como compensação pelos prejuízos de imobilização do ativo.", false, 2, 'normal', 9);
      writeText("3. Após o período mínimo, qualquer das partes pode denunciar o contrato mediante comunicação escrita, com a antecedência mínima de 15 (quinze) dias.", false, 2, 'normal', 9);

      // ==========================================
      // [QUEBRA DE PÁGINA FORÇADA 2]
      // ==========================================
      docPdf.addPage();
      y = 25;

      // CLÁUSULA 9 + ASSINATURAS
      writeText("CLÁUSULA 9.ª (Foro)", true, 4, 'bold', 9.5);
      writeText("1. Para a resolução de quaisquer litígios emergentes deste contrato, as partes elegem o foro da Comarca do Porto.", false, 2, 'normal', 9);

      y += 8;
      writeText(`${params.local}, ${params.dataContrato}`, false, 3, 'normal', 9.5);

      y += 18;
      
      const startSignaturesY = y;
      docPdf.setFont('Helvetica', 'bold');
      docPdf.setFontSize(9.5);
      docPdf.text("O 1.º Outorgante (Operador)", margin, startSignaturesY);
      docPdf.text("O 2.º Outorgante (Prestador)", pageWidth / 2 + 5, startSignaturesY);
      
      docPdf.setFont('Helvetica', 'normal');
      docPdf.setFontSize(9);
      docPdf.text("_______________________________________", margin, startSignaturesY + 12);
      docPdf.text("(Assinatura)", margin, startSignaturesY + 16);
      
      docPdf.text("_______________________________________", pageWidth / 2 + 5, startSignaturesY + 12);
      docPdf.text("(Assinatura)", pageWidth / 2 + 5, startSignaturesY + 16);

      // ==========================================
      // SEGUNDA PASSAGEM: DESENHO DE CABEÇALHOS E RODAPÉS
      // ==========================================
      const totalPages = docPdf.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        docPdf.setPage(i);
        
        // Desenha Cabeçalho Uniforme
        docPdf.setFont('Helvetica', 'bold');
        docPdf.setFontSize(8);
        docPdf.setTextColor(150, 150, 150);
        docPdf.text("CONTRATO DE PRESTAÇÃO DE SERVIÇOS — TVDE", margin, 15);
        docPdf.setDrawColor(230, 230, 230);
        docPdf.line(margin, 17, pageWidth - margin, 17);

        // Desenha Linha Divisória de Rodapé
        docPdf.setFont('Helvetica', 'normal');
        docPdf.setFontSize(8);
        docPdf.setTextColor(150, 150, 150);
        docPdf.setDrawColor(230, 230, 230);
        docPdf.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
        
        // Tratamento Condicional do Rodapé
        if (i < totalPages) {
          // Páginas Intermédias: Desenha a linha de rubricas
          docPdf.text("Rubricas: Operador _________  |  Prestador _________", margin, pageHeight - 10);
        } else {
          // Última Página: OMITIR rubricas
          docPdf.text("Página de Assinaturas (Fim do Documento)", margin, pageHeight - 10);
        }
        
        // Numeração de Página
        docPdf.text(`Página ${i} de ${totalPages}`, pageWidth - margin - 22, pageHeight - 10);
      }

      // Descarrega o PDF
      docPdf.save(`Contrato_TVDE_${(motorista.nome || 'Motorista').replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error("Erro ao gerar o PDF:", error);
      alert("Erro ao criar o PDF do contrato.");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6 text-slate-400">
        <Loader2 className="animate-spin text-tvde-primary mr-2" size={16} />
        <span className="text-xs font-semibold">A validar dados do operador e fichas financeiras...</span>
      </div>
    );
  }

  if (!operador) {
    return (
      <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex gap-3 text-amber-700 text-xs text-left">
        <AlertCircle size={18} className="shrink-0 mt-0.5 text-amber-600" />
        <div>
          <p className="font-bold">Dados do Operador em Falta nas Configurações</p>
          <p className="mt-1 leading-relaxed opacity-90">
            Não é possível gerar contratos sem os dados corporativos da empresa operador TVDE. 
            Aceda às <strong>Configurações</strong> do ERP e preencha a aba <strong>Dados do Operador</strong> primeiro.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200 text-left space-y-3.5 select-none animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
            <FileCheck size={16} />
          </div>
          <span className="text-[10px] font-black text-slate-700 uppercase tracking-tight">
            Geração de Contrato TVDE Automatizado
          </span>
        </div>

        {isFinSynced && (
          <div className="flex items-center gap-1 text-[9px] bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
            <Sparkles size={10} className="animate-pulse" /> Sincronizado
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-[8px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1">
            <Euro size={10} /> Taxa Semanal
          </label>
          <input
            type="text"
            className="w-full py-1 px-2 border border-slate-200 rounded-lg outline-none bg-white text-xs font-semibold text-slate-700 font-mono"
            value={params.valorSemanal}
            onChange={(e) => setParams({ ...params, valorSemanal: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-[8px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1">
            <Euro size={10} /> Caução
          </label>
          <input
            type="text"
            className="w-full py-1 px-2 border border-slate-200 rounded-lg outline-none bg-white text-xs font-semibold text-slate-700 font-mono"
            value={params.valorCaucao}
            onChange={(e) => setParams({ ...params, valorCaucao: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-[8px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1">
            <MapPin size={10} /> Local da Assinatura
          </label>
          <input
            type="text"
            className="w-full py-1 px-2 border border-slate-200 rounded-lg outline-none bg-white text-xs font-semibold text-slate-700"
            value={params.local}
            onChange={(e) => setParams({ ...params, local: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-[8px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1">
            <Calendar size={10} /> Data do Contrato
          </label>
          <input
            type="text"
            className="w-full py-1 px-2 border border-slate-200 rounded-lg outline-none bg-white text-xs font-semibold text-slate-700"
            value={params.dataContrato}
            onChange={(e) => setParams({ ...params, dataContrato: e.target.value })}
          />
        </div>
      </div>

      <div className="pt-2 border-t border-slate-200/50 flex justify-end">
        <Button 
          type="button" 
          onClick={handleGeneratePdf}
          disabled={generating}
          className="h-9 px-4 text-[10px] font-black uppercase shadow-sm bg-emerald-600 hover:bg-emerald-700 shrink-0 text-white cursor-pointer"
        >
          {generating ? (
            <span className="flex items-center gap-1.5">
              <Loader2 className="animate-spin" size={12} /> A Processar...
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <FileCheck size={12} /> Gerar & Descarregar Contrato PDF
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}