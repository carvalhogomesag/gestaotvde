/**
 * leadService.js
 * Localização: src/services/leadService.js
 *
 * Serviço Firestore para gestão e captação de leads públicas do website.
 * Atualizado para suportar a seleção de múltiplos serviços (carrinho de compras).
 */

import { db } from '../firebase'; 
import { collection, addDoc } from 'firebase/firestore';

/**
 * Valida se um número de telemóvel cumpre o padrão português:
 * - Opcionalmente começa por +351 ou 00351
 * - Tem 9 dígitos e começa por 9 (redes móveis nacionais gerais) ou por 2 (rede fixa)
 *
 * @param {string} numero - Telemóvel a validar
 * @returns {boolean}
 */
export const validarTelemovelPT = (numero) => {
  if (!numero) return false;
  // Limpa espaços, traços e parêntesis para uma validação limpa
  const limpo = numero.replace(/[\s\-()]/g, '');
  // Qualquer número iniciado por 9 (móvel) ou 2 (fixo) com 9 dígitos no total
  const regexPT = /^(?:\+351|00351)?([29]\d{8})$/;
  return regexPT.test(limpo);
};

/**
 * Valida a estrutura sintática de um endereço de email.
 *
 * @param {string} email
 * @returns {boolean}
 */
export const validarEmail = (email) => {
  if (!email) return false;
  const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regexEmail.test(email.trim());
};

/**
 * Regista uma nova lead captada no formulário público para o Firestore.
 * Suporta agora carrinhos de compras compostos por múltiplos serviços.
 * 
 * @param {Object} dados
 *   @param {string} dados.nome              - Nome do candidato
 *   @param {string} dados.email             - Endereço de correio eletrónico (opcional para eguia_onboarding)
 *   @param {string} dados.telemovel         - Telemóvel de contacto (formato PT)
 *   @param {string} dados.origem            - "eguia_onboarding" | "procura_viatura" | "servicos_assessoria"
 *   @param {string} dados.mensagemAdicional - Mensagem adicional ou observações do utilizador
 *   @param {Array}  dados.itensSelecionados - IDs de serviços selecionados no carrinho (opcional)
 *   @param {number} dados.precoTotal        - Preço total acumulado do carrinho (opcional, Stripe-ready)
 * @returns {Promise<{ sucesso: boolean, id: string|null, msg: string }>}
 */
export const registarLeadPública = async (dados) => {
  try {
    const nome = dados.nome?.trim() || '';
    const email = dados.email?.trim() || '';
    const telemovel = dados.telemovel?.replace(/[\s\-()]/g, '') || '';
    const origem = dados.origem || 'eguia_onboarding';
    const mensagemAdicional = dados.mensagemAdicional?.trim() || '';
    
    // Processamento de itens do carrinho de compras dinâmico
    const itensSelecionados = Array.isArray(dados.itensSelecionados) ? dados.itensSelecionados : [];
    const precoTotal = typeof dados.precoTotal === 'number' ? dados.precoTotal : null;

    // 1. Validação do preenchimento do Nome
    if (!nome) {
      return { sucesso: false, id: null, msg: "Por favor, introduza o seu nome completo." };
    }

    // 2. Validação Condicional do Email
    // O email é opcional exclusivamente para a captura do eGuia de Onboarding.
    const emailObrigatorio = origem !== 'eguia_onboarding';
    
    if (emailObrigatorio && !email) {
      return { sucesso: false, id: null, msg: "Por favor, introduza o seu endereço de email." };
    }

    if (email && !validarEmail(email)) {
      return { sucesso: false, id: null, msg: "Por favor, introduza um endereço de email sintaticamente válido." };
    }

    // 3. Validação do Telemóvel (Obrigatório em todos os fluxos)
    if (!validarTelemovelPT(telemovel)) {
      return { sucesso: false, id: null, msg: "Por favor, introduza um número de telemóvel válido em Portugal (ex: 9xxxxxxxx)." };
    }

    // 4. Preparação do payload para gravação
    const payload = {
      nome,
      email: email || null, // Persiste nulo se não fornecido (caso do eGuia)
      telemovel,
      origem,
      mensagemAdicional,
      itensSelecionados,    // Registo de múltiplos IDs do carrinho de compras
      precoTotal,           // Registo do preço final calculado para futura integração Stripe
      estado: 'novo',       // Estado inicial da lead para controlo de gestão de funil no CRM
      gestorAtribuidoId: '', // Vazio inicialmente
      criadoEm: new Date().toISOString()
    };

    console.log("[leadService] A submeter nova lead pública para registo...", payload);

    // 5. Gravação no Firestore
    const docRef = await addDoc(collection(db, 'leads_captadas'), payload);

    console.log("[leadService] Lead registada com sucesso com o ID:", docRef.id);

    return {
      sucesso: true,
      id: docRef.id,
      msg: "O seu pedido foi registado com sucesso. Entraremos em contacto brevemente."
    };

  } catch (error) {
    console.error("[leadService] Erro fatal ao registar lead pública:", error);
    return {
      sucesso: false,
      id: null,
      msg: "Ocorreu um erro técnico ao submeter o seu pedido. Por favor, tente novamente mais tarde."
    };
  }
};