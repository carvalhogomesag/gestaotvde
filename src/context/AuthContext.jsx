import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        
        try {
          // MÉTODO DE BUSCA ROBUSTO:
          // 1. Primeiro tenta pelo UID (Padrão do Firebase)
          const docRef = doc(db, "usuarios", currentUser.uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            setUserData(docSnap.data());
          } else {
            // 2. Se não encontrar pelo UID, procura pelo EMAIL (Para perfis criados manualmente pelo Diretor)
            const q = query(
              collection(db, "usuarios"), 
              where("email", "==", currentUser.email.toLowerCase())
            );
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
              // Guarda os dados do primeiro documento encontrado com esse email
              setUserData(querySnapshot.docs[0].data());
            } else {
              setUserData(null);
            }
          }
        } catch (error) {
          console.error("Erro ao procurar perfil do utilizador:", error);
          setUserData(null);
        }
      } else {
        setUser(null);
        setUserData(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = (email, password) => signInWithEmailAndPassword(auth, email.toLowerCase(), password);
  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ user, userData, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);