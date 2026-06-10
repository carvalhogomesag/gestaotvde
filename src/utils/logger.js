import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';

export const logAcaoGlobal = async (usuario, acao, modulo, itemNome, itemId) => {
  try {
    await addDoc(collection(db, "logs_sistema"), {
      usuario: usuario,
      acao: acao, // ex: "Criação", "Edição", "Eliminação"
      modulo: modulo, // ex: "Motoristas"
      itemNome: itemNome,
      itemId: itemId,
      data: new Date().toISOString()
    });
  } catch (e) {
    console.error("Erro ao gerar log global:", e);
  }
};