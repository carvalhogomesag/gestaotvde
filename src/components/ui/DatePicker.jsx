import React from 'react';
import ReactDatePicker, { registerLocale } from 'react-datepicker';
import { pt } from 'date-fns/locale/pt';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import "react-datepicker/dist/react-datepicker.css";

// Registar a localização para Português
registerLocale('pt', pt);

export default function DatePicker({ value, onChange, label, isReadOnly = false, className = "" }) {
  
  const selectedDate = value ? new Date(value) : null;

  const handleChange = (date) => {
    if (!date) {
      onChange("");
      return;
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    onChange(`${year}-${month}-${day}`);
  };

  return (
    <div className={`flex flex-col w-full ${className}`}>
      {label && (
        <label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5 ml-1 tracking-widest">
          {label}
        </label>
      )}

      <div className="relative datepicker-wrapper">
        <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 z-20 transition-colors pointer-events-none ${
          isReadOnly ? 'text-slate-300' : 'text-slate-400 group-focus-within:text-tvde-primary'
        }`}>
          <CalendarIcon size={16} />
        </div>

        <ReactDatePicker
          selected={selectedDate}
          onChange={handleChange}
          locale="pt"
          dateFormat="dd/MM/yyyy"
          readOnly={isReadOnly}
          placeholderText="Seleccione data"
          disabledKeyboardNavigation
          autoComplete="off"
          // PORTAL: Garante que o calendário não seja cortado por modais
          portalId="root"
          // POSICIONAMENTO: Força o alinhamento
          popperPlacement="bottom-start"
          popperClassName="tvde-datepicker-popper"
          // NOTA: popperModifiers foi removido pois a v9 usa Floating UI nativamente
          className={`
            w-full pl-11 pr-4 py-2.5 text-sm rounded-2xl border outline-none transition-all duration-200
            ${isReadOnly 
              ? 'bg-slate-50/50 border-transparent font-bold text-slate-700 cursor-default' 
              : 'border-slate-200 focus:ring-4 focus:ring-tvde-primary/10 focus:border-tvde-primary hover:border-slate-300 cursor-pointer bg-white text-slate-700 font-medium'
            }
          `}
          renderCustomHeader={({
            date,
            changeYear,
            changeMonth,
            decreaseMonth,
            increaseMonth,
            prevMonthButtonDisabled,
            nextMonthButtonDisabled,
          }) => (
            <div className="flex items-center justify-between px-3 py-2 bg-white border-b border-slate-50">
              <button
                type="button"
                onClick={decreaseMonth}
                disabled={prevMonthButtonDisabled}
                className="p-1.5 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-20"
              >
                <ChevronLeft size={18} className="text-slate-600" />
              </button>
              
              <div className="flex gap-1.5">
                <select
                  value={date.getFullYear()}
                  onChange={({ target: { value } }) => changeYear(value)}
                  className="text-xs font-bold bg-slate-50 px-2 py-1 rounded-lg border-none outline-none cursor-pointer hover:text-tvde-primary transition-colors appearance-none"
                >
                  {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - 80 + i).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
                <select
                  value={date.getMonth()}
                  onChange={({ target: { value } }) => changeMonth(value)}
                  className="text-xs font-bold bg-slate-50 px-2 py-1 rounded-lg border-none outline-none cursor-pointer hover:text-tvde-primary transition-colors appearance-none"
                >
                  {["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"].map((month, i) => (
                    <option key={month} value={i}>{month}</option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={increaseMonth}
                disabled={nextMonthButtonDisabled}
                className="p-1.5 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-20"
              >
                <ChevronRight size={18} className="text-slate-600" />
              </button>
            </div>
          )}
        />
      </div>

      <style>{`
        /* Estilização do Popper (Calendário Flutuante) */
        .tvde-datepicker-popper {
          z-index: 9999 !important;
          filter: drop-shadow(0 20px 25px rgb(0 0 0 / 0.1));
          animation: datepicker-fade-in 0.2s ease-out;
          padding-top: 8px; /* Adiciona o espaço entre o input e o calendário nativamente */
        }

        @keyframes datepicker-fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .react-datepicker {
          font-family: inherit;
          border: 1px solid #f1f5f9;
          border-radius: 1.5rem;
          background: white;
          padding: 0.5rem;
          overflow: hidden;
        }

        .react-datepicker__header {
          background-color: white;
          border-bottom: none;
          padding: 0;
        }

        .react-datepicker__day-names {
          margin-top: 0.5rem;
          display: flex;
          justify-content: space-around;
        }

        .react-datepicker__day-name {
          color: #94a3b8;
          font-weight: 800;
          font-size: 0.6rem;
          text-transform: uppercase;
          width: 2.5rem;
          letter-spacing: 0.05em;
        }

        .react-datepicker__month {
          margin: 0.4rem;
        }

        .react-datepicker__day {
          border-radius: 0.75rem;
          font-size: 0.8rem;
          width: 2.5rem;
          line-height: 2.5rem;
          margin: 0.1rem;
          color: #334155;
          font-weight: 500;
          transition: all 0.2s;
        }

        .react-datepicker__day:hover {
          background-color: #f1f5f9;
          color: #3b82f6;
          transform: scale(1.1);
        }

        .react-datepicker__day--selected {
          background-color: #3b82f6 !important;
          color: white !important;
          font-weight: 800;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .react-datepicker__day--today {
          color: #3b82f6;
          font-weight: 800;
          background-color: #eff6ff;
        }

        .react-datepicker__day--outside-month {
          color: #cbd5e1;
          opacity: 0.5;
        }

        .react-datepicker__day--keyboard-selected {
          background-color: transparent;
        }

        /* Esconder a seta padrão do datepicker para um look mais limpo */
        .react-datepicker__triangle {
          display: none !important;
        }

        /* Ajuste para o wrapper do input */
        .datepicker-wrapper .react-datepicker-wrapper {
          width: 100%;
          display: block;
        }
      `}</style>
    </div>
  );
}