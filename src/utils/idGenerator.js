import { db } from '../firebase';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';

/**
 * Gera o próximo código único para uma coleção
 * @param {string} collectionName - Nome da coleção (motoristas, veiculos, etc)
 * @param {string} prefix - Prefixo do código (MOT, VEI, PRO, DIR, STF, PAR)
 */
export const generateNextCode = async (collectionName, prefix) => {
  try {
    // Busca o último documento daquela coleção ordenado pelo código interno de forma decrescente
    const q = query(
      collection(db, collectionName),
      orderBy("codigoInterno", "desc"),
      limit(1)
    );

    const querySnapshot = await getDocs(q);
    
    let nextNumber = 1;

    if (!querySnapshot.empty) {
      const lastCode = querySnapshot.docs[0].data().codigoInterno;
      // Extrai o número do código (ex: de "MOT-0015" extrai 15)
      const lastNumber = parseInt(lastCode.split('-')[1]);
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }

    // Formata com 4 dígitos (ex: 1 -> 0001)
    const formattedNumber = String(nextNumber).padStart(4, '0');
    return `${prefix}-${formattedNumber}`;
  } catch (error) {
    console.error("Erro ao gerar código:", error);
    return `${prefix}-0001`; // Fallback em caso de erro
  }
};

/**
 * Verifica se um código já existe no sistema (Garantia de unicidade)
 */
export const checkCodeExists = async (collectionName, code) => {
  const q = query(collection(db, collectionName), where("codigoInterno", "==", code));
  const querySnapshot = await getDocs(q);
  return !querySnapshot.empty;
};