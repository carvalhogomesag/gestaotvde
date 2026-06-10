import React from 'react';

export default function Button({ children, onClick, variant = 'primary', className = '', type = 'button' }) {
  const variants = {
    primary: 'bg-tvde-primary hover:bg-blue-700 text-white',
    secondary: 'bg-slate-200 hover:bg-slate-300 text-slate-800',
    danger: 'bg-tvde-danger hover:bg-red-700 text-white',
    outline: 'border-2 border-tvde-primary text-tvde-primary hover:bg-tvde-primary hover:text-white'
  };

  return (
    <button
      type={type}
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-medium transition-all active:scale-95 flex items-center justify-center gap-2 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}