import React, { useMemo } from 'react';
import { X, Car, Sparkles, AlertCircle } from 'lucide-react';
import Button from '../../components/ui/Button';
import DatePicker from '../../components/ui/DatePicker';
import { formatMatricula } from '../../utils/formatters';

const TODAS_AS_MARCAS = [
  "ABARTH", "AIXAM", "ALFA ROMEO", "ALPINA", "ALPINE", "ASTON MARTIN", "AUDI", "AUSTIN", 
  "AUTOBIANCHI", "BENTLEY", "BMW", "CADILLAC", "CHEVROLET", "CHRYSLER", "CITROЁN", "CUPRA", 
  "DACIA", "DAEWOO", "DAIHATSU", "DODGE", "DR", "DS", "FERRARI", "FIAT", "FORD", "FORD USA", 
  "HONDA", "HUMMER", "HYUNDAI", "INFINITI", "ISUZU", "IVECO", "JAGUAR", "JEEP", "KIA", "LADA", 
  "LAMBORGHINI", "LANCIA", "LAND ROVER", "LEXUS", "LOTUS", "MAN", "MASERATI", "MAZDA", 
  "MERCEDES-BENZ", "MG", "MINI", "MITSUBISHI", "NISSAN", "OPEL", "PEUGEOT", "PIAGGIO", 
  "POLESTAR", "PONTIAC", "PORSCHE", "RAM", "RENAULT", "RENAULT TRUCKS", "ROLLS-ROYCE", "ROVER", 
  "SAAB", "SANTANA", "SEAT", "SKODA", "SMART", "SSANGYONG", "SUBARU", "SUZUKI", "TALBOT", 
  "TATA (TELCO)", "TESLA", "TOYOTA", "TRABANT", "TRIUMPH", "VAUXHALL", "VOLVO", "VW"
];

const POPULARES_ESTATICOS = [
  "BMW", "VW", "MERCEDES-BENZ", "RENAULT", "AUDI", "OPEL", "PEUGEOT", "SEAT", "FORD", "CITROЁN"
];

const calcularTempoRestanteTVDE = (dataPrimeiraMatricula, limiteAnos = 7) => {
  if (!dataPrimeiraMatricula) return null;
  const dataMatricula = new Date(dataPrimeiraMatricula);
  const dataLimite = new Date(dataMatricula);
  dataLimite.setFullYear(dataMatricula.getFullYear() + Number(limiteAnos));
  const hoje = new Date();
  
  let anos = dataLimite.getFullYear() - hoje.getFullYear();
  let meses = dataLimite.getMonth() - hoje.getMonth();
  let dias = dataLimite.getDate() - hoje.getDate();
  
  if (dias < 0) {
    meses--;
    const ultimoDiaMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth(), 0).getDate();
    dias += ultimoDiaMesAnterior;
  }
  
  if (meses < 0) {
    anos--;
    meses += 12;
  }
  
  const totalDias = Math.ceil((dataLimite - hoje) / (1000 * 60 * 60 * 24));
  if (totalDias <= 0) {
    return { expirado: true, texto: "Excedeu o limite regulamentar de circulação TVDE" };
  }
  
  let partes = [];
  if (anos > 0) partes.push(`${anos} ${anos === 1 ? 'ano' : 'anos'}`);
  if (meses > 0) partes.push(`${meses} ${meses === 1 ? 'mês' : 'meses'}`);
  if (dias > 0 && partes.length < 2) partes.push(`${dias} ${dias === 1 ? 'dia' : 'dias'}`);
  
  return { expirado: false, texto: `Faltam: ${partes.join(' e ')}`, totalDias };
};

export default function ModalIdentificacao({ 
  isOpen, onClose, formData, setFormData, isReadOnly, 
  veiculos, limiteAnosTVDE, categoriasSelecionadas, handleCategoriaToggle 
}) {
  const inputClass = `w-full py-1.5 px-2.5 border border-slate-200 rounded-lg outline-none transition-all text-xs ${isReadOnly ? 'bg-slate-50/50 border-transparent font-semibold text-slate-700' : 'bg-white focus:ring-2 focus:ring-tvde-primary/20 hover:border-slate-300'}`;

  const sugeridas = useMemo(() => {
    if (!veiculos || veiculos.length === 0) return [];
    const contagem = {};
    veiculos.forEach(v => { if (v.marca) { const m = v.marca.trim().toUpperCase(); contagem[m] = (contagem[m] || 0) + 1; } });
    const ordenadas = Object.entries(contagem).sort((a, b) => b[1] - a[1]).slice(0, 10).map(par => par[0]);
    return ordenadas.map(marca => TODAS_AS_MARCAS.find(m => m.toUpperCase() === marca) || marca);
  }, [veiculos]);

  const popularesFiltradas = useMemo(() => {
    return POPULARES_ESTATICOS.filter(marca => !sugeridas.some(s => s.toUpperCase() === marca.toUpperCase()));
  }, [sugeridas]);

  const restantesFiltradas = useMemo(() => {
    return TODAS_AS_MARCAS.filter(marca => !sugeridas.some(s => s.toUpperCase() === marca.toUpperCase()) && !popularesFiltradas.some(p => p.toUpperCase() === marca.toUpperCase()));
  }, [sugeridas, popularesFiltradas]);

  const tempoRestanteTVDE = useMemo(() => {
    return calcularTempoRestanteTVDE(formData.dataPrimeiraMatricula, limiteAnosTVDE);
  }, [formData.dataPrimeiraMatricula, limiteAnosTVDE]);

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-white rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden p-6 sm:p-8 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 text-left">
        <button type="button" onClick={onClose} className="absolute top-4 right-4 p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600 rounded-full transition-all cursor-pointer"><X size={18} /></button>
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-4 border-b border-slate-100 pb-3 select-none"><Car size={18} className="text-blue-500" /> Identificação & Especificações</h3>
        
        <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div><label className="block text-[9px] font-black text-slate-400 uppercase mb-0.5 ml-1">Matrícula *</label><input required readOnly={isReadOnly} placeholder="AA-00-AA" className={`${inputClass} uppercase font-bold text-center tracking-widest`} value={formData.matricula} onChange={(e) => setFormData({...formData, matricula: formatMatricula(e.target.value)})} /></div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase mb-0.5 ml-1">Marca</label>
              {isReadOnly ? <input readOnly className={inputClass} value={formData.marca} /> : (
                <select className={inputClass} value={formData.marca} onChange={(e) => setFormData({...formData, marca: e.target.value})}>
                  <option value="">Selecione...</option>
                  {sugeridas.length > 0 && <optgroup label="✨ Sugeridos">{sugeridas.map(m => <option key={`sug-${m}`} value={m}>{m}</option>)}</optgroup>}
                  <optgroup label="🔥 Populares">{popularesFiltradas.map(m => <option key={`pop-${m}`} value={m}>{m}</option>)}</optgroup>
                  <optgroup label="📋 Todas (A-Z)">{restantesFiltradas.map(m => <option key={`all-${m}`} value={m}>{m}</option>)}</optgroup>
                </select>
              )}
            </div>
            <div><label className="block text-[9px] font-black text-slate-400 uppercase mb-0.5 ml-1">Modelo</label><input readOnly={isReadOnly} className={inputClass} value={formData.modelo} onChange={(e) => setFormData({...formData, modelo: e.target.value})} /></div>
            <div><label className="block text-[9px] font-black text-slate-400 uppercase mb-0.5 ml-1">Ano</label><input type="number" readOnly={isReadOnly} className={inputClass} value={formData.ano} onChange={(e) => setFormData({...formData, ano: e.target.value})} /></div>
          </div>
          <div>
            <DatePicker label="Data da Primeira Matrícula *" value={formData.dataPrimeiraMatricula} onChange={(val) => setFormData({...formData, dataPrimeiraMatricula: val})} isReadOnly={isReadOnly} />
            {formData.dataPrimeiraMatricula && tempoRestanteTVDE && (
              <div className={`mt-2.5 p-3 rounded-xl text-xs font-bold border flex items-center gap-2 select-none animate-in fade-in ${tempoRestanteTVDE.expirado ? 'bg-red-50 border-red-100 text-red-600' : 'bg-emerald-50 border-emerald-100 text-emerald-700'}`}>
                {tempoRestanteTVDE.expirado ? <AlertCircle size={14} /> : <Sparkles size={14} />}
                <div className="flex-1">
                  <p className="font-black">{tempoRestanteTVDE.texto}</p>
                  <p className="text-[10px] opacity-80 font-medium">Limite regulamentar de {limiteAnosTVDE} anos para circulação de viaturas nas aplicações.</p>
                </div>
              </div>
            )}
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 ml-1">Combustível</label>
            <select disabled={isReadOnly} className={inputClass} value={formData.combustivel} onChange={(e) => setFormData({...formData, combustivel: e.target.value})}>
              <option value="Gasóleo">⛽ Gasóleo (Diesel)</option>
              <option value="Gasolina">⛽ Gasolina</option>
              <option value="Elétrico">⚡ Elétrico</option>
              <option value="GPL">GPL</option>
              <option value="Híbrido">🔋 Híbrido</option>
            </select>
          </div>
          <div className="border-t border-slate-100 pt-3 space-y-2">
            <label className="block text-[9px] font-black text-slate-400 uppercase ml-1">Categorias Ativas nas Aplicações</label>
            <div className="flex flex-wrap gap-2">
              {['Standard', 'Green', 'Comfort', 'XL', 'Black'].map((cat) => {
                const ativo = categoriasSelecionadas.includes(cat);
                return (
                  <button key={cat} type="button" disabled={isReadOnly} onClick={() => handleCategoriaToggle(cat)} className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${ativo ? 'bg-blue-600 border-blue-600 text-white shadow-sm hover:bg-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${ativo ? 'bg-white' : 'bg-slate-300'}`} />
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end shrink-0">
          <Button type="button" onClick={onClose} className="px-6 h-10 text-xs">Confirmar e Fechar</Button>
        </div>
      </div>
    </div>
  );
}