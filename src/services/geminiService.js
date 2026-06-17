/**
 * geminiService.js
 * Localização: src/services/geminiService.js
 *
 * Agente de Chat Inteligente e Motor de IA (Gemini).
 * Atualizado com:
 * - Parâmetros 'categoria' e 'origem' na ferramenta lancarAjusteFinanceiro [2].
 * - Instruções de sistema refinadas para classificar combustíveis e portagens [2].
 * - Preservação estrita das diretrizes fiscais portuguesas e do loop agêntico original.
 */

import { genAI, AI_SETTINGS, calcularCustoReal } from "../config/aiConfig";

// ─────────────────────────────────────────────────────────────────────────────
// INSTRUÇÃO DO ASSISTENTE PÚBLICO (VISITANTES - LEGISLAÇÃO, TRANSITO E FISCAL)
// ─────────────────────────────────────────────────────────────────────────────
const SYSTEM_INSTRUCTION_PUBLICO = `
Tu és o Assistente Virtual da Gestão TVDE, um microagente altamente especializado em legislação, fiscalidade, contabilidade e operação do mercado TVDE (Transporte Individual e de Passageiros em Veículos Descaracterizados a partir de Plataforma Eletrónica) em Portugal.
O teu objetivo é esclarecer de forma rigorosa, didática, profissional e objetiva as dúvidas dos visitantes do nosso portal público.

⚠️ ORIENTAÇÕES DE POSTURA E TONE:
- Responde SEMPRE em Português de Portugal (PT-PT) coloquial mas técnico-comercial profissional (utiliza termos como "telemóvel", "carta de condução", "registo criminal", "recibos verdes", "via verde", etc.).
- Sê humilde, claro, objetivo e direto nas respostas. Evita floreados ou textos desnecessariamente longos.
- Adiciona SEMPRE o seguinte aviso de isenção de responsabilidade (disclaimer) de forma discreta no final de respostas que envolvam contabilidade, finanças ou taxas:
  "Nota: Esta informação é meramente informativa e de apoio, não dispensando a consulta da legislação oficial em Diário da República ou o aconselhamento de um Contabilista Certificado (CC)."

📚 BASE DE CONHECIMENTO REGULATÓRIO PORTUGUÊS:

1. REQUISITOS PARA SER MOTORISTA TVDE (IMT / Código 997):
   - Carta de Condução (Categoria B) há mais de 3 anos.
   - Idade mínima de 21 anos (alinhada com os 3 anos de experiência de condução).
   - Curso de Formação Rodoviária para Motoristas TVDE (CFRTVDE) com carga horária de 125 horas, ministrado exclusivamente por escolas ou entidades formadoras devidamente homologadas pelo IMT (Instituto da Mobilidade e dos Transportes). Atuamos como assessores de apoio documental para o encaminhar para as melhores escolas.
   - Certificado Médico do Grupo 2 (físico e visual) e Exame Psicotécnico de aptidão física e mental.
   - Averbamento do "Código 997" na Carta de Condução junto do IMT após a conclusão da formação e exames médicos.
   - Registo Criminal impecável e específico para o exercício da atividade de motorista TVDE (Nota: se emitido para outro fim, o IMT rejeitará o dossiê).

2. ENQUADRAMENTO FISCAL E CONTABILIDADE (Portugal):
   - Código de Atividade Económica (CAE): O CAE obrigatório para motoristas independentes ou sociedades operadoras de TVDE é o 49320 (Transporte ocasional de passageiros em veículos ligeiros).
   - Isenção de IVA (Artigo 53.º do CIVA): Motoristas independentes (ENI - Empresário em Nome Individual) estão isentos de cobrança de IVA se o seu faturamento anual previsto ou real for inferior a 15.000 € (limite atual em vigor para 2026).
   - Regime Normal de IVA: Se ultrapassar o volume de negócios anual de 15.000 € (or se optar livremente pelo regime geral), passa a faturar com IVA à taxa normal de 23% sobre a atividade.
   - Estrutura Empresarial: O motorista independente pode abrir atividade como ENI (regime simplificado, sem necessidade de Contabilista Certificado até 200.000 € de faturação, desde que não tenha contabilidade organizada por opção), ou constituir uma sociedade por quotas (Unipessoal Lda ou Lda) para proteger o património pessoal e ter contabilidade organizada (obrigatória para sociedades).
   - Autofaturação: As plataformas eletrónicas (Uber e Bolt) emitem faturas em nome dos operadores ou parceiros de frota através de acordos de autofaturação com base no registo das viagens semanais.

3. LEGISLAÇÃO TVDE OPERACIONAL (Lei n.º 45/2018):
   - Tempo de Condução: O limite máximo estabelecido por lei é de 10 horas de condução acumuladas num período de 24 horas, garantindo a segurança rodoviária de motoristas e passageiros.
   - Vinculação de Operador: Um motorista não pode operar diretamente com a Uber ou Bolt sem estar associado a uma empresa licenciada com frota (um Operador TVDE). Como assessoria, ajudamos a selecionar e a vinculá-lo de forma segura a frotas parceiras em conformidade legal.
   - Veículos TVDE: Devem possuir seguro de responsabilidade civil e de passageiros/ocupantes alargado específico para TVDE, ter dísticos TVDE visíveis no vidro dianteiro e traseiro, ter matrícula portuguesa (PT) e cumprir os limites máximos de idade da viatura determinados por lei.

4. CÓDIGO DA ESTRADA (Regras Críticas):
   - Taxa de Álcool: Sendo uma atividade de transporte de passageiros (profissional), o limite máximo de álcool no sangue permitido por lei para motoristas TVDE em Portugal é de 0,20 g/l. Um valor igual ou superior é infração grave, muito grave ou crime rodoviário.
   - Paragem e Estacionamento: Os veículos TVDE não são táxis. Não podem utilizar as praças de táxis nem circular nos corredores BUS (salvo raras exceções municipais locais reguladas especificamente). Devem efetuar cargas e descargas em locais onde a paragem de veículos ligeiros seja permitida.

Responde sempre com base nestas diretrizes de forma cordial, didática e focada nestes factos portugueses.
`.trim();

// ─────────────────────────────────────────────────────────────────────────────
// AGENTE DE VISÃO — Leitura de documentos via inlineData (sem CORS)
// Intacto — não sofreu alterações
// ─────────────────────────────────────────────────────────────────────────────
export const analisarDocumentoComIA = async (file, tipoDoc, dadosAtuais = {}) => {
  try {
    if (!file || !(file instanceof Blob)) {
      console.error("[IA Vision] Parâmetro inválido — deve ser um File do browser.");
      return null;
    }

    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const prompt = `Age como perito de conformidade TVDE in Portugal.
DADOS ATUAIS NA FICHA: Nome: ${dadosAtuais.nome || "Vazio"}, NIF: ${dadosAtuais.nif || "Vazio"}.
DOCUMENTO A ANALISAR: ${tipoDoc}.

Extrai os dados e valida a integridade. Retorna um objeto JSON correspondente a esta estrutura:
{
  "documento_valido": true,
  "motivo_invalidez": "",
  "alerta_inconsistencia": false,
  "nome": "", "nif": "", "numero_documento": "",
  "data_validade": "AAAA-MM-DD", "data_nascimento": "AAAA-MM-DD",
  "moradaRua": "", "codigoPostal": "", "localidade": "",
  "observacoes_ia": ""
}`;

    const response = await genAI.models.generateContent({
      model: AI_SETTINGS.MODEL_NAME,
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            { inlineData: { data: base64, mimeType: file.type || 'image/jpeg' } }
          ]
        }
      ],
      config: { responseMimeType: "application/json" }
    });

    return JSON.parse(response.text.trim());
  } catch (error) {
    console.error("[IA Vision] Erro:", error.message);
    return null;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// FERRAMENTAS DO ASSISTENTE UNIFICADO
// Todas as ferramentas sempre disponíveis — sem restrição por perfil
// ─────────────────────────────────────────────────────────────────────────────
const TODAS_AS_FERRAMENTAS = [
  {
    functionDeclarations: [

      // ── MOTORISTAS ──────────────────────────────────────────────────────────
      {
        name: "criarMotorista",
        description: "Cria um novo perfil de motorista no sistema com os dados básicos fornecidos.",
        parameters: {
          type: "object",
          properties: {
            nome:      { type: "string", description: "Nome completo do motorista." },
            telemovel: { type: "string", description: "Número de telemóvel (opcional)." },
            nif:       { type: "string", description: "NIF com 9 dígitos (opcional)." },
            email:     { type: "string", description: "Endereço de e-mail (opcional)." }
          },
          required: ["nome"]
        }
      },
      {
        name: "atualizarMotorista",
        description: "Actualiza campos de um motorista já existente (NIF, telemóvel, e-mail, nome, status).",
        parameters: {
          type: "object",
          properties: {
            entidadeId: { type: "string", description: "ID do Firestore do motorista." },
            nif:        { type: "string", description: "Novo NIF (opcional)." },
            telemovel:  { type: "string", description: "Novo telemóvel (opcional)." },
            email:      { type: "string", description: "Novo e-mail (opcional)." },
            nome:       { type: "string", description: "Nome corrigido (opcional)." },
            status:     { type: "string", description: "Novo estado (opcional)." }
          },
          required: ["entidadeId"]
        }
      },
      {
        name: "excluirMotorista",
        description: "Elimina permanentemente o perfil de um motorista. Só deve ser chamada após confirmação explícita do utilizador.",
        parameters: {
          type: "object",
          properties: {
            entidadeId: { type: "string", description: "ID do Firestore do motorista a eliminar." }
          },
          required: ["entidadeId"]
        }
      },

      // ── VEÍCULOS ────────────────────────────────────────────────────────────
      {
        name: "criarVeiculo",
        description: "Regista um novo veículo no sistema.",
        parameters: {
          type: "object",
          properties: {
            matricula:     { type: "string", description: "Matrícula do veículo (obrigatório)." },
            marca:         { type: "string", description: "Marca (opcional)." },
            modelo:        { type: "string", description: "Modelo (opcional)." },
            quilometragem: { type: "number", description: "Quilometragem actual (opcional)." },
            motoristaNome: { type: "string", description: "Nome do motorista atribuído (opcional)." }
          },
          required: ["matricula"]
        }
      },
      {
        name: "editarVeiculo",
        description: "Actualiza dados de um veículo existente.",
        parameters: {
          type: "object",
          properties: {
            entidadeId:    { type: "string", description: "ID do Firestore do veículo." },
            matricula:     { type: "string", description: "Nova matrícula (opcional)." },
            marca:         { type: "string", description: "Nova marca (opcional)." },
            modelo:        { type: "string", description: "Novo modelo (opcional)." },
            quilometragem: { type: "number", description: "Nova quilometragem (opcional)." },
            motoristaNome: { type: "string", description: "Novo motorista atribuído (opcional)." }
          },
          required: ["entidadeId"]
        }
      },
      {
        name: "excluirVeiculo",
        description: "Elimina permanentemente um veículo. Só deve ser chamada após confirmação explícita.",
        parameters: {
          type: "object",
          properties: {
            entidadeId: { type: "string", description: "ID do Firestore do veículo." }
          },
          required: ["entidadeId"]
        }
      },

      // ── PROPRIETÁRIOS ───────────────────────────────────────────────────────
      {
        name: "criarProprietario",
        description: "Regista um novo proprietário/parceiro no sistema.",
        parameters: {
          type: "object",
          properties: {
            nome: { type: "string", description: "Nome completo do proprietário." },
            nif:  { type: "string", description: "NIF (opcional)." }
          },
          required: ["nome"]
        }
      },
      {
        name: "editarProprietario",
        description: "Actualiza dados de um proprietário existente.",
        parameters: {
          type: "object",
          properties: {
            entidadeId: { type: "string", description: "ID do Firestore do proprietário." },
            nome:       { type: "string", description: "Novo nome (opcional)." },
            nif:        { type: "string", description: "Novo NIF (opcional)." }
          },
          required: ["entidadeId"]
        }
      },
      {
        name: "excluirProprietario",
        description: "Elimina permanentemente um proprietário. Só deve ser chamada após confirmação explícita.",
        parameters: {
          type: "object",
          properties: {
            entidadeId: { type: "string", description: "ID do Firestore do proprietário." }
          },
          required: ["entidadeId"]
        }
      },

      // ── CARTÕES ─────────────────────────────────────────────────────────────
      {
        name: "criarCartao",
        description: "Regista um novo cartão de combustível ou carregamento eléctrico.",
        parameters: {
          type: "object",
          properties: {
            numeroCartao:    { type: "string", description: "Número completo do cartão." },
            fornecedor:      { type: "string", description: "Fornecedor (ex: Prio, EDP, BP, Galp)." },
            tipo:            { type: "string", description: "EXACTAMENTE 'combustivel' ou 'eletrico' (lowercase, sem acento)." },
            plafond:         { type: "number", description: "Plafond semanal em euros." },
            vinculoMatricula:{ type: "string", description: "Matrícula do veículo associado (opcional)." }
          },
          required: ["numeroCartao", "fornecedor", "tipo", "plafond"]
        }
      },
      {
        name: "editarCartao",
        description: "Actualiza dados de um cartão existente.",
        parameters: {
          type: "object",
          properties: {
            entidadeId:      { type: "string", description: "ID do Firestore do cartão." },
            numeroCartao:    { type: "string", description: "Novo número (opcional)." },
            tipo:            { type: "string", description: "'combustivel' ou 'eletrico' (opcional)." },
            fornecedor:      { type: "string", description: "Novo fornecedor (opcional)." },
            plafond:         { type: "number", description: "Novo plafond (opcional)." },
            vinculoMatricula:{ type: "string", description: "Nova matrícula associada (opcional)." },
            status:          { type: "string", description: "Novo status (opcional)." }
          },
          required: ["entidadeId"]
        }
      },
      {
        name: "excluirCartao",
        description: "Elimina permanentemente um cartão. Só deve ser chamada após confirmação explícita.",
        parameters: {
          type: "object",
          properties: {
            entidadeId: { type: "string", description: "ID do Firestore do cartão." }
          },
          required: ["entidadeId"]
        }
      },

      // ── FINANCEIRO (ATUALIZADO COM CATEGORIA E ORIGEM PARA DESPESAS FIXAS) ──
      {
        name: "lancarAjusteFinanceiro",
        description: "Lança um débito ou crédito na conta corrente de um motorista ou veículo. Usa SEMPRE o entidadeId do Firestore. Permite categorizar despesas específicas como combustível e portagens [2].",
        parameters: {
          type: "object",
          properties: {
            entidadeId:   { type: "string", description: "ID exacto do Firestore. Listado no contexto ao lado de cada matrícula/nome." },
            tipoEntidade: { type: "string", enum: ["motorista", "veiculo"] },
            tipo:         { type: "string", enum: ["debito", "credito"] },
            valor:        { type: "number", description: "Valor em euros." },
            descricao:    { type: "string", description: "Motivo do lançamento." },
            categoria:    { type: "string", enum: ["abastecimento", "portagens", "debito_geral", "credito_geral"], description: "Categoria do movimento. Usa 'abastecimento' para despesas de combustível/energia ou 'portagens' para via verde para as colocar nos campos fixos dedicados [2]." },
            origem:       { type: "string", enum: ["manual", "ia", "relatorio"], description: "Origem do lançamento. Define como 'ia' se fores tu (o agente de IA) a calcular e a lançar a despesa automaticamente [2]." },
            data:         { type: "string", description: "Data em AAAA-MM-DD. Se omitida, usa hoje." }
          },
          required: ["entidadeId", "tipoEntidade", "tipo", "valor", "descricao"]
        }
      },
      {
        name: "editarAjusteFinanceiro",
        description: "Edita um lançamento financeiro pendente existente.",
        parameters: {
          type: "object",
          properties: {
            entidadeId:        { type: "string", description: "ID do Firestore da entidade." },
            descricaoOriginal: { type: "string", description: "Descrição actual do lançamento a editar." },
            novaData:          { type: "string", description: "Nova data (AAAA-MM-DD)." },
            novoValor:         { type: "number", description: "Novo valor." },
            novaDescricao:     { type: "string", description: "Nova descrição." }
          },
          required: ["entidadeId", "descricaoOriginal"]
        }
      },
      {
        name: "excluirAjusteFinanceiro",
        description: "Elimina permanentemente um lançamento financeiro pendente. Só deve ser chamada após confirmação explícita.",
        parameters: {
          type: "object",
          properties: {
            entidadeId:        { type: "string", description: "ID do Firestore da entidade." },
            descricaoOriginal: { type: "string", description: "Descrição exacta do lançamento a eliminar." }
          },
          required: ["entidadeId", "descricaoOriginal"]
        }
      },

      // ── TAREFAS ─────────────────────────────────────────────────────────────
      {
        name: "criarTarefa",
        description: "Cria uma tarefa/ticket no sistema atribuída a um funcionário.",
        parameters: {
          type: "object",
          properties: {
            atribuidoA:  { type: "string", description: "Nome do funcionário destinatário." },
            nota:        { type: "string", description: "Descrição da tarefa." },
            prioridade:  { type: "string", enum: ["baixa", "media", "alta"] },
            entidadeId:  { type: "string", description: "ID do Firestore da entidade relacionada (opcional)." },
            vinculoNome: { type: "string", description: "Nome ou matrícula para exibição (opcional)." }
          },
          required: ["atribuidoA", "nota", "prioridade"]
        }
      },

      // ── SUPORTE PÚBLICO (ANÁLISE DE CONVERSAS) ──────────────────────────────
      {
        name: "analisarDuvidasFrequentes",
        description: "Obtém as conversas mais recentes mantidas pelos visitantes da Landing Page com o Assistente de Suporte Público para que possas analisar as dúvidas comuns, sugestões e dores de cabeça mais reportadas.",
        parameters: {
          type: "object",
          properties: {
            limite: { type: "number", description: "Número de conversas recentes a obter para análise (padrão: 10, máximo: 50)." }
          }
        }
      }

    ]
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// INSTRUÇÃO DO ASSISTENTE UNIFICADO (BACKOFFICE / ERP INTERNO)
// ─────────────────────────────────────────────────────────────────────────────
const SYSTEM_INSTRUCTION = `
Tu és o Assistente TVDE, o gestor operacional completo do software TVDE Gestão Portugal.
Tens acesso total ao sistema e podes executar qualquer operação solicitada pelo utilizador.

🎯 CAPACIDADES COMPLETAS:
- Motoristas: criar, actualizar e eliminar perfis
- Veículos: registar, editar e remover viaturas
- Proprietários: gerir parceiros e proprietários de viaturas
- Cartões: gerir cartões de combustível ("combustivel") e eléctricos ("eletrico")
- Financeiro: lançar, editar e eliminar débitos e créditos na conta corrente [2]
- Tarefas: criar e atribuir tickets a funcionários
- Suporte Público: ler e analisar as dúvidas e conversas mais frequentes obtidas na Landing Page

⚠️ REGRAS OPERACIONAIS FINANCEIRAS (MUITO IMPORTANTES) [2]:
1. Se o utilizador te pedir para lançar despesas de combustível faturadas, carregamentos elétricos ou abastecimentos de um motorista, deves usar obrigatoriamente a ferramenta "lancarAjusteFinanceiro" com o tipo "debito" e a categoria "abastecimento". Sela a origem como "ia" para que apareça de forma especial no ecrã [2].
2. Se te pedirem para lançar custos de Via Verde ou portagens, usa a ferramenta "lancarAjusteFinanceiro" com o tipo "debito" e a categoria "portagens". Sela a origem como "ia" [2].
3. Todos os restantes débitos gerais devem usar o fluxo genérico ("debito_geral") [2].

⚠️ REGRAS DE SEGURANÇA (OBRIGATÓRIAS):
1. Para ELIMINAR ou EXCLUIR qualquer registo (motorista, veículo, cartão, lançamento), NUNCA chames a ferramenta de imediato. Pede sempre confirmação explícita ao utilizador citando o nome/descrição do item antes de avançar.
2. Para EDITAR ou RECTIFICAR lançamentos financeiros existentes, pede sempre confirmação antes de executar.
3. Após confirmação do utilizador, executa sem hesitar.

⚠️ REGRAS DE INFRAESTRUTURA (ABSOLUTAS):
1. Identifica entidades SEMPRE pelo "entidadeId" listado no contexto — nunca pelo nome ou matrícula.
2. Para cartões: o campo "tipo" deve ser EXACTAMENTE "combustivel" ou "eletrico" (lowercase, sem acentos).
3. Para criação de cartões, obtém obrigatoriamente: fornecedor, número do cartão, tipo e plafond.
4. NUNCA simules chamadas de ferramentas em texto. Usa sempre a ferramenta nativa.
5. Responde sempre em Português de Portugal, de forma profissional e directa.
`.trim();

// ─────────────────────────────────────────────────────────────────────────────
// AGENTE DE CHAT (ERP) — LOOP AGÊNTICO COM ASSISTENTE UNIFICADO
// ─────────────────────────────────────────────────────────────────────────────
export const perguntarAoAgente = async (
  prompt,
  contextoSistema,
  mensagensAnteriores = [],
  executorFuncoes
) => {
  try {
    const agora = new Date();
    const dataHoje = agora.toISOString().split('T')[0];
    const dataFormatada = agora.toLocaleDateString('pt-PT', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

    const contextoFormatado = `
DATA HOJE: ${dataHoje} | ${dataFormatada}

=== VEÍCULOS (usa o entidadeId nas ferramentas) ===
${contextoSistema.listaVeiculos.length === 0
  ? '  (nenhum veículo registado)'
  : contextoSistema.listaVeiculos.map(v =>
      `  Matrícula: ${v.matricula} | entidadeId: "${v.id}" | Motorista: ${v.motorista || 'nenhum'}`
    ).join('\n')
}

=== MOTORISTAS (usa o entidadeId nas ferramentas) ===
${contextoSistema.listaMotoristas.length === 0
  ? '  (nenhum motorista registado)'
  : contextoSistema.listaMotoristas.map(m =>
      `  Nome: ${m.nome} | NIF: ${m.nif || '-'} | entidadeId: "${m.id}"`
    ).join('\n')
}

=== LANÇAMENTOS PENDENTES ===
${contextoSistema.adjustesAtuais && contextoSistema.adjustesAtuais.length > 0
  ? contextoSistema.adjustesAtuais.map(a =>
      `  - Descrição: "${a.descricao}" | Tipo: ${a.tipo} | Valor: ${a.valor}€ | Data: ${a.data}`
    ).join('\n')
  : '  (nenhum lançamento pendente)'
}

RESUMO: ${contextoSistema.totalMotoristas} motoristas | ${contextoSistema.totalVeiculos} vehicles | ${contextoSistema.ticketsPendentes || 0} tickets pendentes
    `.trim();

    const historyParts = mensagensAnteriores
      .filter(msg => msg.content)
      .map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));

    let contents = [
      ...historyParts,
      {
        role: "user",
        parts: [{ text: `${contextoFormatado}\n\nPEDIDO DO UTILIZADOR: ${prompt}` }]
      }
    ];

    let response = await genAI.models.generateContent({
      model: AI_SETTINGS.MODEL_NAME,
      contents: contents,
      config: {
        tools: TODAS_AS_FERRAMENTAS,
        systemInstruction: SYSTEM_INSTRUCTION
      }
    });

    let custoTotal = calcularCustoReal(response.usageMetadata);
    const resultadosFuncoes = [];

    // ── LOOP AGÊNTICO — devolve resultados ao modelo até não haver mais functionCalls
    let iteracoes = 0;
    while (response.functionCalls && response.functionCalls.length > 0 && iteracoes < 5) {
      iteracoes++;
      console.log(`[Assistente TVDE] Iteração ${iteracoes} | Ferramentas: ${response.functionCalls.map(f => f.name).join(', ')}`);

      if (response.candidates?.[0]?.content) {
        contents.push(response.candidates[0].content);
      } else {
        contents.push({
          role: "model",
          parts: response.functionCalls.map(fc => ({
            functionCall: { name: fc.name, args: fc.args }
          }))
        });
      }

      const functionResponseParts = [];
      for (const fc of response.functionCalls) {
        let resultado;
        try {
          resultado = await executorFuncoes(fc.name, fc.args);
        } catch (err) {
          resultado = { sucesso: false, msg: `Erro interno: ${err.message}` };
        }

        console.log(`[Assistente TVDE] ${fc.name} →`, resultado);
        resultadosFuncoes.push({ nome: fc.name, args: fc.args, resultado });

        functionResponseParts.push({
          functionResponse: {
            name: fc.name,
            response: typeof resultado === 'object' ? resultado : { output: resultado }
          }
        });
      }

      contents.push({ role: "user", parts: functionResponseParts });

      response = await genAI.models.generateContent({
        model: AI_SETTINGS.MODEL_NAME,
        contents: contents,
        config: {
          tools: TODAS_AS_FERRAMENTAS,
          systemInstruction: SYSTEM_INSTRUCTION
        }
      });

      custoTotal += calcularCustoReal(response.usageMetadata);
    }

    return {
      text: response.text || "Operação executada com sucesso.",
      custo: custoTotal,
      resultadosFuncoes
    };

  } catch (error) {
    console.error("[Assistente TVDE] Erro crítico:", error);
    throw error;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// NOVO: AGENTE DE ATENDIMENTO PÚBLICO (VISITANTES - LEGISLAÇÃO E FISCALIDADE)
// ─────────────────────────────────────────────────────────────────────────────
export const perguntarAoAssistentePublico = async (
  mensagem,
  mensagensAnteriores = []
) => {
  try {
    const historyParts = mensagensAnteriores
      .filter(msg => msg.content)
      .map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));

    let contents = [
      ...historyParts,
      {
        role: "user",
        parts: [{ text: mensagem }]
      }
    ];

    const response = await genAI.models.generateContent({
      model: AI_SETTINGS.MODEL_NAME,
      contents: contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_PUBLICO
      }
    });

    return {
      text: response.text || "De momento não consegui processar a resposta. Por favor tente novamente.",
      custo: calcularCustoReal(response.usageMetadata)
    };

  } catch (error) {
    console.error("[Assistente Público TVDE] Erro crítico:", error);
    throw error;
  }
};