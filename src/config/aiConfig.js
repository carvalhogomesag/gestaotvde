import { GoogleGenAI } from "@google/genai";

/**
 * CONFIGURAÇÃO GLOBAL DO GEMINI 3.1 FLASH LITE
 */
export const AI_SETTINGS = {
  MODEL_NAME: "gemini-3.1-flash-lite",
  USD_TO_EUR: 0.94,
  PRICES: {
    INPUT_PER_1M: 0.25,
    OUTPUT_PER_1M: 1.50
  }
};

// Inicialização única do SDK
export const genAI = new GoogleGenAI({ 
  apiKey: import.meta.env.VITE_GEMINI_API_KEY 
});

/**
 * Calcula o custo real da chamada baseado nos tokens de input e output
 */
export const calcularCustoReal = (usage) => {
  if (!usage) return 0;
  
  const inputCost = (usage.promptTokenCount / 1000000) * AI_SETTINGS.PRICES.INPUT_PER_1M;
  const outputCost = (usage.candidatesTokenCount / 1000000) * AI_SETTINGS.PRICES.OUTPUT_PER_1M;
  
  return (inputCost + outputCost) * AI_SETTINGS.USD_TO_EUR;
};