import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { 
  Camera, CheckCircle2, Loader2, ShieldCheck, 
  FileText, CreditCard, BadgeCheck, ShieldAlert,
  AlertCircle, Smartphone, Sparkles, XCircle
} from 'lucide-react';
import FileUpload from '../components/ui/FileUpload';
import { analisarDocumentoComIA } from '../services/geminiService';

export default function OnboardingMotorista() {
  const { driverId } = useParams();
  const [motorista, setMotorista] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingIA, setProcessingIA] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    const fetchMotorista = async () => {
      try {
        const docRef = doc(db, "motoristas", driverId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setMotorista({ id: docSnap.id, ...docSnap.data() });
        } else {
          setError("Link de convite inválido ou expirado.");
        }
      } catch (err) {
        setError("Erro ao carregar o seu perfil.");
      } finally {
        setLoading(false);
      }
    };
    fetchMotorista();
  }, [driverId]);

  /**
   * PROCESSAMENTO COM IA + VALIDAÇÃO DE INTEGRIDADE
   */
  const handleUploadEProcessar = async (campo, url, tipoDoc, lado, deveProcessarIA = true) => {
    try {
      const updates = {
        [campo]: url,
        statusOnboarding: 'documentacao_parcial'
      };

      if (deveProcessarIA) {
        setProcessingIA(true);
        setStatusMsg(`A validar a integridade do seu ${tipoDoc}...`);
        
        const contextoDoc = `${lado} do ${tipoDoc}`;
        
        // Enviamos os dados atuais do motorista para a IA comparar (Anti-Fraude)
        const dadosIA = await analisarDocumentoComIA(url, contextoDoc, motorista);
        
        if (dadosIA) {
          // VERIFICAÇÃO DE VALIDADE DO DOCUMENTO
          if (!dadosIA.documento_valido) {
            setProcessingIA(false);
            alert(`Atenção: A IA detetou um problema com este documento.\n\nMotivo: ${dadosIA.motivo_invalidez}\n\nPor favor, verifique se carregou a imagem correta.`);
            // Mesmo sendo inválido, salvamos a foto para o Admin ver o erro, 
            // mas não preenchemos os dados.
            updates[`ai_error_${campo}`] = dadosIA.motivo_invalidez;
          } else {
            // DOCUMENTO VÁLIDO -> PROCEDER COM EXTRAÇÃO
            
            if (dadosIA.alerta_fraude) {
              updates.alerta_fraude = true;
              updates.motivo_fraude = "Inconsistência de identidade detetada pela IA entre documentos.";
            }

            // Mapeamento de Nome
            if (dadosIA.nome && (!motorista.nome || motorista.nome.split(' ').length < 2)) {
              updates.nome = dadosIA.nome;
              updates.ai_filled_nome = true;
            }
            
            // NIF
            if (dadosIA.nif && !motorista.nif) {
              updates.nif = dadosIA.nif;
              updates.ai_filled_nif = true;
            }

            // Números de Documento
            if (dadosIA.numero_documento) {
              if (tipoDoc.includes('Carta')) {
                updates.numCarta = dadosIA.numero_documento;
                updates.ai_filled_numCarta = true;
              } else {
                updates.numID = dadosIA.numero_documento;
                updates.ai_filled_numID = true;
              }
            }

            // Morada e Localidade
            if (dadosIA.moradaRua && !motorista.moradaRua) {
              updates.moradaRua = dadosIA.moradaRua;
              updates.ai_filled_moradaRua = true;
            }
            if (dadosIA.codigoPostal && !motorista.codigoPostal) {
              updates.codigoPostal = dadosIA.codigoPostal;
              updates.ai_filled_codigoPostal = true;
            }
            if (dadosIA.localidade && !motorista.localidade) {
              updates.localidade = dadosIA.localidade;
              updates.ai_filled_localidade = true;
            }

            // Validades e Nascimento
            if (dadosIA.data_validade) {
              if (tipoDoc.includes('Carta')) updates.validadeCarta = dadosIA.data_validade;
              else updates.validadeID = dadosIA.data_validade;
            }
            if (dadosIA.data_nascimento && !motorista.dataNascimento) {
              updates.dataNascimento = dadosIA.data_nascimento;
              updates.ai_filled_dataNascimento = true;
            }

            if (dadosIA.observacoes_ia) {
              updates.observacoes_ia = dadosIA.observacoes_ia;
            }

            updates[`ai_filled_${campo}`] = true;
          }
        }
      }

      const motoristaRef = doc(db, "motoristas", driverId);
      await updateDoc(motoristaRef, updates);

      if (deveProcessarIA) {
        await addDoc(collection(db, "tickets"), {
          atribuidoA: motorista.criadoPor || 'Diretor',
          prioridade: updates.alerta_fraude ? 'alta' : 'media',
          status: 'pendente',
          modulo: 'motoristas',
          vinculoId: driverId,
          vinculoNome: updates.nome || motorista.nome,
          nota: updates.alerta_fraude 
            ? `ALERTA DE SEGURANÇA: IA detetou possível inconsistência no ${tipoDoc}.`
            : `IA processou o ${lado} do ${tipoDoc}. Revise os dados.`,
          dataCriacao: new Date().toISOString()
        });
      }

      setMotorista(prev => ({ ...prev, ...updates }));
      
    } catch (err) {
      console.error("Erro no Onboarding:", err);
      alert("Erro ao validar imagem. Tente novamente.");
    } finally {
      setProcessingIA(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6">
      <Loader2 className="animate-spin text-tvde-primary mb-4" size={40} />
      <p className="text-slate-500 font-medium">A preparar o seu acesso...</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6 text-center">
      <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
        <AlertCircle size={40} />
      </div>
      <h2 className="text-xl font-bold text-slate-800 mb-2">Link Inválido</h2>
      <p className="text-slate-500">{error}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="bg-tvde-dark text-white p-8 rounded-b-[3rem] shadow-xl">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-tvde-primary rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Smartphone size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black">Olá, {motorista?.nome?.split(' ')[0] || 'Motorista'}!</h1>
            <p className="text-blue-200 text-xs font-medium uppercase tracking-widest">Onboarding Digital</p>
          </div>
        </div>
        <p className="text-slate-400 text-sm leading-relaxed">
          O nosso sistema utiliza IA para validar os seus documentos em tempo real. Certifique-se de que as fotos estão nítidas e correspondem aos campos solicitados.
        </p>
      </div>

      <div className="p-6 -mt-6 space-y-4">
        
        {/* DOCUMENTO ID */}
        <OnboardingCard 
          title="Documento de Identificação" 
          subtitle="CC ou Título de Residência"
          icon={CreditCard}
          slots={[
            { label: "Frente", field: "docIDFront", isDone: !!motorista?.docIDFront, processIA: true },
            { label: "Verso", field: "docIDBack", isDone: !!motorista?.docIDBack, processIA: true } 
          ]}
          onUpload={(campo, url, processIA, label) => handleUploadEProcessar(campo, url, 'Documento de Identificação', label, processIA)}
        />

        {/* CARTA DE CONDUÇÃO */}
        <OnboardingCard 
          title="Carta de Condução" 
          subtitle="Frente e Verso (Grupo 2)"
          icon={FileText}
          slots={[
            { label: "Frente", field: "docCartaFront", isDone: !!motorista?.docCartaFront, processIA: true },
            { label: "Verso", field: "docCartaBack", isDone: !!motorista?.docCartaBack, processIA: true }
          ]}
          onUpload={(campo, url, processIA, label) => handleUploadEProcessar(campo, url, 'Carta de Condução', label, processIA)}
        />

        {/* CERTIFICADO TVDE */}
        <OnboardingCard 
          title="Certificado TVDE" 
          subtitle="Documento de motorista TVDE"
          icon={BadgeCheck}
          slots={[
            { label: "Ficheiro", field: "docCertificadoTVDE", isDone: !!motorista?.docCertificadoTVDE, processIA: true }
          ]}
          onUpload={(campo, url, processIA, label) => handleUploadEProcessar(campo, url, 'Certificado TVDE', label, processIA)}
        />

        {/* REGISTO CRIMINAL */}
        <OnboardingCard 
          title="Registo Criminal" 
          subtitle="Válido para motorista TVDE"
          icon={ShieldAlert}
          slots={[
            { label: "Ficheiro", field: "docRegistoCriminal", isDone: !!motorista?.docRegistoCriminal, processIA: true }
          ]}
          onUpload={(campo, url, processIA, label) => handleUploadEProcessar(campo, url, 'Registo Criminal', label, processIA)}
        />
      </div>

      {processingIA && (
        <div className="fixed inset-0 bg-tvde-dark/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-10 text-center animate-in fade-in duration-300">
          <div className="relative mb-8">
            <div className="w-24 h-24 border-4 border-tvde-primary/20 border-t-tvde-primary rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="text-tvde-primary animate-pulse" size={40} />
            </div>
          </div>
          <h3 className="text-white text-xl font-black mb-2">{statusMsg}</h3>
          <p className="text-slate-400 text-sm">A validar integridade e conformidade IMT/AIMA...</p>
        </div>
      )}

      <footer className="p-8 text-center">
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
          © {new Date().getFullYear()} Gestão TVDE Portugal
        </p>
      </footer>
    </div>
  );
}

function OnboardingCard({ title, subtitle, icon: Icon, slots, onUpload }) {
  const allDone = slots.every(s => s.isDone);

  return (
    <div className={`p-5 rounded-[2.5rem] border-2 transition-all duration-500 flex flex-col gap-4 ${
      allDone 
      ? 'bg-white border-green-500 shadow-lg shadow-green-100' 
      : 'bg-white border-white shadow-sm'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
            allDone ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-400'
          }`}>
            <Icon size={24} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">{title}</h3>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">{subtitle}</p>
          </div>
        </div>
        {allDone && <CheckCircle2 className="text-green-500" size={24} />}
      </div>

      <div className="flex gap-3">
        {slots.map((slot, idx) => (
          <div key={idx} className="flex-1 flex flex-col items-center gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-100 relative">
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">{slot.label}</span>
            
            {slot.isDone ? (
              <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                <CheckCircle2 size={20} />
              </div>
            ) : (
              <FileUpload 
                mode="minimal" 
                folder="onboarding_motoristas" 
                onUploadComplete={(url) => onUpload(slot.field, url, slot.processIA, slot.label)}
                label={
                  <div className="w-10 h-10 bg-tvde-primary text-white rounded-full flex items-center justify-center shadow-lg shadow-blue-200 active:scale-90 transition-transform cursor-pointer">
                    <Camera size={20} />
                  </div>
                }
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}