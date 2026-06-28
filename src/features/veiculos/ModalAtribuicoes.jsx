import React, { useState } from 'react';
import { X, Users, Radio, UserCheck } from 'lucide-react';
import Button from '../../components/ui/Button';

export default function ModalAtribuicoes({ 
  isOpen, onClose, formData, setFormData, isReadOnly, 
  initialData, proprietarios, motoristas, aparelhosAtivos, 
  onCriarProprietario, onCriarMotorista 
}) {
  const inputClass = `w-full py-1.5 px-2.5 border border-slate-200 rounded-lg outline-none transition-all text-xs ${isReadOnly ? 'bg-slate-50/50 border-transparent font-semibold text-slate-700' : 'bg-white focus:ring-2 focus:ring-tvde-primary/20 hover:border-slate-300'}`;
  
  const [modoProprietario, setModoProprietario] = useState('existente');
  const [modoMotorista, setModoMotorista] = useState('existente');
  const [novoProprietario, setNovoProprietario] = useState({ nome: '', nif: '', telemovel: '' });
  const [novoMotorista, setNovoMotorista] = useState({ nome: '', nif: '', telemovel: '' });

  const obterViaVerdeDoMotorista = (motoristaId) => {
    if (!motoristaId) return null;
    return aparelhosAtivos.find(a => a.motoristaId === motoristaId);
  };

  const criarProprietarioInline = async () => {
    if (!novoProprietario.nome) return;
    const novoId = await onCriarProprietario(novoProprietario);
    setFormData({...formData, proprietarioId: novoId, proprietarioNome: novoProprietario.nome});
    setModoProprietario('existente');
  };

  const criarMotoristaInline = async () => {
    if (!novoMotorista.nome) return;
    const novoId = await onCriarMotorista(novoMotorista);
    setFormData({...formData, motoristaId: novoId, motoristaNome: novoMotorista.nome});
    setModoMotorista('existente');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-white rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden p-6 sm:p-8 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 text-left">
        <button type="button" onClick={onClose} className="absolute top-4 right-4 p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600 rounded-full transition-all cursor-pointer"><X size={18} /></button>
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-4 border-b border-slate-100 pb-3 select-none"><Users size={18} className="text-blue-500" /> Atribuições de Operação</h3>
        
        <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
          
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Regime de Aluguer</label>
            <select disabled={isReadOnly} className={inputClass} value={formData.tipoAluguer} onChange={(e) => setFormData({...formData, tipoAluguer: e.target.value, ...(e.target.value === 'integral' ? { motoristaId2: '', motoristaNome2: '' } : {})})}>
              <option value="integral">👤 Período Integral (24h — Condutor Único)</option>
              <option value="turnos">👥 Partilhado (Por Turnos — Até 2 Condutores)</option>
            </select>
          </div>

          {/* [NOVO] SWITCH INTELIGENTE DE PROPRIETÁRIO CONDUTOR [2] */}
          <div className="flex items-center justify-between p-3.5 bg-emerald-50/50 border border-emerald-100 rounded-xl">
            <div>
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 select-none cursor-pointer">
                <UserCheck size={14} className="text-emerald-600 shrink-0" />
                Proprietário Condutor
              </label>
              <p className="text-[10px] text-slate-400 leading-tight font-medium">Ative se o proprietário legal for o próprio motorista principal.</p>
            </div>
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, proprietarioCondutor: !prev.proprietarioCondutor }))}
              className={`relative inline-flex h-5.5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                formData.proprietarioCondutor ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
            >
              <span className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                formData.proprietarioCondutor ? 'translate-x-4.5' : 'translate-x-0'
              }`} />
            </button>
          </div>

          {/* Secção do Proprietário */}
          {!formData.proprietarioCondutor ? (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Proprietário / Operador</label>
              {!isReadOnly && !initialData.id && (
                <div className="flex rounded-lg border border-slate-200 overflow-hidden bg-slate-50 p-1 gap-1 w-fit select-none">
                  <button type="button" onClick={() => setModoProprietario('existente')} className={`px-4 py-1 text-xs font-bold rounded transition-colors ${modoProprietario === 'existente' ? 'bg-white text-tvde-primary shadow-sm' : 'text-slate-400'}`}>Existente</button>
                  <button type="button" onClick={() => setModoProprietario('novo')} className={`px-4 py-1 text-xs font-bold rounded transition-colors ${modoProprietario === 'novo' ? 'bg-white text-tvde-primary shadow-sm' : 'text-slate-400'}`}>+ Novo</button>
                </div>
              )}
              {modoProprietario === 'existente' ? (
                <select disabled={isReadOnly} className={inputClass} value={formData.proprietarioId} onChange={(e) => { const p = proprietarios.find(p => p.id === e.target.value); setFormData({...formData, proprietarioId: e.target.value, proprietarioNome: p?.nome || ''}); }}>
                  <option value="">Selecione...</option>
                  {proprietarios.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              ) : (
                <div className="space-y-2 bg-blue-50/50 border border-blue-100 rounded-xl p-3">
                  <input placeholder="Nome completo *" className="w-full p-1.5 border border-slate-200 rounded-lg text-xs bg-white" value={novoProprietario.nome} onChange={(e) => setNovoProprietario({ ...novoProprietario, nome: e.target.value })} />
                  <div className="grid grid-cols-2 gap-2">
                    <input placeholder="NIF" className="w-full p-1.5 border border-slate-200 rounded-lg text-xs bg-white font-mono" value={novoProprietario.nif} onChange={(e) => setNovoProprietario({ ...novoProprietario, nif: e.target.value })} />
                    <input placeholder="Telemóvel" className="w-full p-1.5 border border-slate-200 rounded-lg text-xs bg-white" value={novoProprietario.telemovel} onChange={(e) => setNovoProprietario({ ...novoProprietario, telemovel: e.target.value })} />
                  </div>
                  <button type="button" onClick={criarProprietarioInline} className="px-3 py-1.5 bg-blue-600 text-white text-[10px] font-bold rounded-lg shadow-sm">Confirmar Proprietário</button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 bg-emerald-50/30 rounded-xl border border-dashed border-emerald-200 select-none animate-in fade-in duration-200">
              <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider block mb-1">Proprietário Vinculado</span>
              <p className="text-xs font-extrabold text-slate-800">
                👤 {formData.motoristaNome || "Aguardando seleção do motorista..."}
              </p>
              <p className="text-[9.5px] text-slate-400 mt-1 leading-tight">Os dados fiscais do proprietário foram sincronizados em tempo real com o motorista principal devido ao regime de Proprietário Condutor.</p>
            </div>
          )}

          {/* Secção dos Condutores */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-3">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              {formData.tipoAluguer === 'integral' ? 'Condutor Associado' : 'Condutores por Turno (Partilhado)'}
            </label>
            
            {formData.tipoAluguer === 'integral' ? (
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-550 uppercase tracking-wider">Motorista Habitual (24h)</label>
                {!isReadOnly && !initialData.id && (
                  <div className="flex rounded-lg border border-slate-200 overflow-hidden bg-slate-50 p-1 gap-1 w-fit">
                    <button type="button" onClick={() => setModoMotorista('existente')} className={`px-3 py-1 text-xs font-bold rounded transition-colors ${modoMotorista === 'existente' ? 'bg-white text-tvde-primary shadow-sm' : 'text-slate-400'}`}>Existente</button>
                    <button type="button" onClick={() => setModoMotorista('novo')} className={`px-3 py-1 text-xs font-bold rounded transition-colors ${modoMotorista === 'novo' ? 'bg-white text-tvde-primary shadow-sm' : 'text-slate-400'}`}>+ Novo</button>
                  </div>
                )}
                {modoMotorista === 'existente' ? (
                  <div className="space-y-1.5">
                    <select disabled={isReadOnly} className={inputClass} value={formData.motoristaId} onChange={(e) => { const m = motoristas.find(m => m.id === e.target.value); setFormData({...formData, motoristaId: e.target.value, motoristaNome: m?.nome || ''}); }}>
                      <option value="">Disponível</option>
                      {motoristas.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                    </select>
                    {(() => {
                      const vv = obterViaVerdeDoMotorista(formData.motoristaId);
                      return vv ? (
                        <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-2 text-emerald-800 text-[10px] animate-in fade-in duration-200">
                          <Radio size={12} className="text-emerald-600 animate-pulse shrink-0" />
                          <span>Via Verde Ativa: <strong className="font-mono">{vv.numeroAparelho}</strong></span>
                        </div>
                      ) : formData.motoristaId ? (
                        <div className="p-2 bg-slate-100/50 rounded-xl border border-slate-200/50 flex items-center gap-2 text-slate-400 text-[10px] animate-in fade-in duration-200">
                          <Radio size={12} className="text-slate-300 shrink-0" />
                          <span className="italic font-medium">Sem identificador Via Verde pessoal associado</span>
                        </div>
                      ) : null;
                    })()}
                  </div>
                ) : (
                  <div className="space-y-2 bg-blue-50/50 border border-blue-100 rounded-xl p-3">
                    <input placeholder="Nome completo *" className="w-full p-1.5 border border-slate-200 rounded-lg text-xs bg-white" value={novoMotorista.nome} onChange={(e) => setNovoMotorista({ ...novoMotorista, nome: e.target.value })} />
                    <div className="grid grid-cols-2 gap-2">
                      <input placeholder="NIF" className="w-full p-1.5 border border-slate-200 rounded-lg text-xs bg-white font-mono" value={novoMotorista.nif} onChange={(e) => setNovoMotorista({ ...novoMotorista, nif: e.target.value })} />
                      <input placeholder="Telemóvel" className="w-full p-1.5 border border-slate-200 rounded-lg text-xs bg-white" value={novoMotorista.telemovel} onChange={(e) => setNovoMotorista({ ...novoMotorista, telemovel: e.target.value })} />
                    </div>
                    <button type="button" onClick={criarMotoristaInline} className="px-3 py-1.5 bg-blue-600 text-white text-[10px] font-bold rounded-lg shadow-sm">Confirmar Motorista</button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-550 uppercase tracking-wider">Turno Diurno (A)</label>
                  <select disabled={isReadOnly} className={inputClass} value={formData.motoristaId} onChange={(e) => { const m = motoristas.find(m => m.id === e.target.value); setFormData({...formData, motoristaId: e.target.value, motoristaNome: m?.nome || ''}); }}>
                    <option value="">Disponível</option>
                    {motoristas.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                  </select>
                  {(() => {
                    const vv = obterViaVerdeDoMotorista(formData.motoristaId);
                    return vv ? (
                      <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-2 text-emerald-800 text-[10px]">
                        <Radio size={12} className="text-emerald-600 animate-pulse shrink-0" />
                        <span>Via Verde: <strong className="font-mono">{vv.numeroAparelho}</strong></span>
                      </div>
                    ) : formData.motoristaId ? (
                      <div className="p-2 bg-slate-100/50 rounded-xl border border-slate-200/50 flex items-center gap-2 text-slate-400 text-[10px]">
                        <Radio size={12} className="text-slate-300 shrink-0" />
                        <span className="italic font-medium">Sem Via Verde</span>
                      </div>
                    ) : null;
                  })()}
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase ml-1">Turno Noturno (B)</label>
                  <select disabled={isReadOnly} className={inputClass} value={formData.motoristaId2 || ''} onChange={(e) => { const m = motoristas.find(m => m.id === e.target.value); setFormData({...formData, motoristaId2: e.target.value, motoristaNome2: m?.nome || ''}); }}>
                    <option value="">Disponível</option>
                    {motoristas.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                  </select>
                  {(() => {
                    const vv = obterViaVerdeDoMotorista(formData.motoristaId2);
                    return vv ? (
                      <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-2 text-emerald-800 text-[10px]">
                        <Radio size={12} className="text-emerald-600 animate-pulse shrink-0" />
                        <span>Via Verde: <strong className="font-mono">{vv.numeroAparelho}</strong></span>
                      </div>
                    ) : formData.motoristaId2 ? (
                      <div className="p-2 bg-slate-100/50 rounded-xl border border-slate-200/50 flex items-center gap-2 text-slate-400 text-[10px]">
                        <Radio size={12} className="text-slate-300 shrink-0" />
                        <span className="italic font-medium">Sem Via Verde</span>
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>
            )}

          </div>
        </div>
        <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end shrink-0">
          <Button type="button" onClick={onClose} className="px-6 h-10 text-xs shadow-md">Confirmar e Fechar</Button>
        </div>
      </div>
    </div>
  );
}