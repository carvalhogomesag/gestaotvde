/**
 * VeiculoForm.jsx
 * Localização: src/features/veiculos/VeiculoForm.jsx
 *
 * Formulário de edição e criação de viaturas.
 * Atualizado com suporte a carregamento de fotografia do veículo, tarifa semanal, região e combustível.
 */

import React, { useState, useEffect } from 'react';
import { 
  CreditCard, Car, Users, FileText, Eye, Trash2, 
  CheckCircle2, AlertCircle, Calendar, ShieldCheck, ClipboardCheck, History,
  Wallet, Plus, Euro, ChevronDown, ChevronUp, Image, MapPin
} from 'lucide-react';
import Button from '../../components/ui/Button';
import FileUpload from '../../components/ui/FileUpload';
import DatePicker from '../../components/ui/DatePicker';
import { formatMatricula, formatCurrency } from '../../utils/formatters';
import { db } from '../../firebase';
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { logAcaoGlobal } from '../../utils/logger';
import ModalFinanceiro from '../financeiro/ModalFinanceiro';

/**
 * Componente Auxiliar: Secção Colapsável Compacta
 */
const CollapsibleSection = ({ title, icon: Icon, iconColor, defaultOpen = false, children }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-slate-100/50 last:border-0">
      <button type="button" onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between group cursor-pointer hover:bg-slate-50 rounded-lg px-2 -mx-2 transition-all py-2">
        <h4 className={`text-[11px] font-black uppercase tracking-wider flex items-center gap-2 ${iconColor}`}><Icon size={14} /> {title}</h4>
        <div className="text-slate-300 group-hover:text-slate-500 transition-colors">{isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</div>
      </button>
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[2000px] opacity-100 mt-2 mb-4' : 'max-h-0 opacity-0'}`}>{children}</div>
    </div>
  );
};

export default function VeiculoForm({ 
  onSubmit, initialData = {}, motoristas = [], proprietarios = [], cartoes = [], onCancel, isReadOnly = false, onCriarProprietario, onCriarMotorista 
}) {
  const { userData } = useAuth();
  const [formData, setFormData] = useState({
    marca: initialData.marca || '', 
    modelo: initialData.modelo || '', 
    matricula: initialData.matricula || '', 
    ano: initialData.ano || '',
    proprietarioId: initialData.proprietarioId || '', 
    proprietarioNome: initialData.proprietarioNome || '', 
    motoristaId: initialData.motoristaId || '',
    motoristaNome: initialData.motoristaNome || '', 
    docDUA: initialData.docDUA || '', 
    docSeguro: initialData.docSeguro || '',
    docIPO: initialData.docIPO || '', 
    validadeDUA: initialData.validadeDUA || '', 
    validadeSeguro: initialData.validadeSeguro || '', 
    validadeIPO: initialData.validadeIPO || '',
    // Novos campos do catálogo público de anúncios
    fotoUrl: initialData.fotoUrl || '', 
    precoSemanal: initialData.precoSemanal || '', 
    cidade: initialData.cidade || 'Lisboa',
    combustivel: initialData.combustivel || 'Gasóleo' // Correção efetuada: Inicialização de combustível
  });

  const [movimentos, setMovimentos] = useState([]);
  const [novoMovimento, setNovoMovimento] = useState({ tipo: 'debito', valor: '', descricao: '', data: new Date().toISOString().split('T')[0] });
  const [modoProprietario, setModoProprietario] = useState('existente');
  const [modoMotorista, setModoMotorista] = useState('existente');
  const [novoProprietario, setNovoProprietario] = useState({ nome: '', nif: '', telemovel: '' });
  const [novoMotorista, setNovoMotorista] = useState({ nome: '', nif: '', telemovel: '' });
  const [modalFinanceiroAberto, setModalFinanceiroAberto] = useState(false);

  // Sincronização em tempo real da conta corrente pendente
  useEffect(() => {
    if (initialData.id) {
      const q = query(
        collection(db, "movimentos_financeiros"), 
        where("entidadeId", "==", initialData.id), 
        where("pagoNoFechoId", "==", "")
      );
      const unsubscribe = onSnapshot(q, (snapshot) => { 
        setMovimentos(snapshot.docs.map(d => ({ id: d.id, ...d.data() }))); 
      });
      return () => unsubscribe();
    }
  }, [initialData.id]);

  const handleAddMovimento = async () => {
    if (!novoMovimento.valor || !novoMovimento.descricao) {
      alert("Por favor, preencha o valor e a descrição do lançamento.");
      return;
    }
    try {
      const valorNum = parseFloat(novoMovimento.valor);
      const docRef = await addDoc(collection(db, "movimentos_financeiros"), {
        tipoEntidade: 'veiculo', 
        entidadeId: initialData.id, 
        tipoMovimento: novoMovimento.tipo, 
        valor: valorNum,
        descricao: novoMovimento.descricao, 
        dataLancamento: novoMovimento.data, 
        pagoNoFechoId: "", 
        criadoPor: userData.nome, 
        dataCriacao: new Date().toISOString()
      });
      await logAcaoGlobal(userData.nome, "Lançamento Financeiro (Veículo)", "Conta Corrente", `${novoMovimento.tipo.toUpperCase()}: ${novoMovimento.descricao}`, docRef.id);
      setNovoMovimento({ tipo: 'debito', valor: '', descricao: '', data: new Date().toISOString().split('T')[0] });
    } catch (error) { alert("Erro ao lançar movimento."); }
  };

  const handleDeleteMovimento = async (m) => {
    if (window.confirm("Eliminar este lançamento financeiro?")) {
      await deleteDoc(doc(db, "movimentos_financeiros", m.id));
      await logAcaoGlobal(userData.nome, "Eliminação Financeira", "Conta Corrente", m.descricao, m.id);
    }
  };

  const handleMatriculaChange = (e) => { const formatted = formatMatricula(e.target.value); setFormData({ ...formData, matricula: formatted }); };
  const handleRemoveFile = (field) => { if (window.confirm("Deseja remover este ficheiro?")) { setFormData(prev => ({ ...prev, [field]: '' })); } };
  const inputClass = `w-full p-2 border border-slate-200 rounded-xl outline-none transition-all ${isReadOnly ? 'bg-slate-50/50 border-transparent font-semibold text-slate-700' : 'bg-white focus:ring-2 focus:ring-tvde-primary/20 hover:border-slate-300'}`;

  // Componente de carregamento e visualização de documentos / fotografia
  const DocumentCard = ({ label, fileUrl, dateField, folder, uploadField }) => (
    <div className={`p-3 rounded-2xl border transition-all ${fileUrl ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50 border-dashed border-slate-300'}`}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          {fileUrl ? <CheckCircle2 size={14} className="text-green-500" /> : <AlertCircle size={14} className="text-slate-300" />}
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-tight">{label}</span>
        </div>
        {fileUrl && (
          <div className="flex gap-1">
            <a href={fileUrl} target="_blank" rel="noreferrer" className="p-1 bg-blue-50 text-tvde-primary rounded-lg hover:bg-tvde-primary hover:text-white transition-all">
              <Eye size={12} />
            </a>
            {!isReadOnly && (
              <button type="button" onClick={() => handleRemoveFile(uploadField)} className="p-1 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all">
                <Trash2 size={12} />
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* Mini-visualização (Thumbnail) se for a fotografia do veículo */}
      {fileUrl && uploadField === "fotoUrl" && (
        <div className="my-2 w-full h-24 rounded-xl overflow-hidden border border-slate-100 bg-slate-100 flex items-center justify-center shrink-0">
          <img src={fileUrl} alt="Viatura" className="w-full h-full object-cover" />
        </div>
      )}

      <div className="space-y-2">
        {!isReadOnly && !fileUrl && (
          <FileUpload label="Carregar" folder={folder} onUploadComplete={(url) => setFormData({...formData, [uploadField]: url})} />
        )}
        {dateField && (
          <div className="pt-1 border-t border-slate-100">
            <DatePicker label="Validade" value={formData[dateField]} onChange={(val) => setFormData({...formData, [dateField]: val})} isReadOnly={isReadOnly} />
          </div>
        )}
      </div>
    </div>
  );

  const cartoesAtribuidos = cartoes.filter(c => c.veiculoId === initialData.id);

  const handleSubmit = async (e) => {
    e.preventDefault();
    let dadosFinais = { ...formData };
    if (modoProprietario === 'novo' && novoProprietario.nome && onCriarProprietario) {
      const novoId = await onCriarProprietario(novoProprietario);
      dadosFinais.proprietarioId = novoId;
      dadosFinais.proprietarioNome = novoProprietario.nome;
    }
    if (modoMotorista === 'novo' && novoMotorista.nome && onCriarMotorista) {
      const novoId = await onCriarMotorista(novoMotorista);
      dadosFinais.motoristaId = novoId;
      dadosFinais.motoristaNome = novoMotorista.nome;
    }
    onSubmit(dadosFinais);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-1 max-h-[75vh] overflow-y-auto pr-4 custom-scrollbar">
      
      {/* Secção de Identificação com os dados de Anúncio e combustível integrados */}
      <div className="bg-slate-50 p-5 rounded-[2rem] border border-slate-100 mb-4 space-y-4">
        <h4 className="text-[11px] font-black text-tvde-primary uppercase tracking-wider flex items-center gap-2 mb-2"><Car size={14} /> Identificação do Veículo</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div><label className="block text-[9px] font-black text-slate-400 uppercase mb-0.5 ml-1">Matrícula *</label><input required readOnly={isReadOnly} placeholder="AA-00-AA" className={`${inputClass} uppercase font-bold text-center tracking-widest`} value={formData.matricula} onChange={handleMatriculaChange} /></div>
          <div><label className="block text-[9px] font-black text-slate-400 uppercase mb-0.5 ml-1">Marca</label><input readOnly={isReadOnly} className={inputClass} value={formData.marca} onChange={(e) => setFormData({...formData, marca: e.target.value})} /></div>
          <div><label className="block text-[9px] font-black text-slate-400 uppercase mb-0.5 ml-1">Modelo</label><input readOnly={isReadOnly} className={inputClass} value={formData.modelo} onChange={(e) => setFormData({...formData, modelo: e.target.value})} /></div>
          <div><label className="block text-[9px] font-black text-slate-400 uppercase mb-0.5 ml-1">Ano</label><input type="number" readOnly={isReadOnly} className={inputClass} value={formData.ano} onChange={(e) => setFormData({...formData, ano: e.target.value})} /></div>
        </div>

        {/* Campos do Anúncio do Catálogo público (Combustível, Preço e Região de Operação) [ATUALIZADO] */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-200/50 pt-4">
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase mb-0.5 ml-1">Tipo de Combustível</label>
            <select 
              disabled={isReadOnly} 
              className={inputClass} 
              value={formData.combustivel} 
              onChange={(e) => setFormData({...formData, combustivel: e.target.value})}
            >
              <option value="Gasóleo">⛽ Gasóleo (Diesel)</option>
              <option value="Gasolina">⛽ Gasolina</option>
              <option value="Elétrico">⚡ Elétrico</option>
              <option value="GPL">GPL</option>
              <option value="Híbrido">🔋 Híbrido</option>
            </select>
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase mb-0.5 ml-1">Tarifa Semanal (€)</label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">€</span>
              <input 
                type="number" 
                placeholder="0.00"
                readOnly={isReadOnly} 
                className={`${inputClass} pl-6`} 
                value={formData.precoSemanal} 
                onChange={(e) => setFormData({...formData, precoSemanal: e.target.value})} 
              />
            </div>
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase mb-0.5 ml-1">Região de Aluguer</label>
            <select 
              disabled={isReadOnly} 
              className={inputClass} 
              value={formData.cidade} 
              onChange={(e) => setFormData({...formData, cidade: e.target.value})}
            >
              <option value="Lisboa">Grande Lisboa</option>
              <option value="Porto">Grande Porto</option>
              <option value="Braga">Minho / Braga</option>
              <option value="Algarve">Algarve</option>
            </select>
          </div>
        </div>
      </div>

      <CollapsibleSection title="Atribuições" icon={Users} iconColor="text-tvde-primary" defaultOpen={false}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-700">Proprietário</label>
            {!isReadOnly && !initialData.id && (
              <div className="flex rounded-lg border border-slate-200 overflow-hidden bg-slate-50 p-1 gap-1">
                <button type="button" onClick={() => setModoProprietario('existente')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${modoProprietario === 'existente' ? 'bg-white text-tvde-primary shadow-sm' : 'text-slate-400'}`}>Existente</button>
                <button type="button" onClick={() => setModoProprietario('novo')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${modoProprietario === 'novo' ? 'bg-white text-tvde-primary shadow-sm' : 'text-slate-400'}`}>+ Novo</button>
              </div>
            )}
            {modoProprietario === 'existente' ? (
              <select disabled={isReadOnly} className={inputClass} value={formData.proprietarioId} onChange={(e) => { const p = proprietarios.find(p => p.id === e.target.value); setFormData({...formData, proprietarioId: e.target.value, proprietarioNome: p?.nome || ''}); }}>
                <option value="">Selecione...</option>
                {proprietarios.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            ) : (
              <div className="space-y-2 bg-blue-50 border border-blue-100 rounded-xl p-3">
                <input placeholder="Nome completo *" required className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white" value={novoProprietario.nome} onChange={(e) => setNovoProprietario({ ...novoProprietario, nome: e.target.value })} />
                <div className="grid grid-cols-2 gap-2">
                  <input placeholder="NIF" className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white font-mono" value={novoProprietario.nif} onChange={(e) => setNovoProprietario({ ...novoProprietario, nif: e.target.value })} />
                  <input placeholder="Telemóvel" className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white" value={novoProprietario.telemovel} onChange={(e) => setNovoProprietario({ ...novoProprietario, telemovel: e.target.value })} />
                </div>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-700">Motorista Habitual</label>
            {!isReadOnly && !initialData.id && (
              <div className="flex rounded-lg border border-slate-200 overflow-hidden bg-slate-50 p-1 gap-1">
                <button type="button" onClick={() => setModoMotorista('existente')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${modoMotorista === 'existente' ? 'bg-white text-tvde-primary shadow-sm' : 'text-slate-400'}`}>Existente</button>
                <button type="button" onClick={() => setModoMotorista('novo')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${modoMotorista === 'novo' ? 'bg-white text-tvde-primary shadow-sm' : 'text-slate-400'}`}>+ Novo</button>
              </div>
            )}
            {modoMotorista === 'existente' ? (
              <select disabled={isReadOnly} className={inputClass} value={formData.motoristaId} onChange={(e) => { const m = motoristas.find(m => m.id === e.target.value); setFormData({...formData, motoristaId: e.target.value, motoristaNome: m?.nome || ''}); }}>
                <option value="">Disponível</option>
                {motoristas.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
              </select>
            ) : (
              <div className="space-y-2 bg-blue-50 border border-blue-100 rounded-xl p-3">
                <input placeholder="Nome completo *" required className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white" value={novoMotorista.nome} onChange={(e) => setNovoMotorista({ ...novoMotorista, nome: e.target.value })} />
                <div className="grid grid-cols-2 gap-2">
                  <input placeholder="NIF" className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white font-mono" value={novoMotorista.nif} onChange={(e) => setNovoMotorista({ ...novoMotorista, nif: e.target.value })} />
                  <input placeholder="Telemóvel" className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white" value={novoMotorista.telemovel} onChange={(e) => setNovoMotorista({ ...novoMotorista, telemovel: e.target.value })} />
                </div>
              </div>
            )}
          </div>
        </div>
      </CollapsibleSection>

      {initialData.id && (
        <CollapsibleSection title="Conta Corrente / Ajustes da Viatura" icon={Wallet} iconColor="text-tvde-primary" defaultOpen={true}>
          <div className="space-y-3">
            {!isReadOnly && (
              <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="md:col-span-1">
                  <select className={inputClass} value={novoMovimento.tipo} onChange={(e) => setNovoMovimento({...novoMovimento, tipo: e.target.value})}>
                    <option value="debito">🔴 Débito</option>
                    <option value="credito">🟢 Crédito</option>
                  </select>
                </div>
                <div className="md:col-span-1 relative">
                  <Euro className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                  <input type="number" className={`${inputClass} pl-6`} placeholder="0.00" value={novoMovimento.valor} onChange={(e) => setNovoMovimento({...novoMovimento, valor: e.target.value})} />
                </div>
                <div className="md:col-span-2">
                  <input className={inputClass} placeholder="Descrição do motivo..." value={novoMovimento.descricao} onChange={(e) => setNovoMovimento({...novoMovimento, descricao: e.target.value})} />
                </div>
                <div className="md:col-span-1">
                  <DatePicker value={novoMovimento.data} onChange={(val) => setNovoMovimento({...novoMovimento, data: val})} />
                </div>
                <div className="md:col-span-1">
                  <Button onClick={handleAddMovimento} className="h-[38px] w-full text-xs active:scale-95"><Plus size={14} /> Lançar</Button>
                </div>
              </div>
            )}
            <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
              <table className="w-full text-left text-[10px]">
                <thead className="bg-slate-50 border-b border-slate-100 font-black text-slate-400 uppercase">
                  <tr>
                    <th className="p-2">Data</th>
                    <th className="p-2">Descrição</th>
                    <th className="p-2 text-center">Tipo</th>
                    <th className="p-2 text-right">Valor</th>
                    {!isReadOnly && <th className="p-2"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {movimentos.length > 0 ? movimentos.map(m => (
                    <tr key={m.id}>
                      <td className="p-2">{new Date(m.dataLancamento).toLocaleDateString('pt-PT')}</td>
                      <td className="p-2 font-bold">{m.descricao}</td>
                      <td className="p-2 text-center uppercase font-black text-[8px]">{m.tipoMovimento}</td>
                      <td className={`p-2 text-right font-black ${m.tipoMovimento === 'credito' ? 'text-tvde-accent' : 'text-tvde-danger'}`}>{formatCurrency(m.valor)}</td>
                      {!isReadOnly && <td className="p-2 text-right"><button type="button" onClick={() => handleDeleteMovimento(m)} className="text-slate-300 hover:text-red-500"><Trash2 size={12} /></button></td>}
                    </tr>
                  )) : (
                    <tr><td colSpan="5" className="p-4 text-center text-slate-400 italic">Sem movimentos registados.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CollapsibleSection>
      )}

      {initialData.id && (
        <CollapsibleSection title="Cartões Vinculados" icon={CreditCard} iconColor="text-tvde-primary" defaultOpen={false}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">{cartoesAtribuidos.length > 0 ? cartoesAtribuidos.map(c => (<div key={c.id} className={`flex items-center justify-between p-2 rounded-xl border ${c.tipo === 'combustivel' ? 'bg-orange-50 border-orange-100' : 'bg-blue-50 border-blue-100'}`}><div className="text-[10px] font-bold text-slate-700">{c.numero} <span className="opacity-50">({c.fornecedor})</span></div><div className="text-[10px] font-black text-slate-800 bg-white/50 px-2 py-0.5 rounded border border-white">PIN: {c.pin}</div></div>)) : <p className="text-[10px] text-slate-400 italic p-2">Nenhum cartão associado.</p>}</div>
        </CollapsibleSection>
      )}

      {/* Secção de Documentação Atualizada com Campo de Upload de Foto */}
      <CollapsibleSection title="Documentação e Foto da Viatura" icon={FileText} iconColor="text-tvde-primary" defaultOpen={false}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <DocumentCard label="DUA" folder="veiculos/dua" uploadField="docDUA" fileUrl={formData.docDUA} />
          <DocumentCard label="Seguro" folder="veiculos/seguros" uploadField="docSeguro" fileUrl={formData.docSeguro} dateField="validadeSeguro" />
          <DocumentCard label="IPO" folder="veiculos/ipo" uploadField="docIPO" fileUrl={formData.docIPO} dateField="validadeIPO" />
          {/* Novo campo de carregamento de fotografia real para o catálogo público */}
          <DocumentCard label="Foto da Viatura" folder="veiculos/fotos" uploadField="fotoUrl" fileUrl={formData.fotoUrl} />
        </div>
      </CollapsibleSection>

      {initialData.historico && initialData.historico.length > 0 && (
        <CollapsibleSection title="Histórico de Alterações" icon={History} iconColor="text-slate-400" defaultOpen={false}>
          <div className="space-y-2">{[...initialData.historico].reverse().map((log, index) => (<div key={index} className="flex gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-[10px]"><div className="flex-1"><div className="flex justify-between font-bold text-slate-700 mb-1"><span>{log.usuario}</span><span>{new Date(log.data).toLocaleDateString('pt-PT')}</span></div><p className="text-slate-500 italic">"{log.descricao}"</p></div></div>))}</div>
        </CollapsibleSection>
      )}

      <div className="flex gap-3 mt-6 sticky bottom-0 bg-white pt-4 border-t border-slate-50">
        <Button variant="secondary" className="flex-1 h-10 text-xs" onClick={onCancel}>{isReadOnly ? 'Fechar' : 'Cancelar'}</Button>
        {initialData.id && (
          <Button
            type="button"
            variant="outline"
            className="flex-1 h-10 text-xs border-emerald-500 text-emerald-600 hover:bg-emerald-50"
            onClick={() => setModalFinanceiroAberto(true)}
          >
            💰 Gestão Financeira
          </Button>
        )}
        {!isReadOnly && <Button type="submit" className="flex-1 h-10 text-xs shadow-md">Guardar Veículo</Button>}
      </div>

      <ModalFinanceiro
        isOpen={modalFinanceiroAberto}
        onClose={() => setModalFinanceiroAberto(false)}
        entidadeId={initialData.id}
        tipoEntidade="veiculo"
        nomeEntidade={formData.matricula || initialData.matricula || 'Veículo'}
      />
    </form>
  );
}