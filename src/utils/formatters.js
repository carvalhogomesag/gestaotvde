/**
 * Utilitários de Formatação para o Padrão Portugal
 */

// Formata data ISO para DD/MM/AAAA
export const formatDatePT = (dateString) => {
  if (!dateString) return "---";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('pt-PT').format(date);
};

// Formata telemóvel para 9xx xxx xxx
export const formatPhonePT = (phone) => {
  const cleaned = ('' + phone).replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{3})$/);
  if (match) {
    return `${match[1]} ${match[2]} ${match[3]}`;
  }
  return phone;
};

// Formata Moeda (Euro)
export const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
};

/**
 * Máscara de Matrícula Portuguesa (XX-XX-XX)
 * Suporta: AA-00-00, 00-00-AA, 00-AA-00 e AA-00-AA
 */
export const formatMatricula = (value) => {
  if (!value) return "";
  
  // Remove tudo o que não é letra ou número e converte para maiúsculas
  const cleanValue = value.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  
  // Limita a 6 caracteres (os caracteres reais da matrícula)
  const truncated = cleanValue.substring(0, 6);
  
  // Aplica os hífens nos pares
  const parts = truncated.match(/.{1,2}/g);
  return parts ? parts.join("-") : truncated;
};