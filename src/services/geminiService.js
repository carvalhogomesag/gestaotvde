import { genAI, AI_SETTINGS, calcularCustoReal } from "../config/aiConfig";

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

    const prompt = `Age como perito de conformidade TVDE em Portugal.
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

      // ── FINANCEIRO ──────────────────────────────────────────────────────────
      {
        name: "lancarAjusteFinanceiro",
        description: "Lança um débito ou crédito na conta corrente de um motorista ou veículo. Usa SEMPRE o entidadeId do Firestore.",
        parameters: {
          type: "object",
          properties: {
            entidadeId:   { type: "string", description: "ID exacto do Firestore. Listado no contexto ao lado de cada matrícula/nome." },
            tipoEntidade: { type: "string", enum: ["motorista", "veiculo"] },
            tipo:         { type: "string", enum: ["debito", "credito"] },
            valor:        { type: "number", description: "Valor em euros." },
            descricao:    { type: "string", description: "Motivo do lançamento." },
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
      }

    ]
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// INSTRUÇÃO DO ASSISTENTE UNIFICADO
// ─────────────────────────────────────────────────────────────────────────────
const SYSTEM_INSTRUCTION = `
Tu és o Assistente TVDE, o gestor operacional completo do software TVDE Gestão Portugal.
Tens acesso total ao sistema e podes executar qualquer operação solicitada pelo utilizador.

🎯 CAPACIDADES COMPLETAS:
- Motoristas: criar, actualizar e eliminar perfis
- Veículos: registar, editar e remover viaturas
- Proprietários: gerir parceiros e proprietários de viaturas
- Cartões: gerir cartões de combustível ("combustivel") e eléctricos ("eletrico")
- Financeiro: lançar, editar e eliminar débitos e créditos na conta corrente
- Tarefas: criar e atribuir tickets a funcionários

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
// AGENTE DE CHAT — LOOP AGÊNTICO COM ASSISTENTE UNIFICADO
//
// NOTA: A assinatura mudou em relação à versão anterior.
// Removido o parâmetro 'agenteKey' — já não existe selecção de agente.
// CentroComando.jsx será actualizado no Passo 3 para corresponder.
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

RESUMO: ${contextoSistema.totalMotoristas} motoristas | ${contextoSistema.totalVeiculos} veículos | ${contextoSistema.ticketsPendentes || 0} tickets pendentes
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