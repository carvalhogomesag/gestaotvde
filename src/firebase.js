import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth"; // Adicionado para autenticação

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// ◄ ADICIONADO: Diagnóstico inteligente de ambiente no Console
if (!import.meta.env.VITE_FIREBASE_API_KEY) {
  console.warn(
    "⚠️ [Firebase]: Variáveis de ambiente em falta! " +
    "Verifique se os ficheiros .env.development ou .env.production estão na raiz do projeto."
  );
} else {
  const modoAtivo = import.meta.env.MODE; // Retorna 'development' ou 'production'
  console.log(`📡 [Firebase] Conectado com sucesso em modo: ${modoAtivo.toUpperCase()}`);
}

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Exportar instâncias dos serviços
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app); // Exportado para uso no AuthContext e Login