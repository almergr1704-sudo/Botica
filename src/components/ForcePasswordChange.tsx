import React, { useState, useEffect } from 'react';
import { Lock, Check, X, ShieldAlert, KeyRound, Eye, EyeOff, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Usuario } from '../types/pharmacy';

interface ForcePasswordChangeProps {
  currentUser: Usuario;
  onPasswordChanged: (updatedUser: Usuario) => void;
  onLogout: () => void;
}

export default function ForcePasswordChange({
  currentUser,
  onPasswordChanged,
  onLogout
}: ForcePasswordChangeProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Password requirements
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);

  const meetsAllRequirements = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecial;
  const isMatch = newPassword && newPassword === confirmPassword;

  // Real-time strength score calculation
  const getStrengthScore = () => {
    let score = 0;
    if (newPassword.length >= 6) {
      if (hasMinLength) score += 1; // 1 pt for length >= 8
      if (hasUppercase && hasLowercase) score += 1; // 1 pt for casing
      if (hasNumber) score += 1; // 1 pt for numbers
      if (hasSpecial) score += 1; // 1 pt for symbol
    }
    return score;
  };

  const strengthScore = getStrengthScore();

  const getStrengthInfo = () => {
    if (!newPassword) return { label: 'Sin ingresar', colorClass: 'bg-slate-200 dark:bg-slate-700 w-0', textColor: 'text-slate-400', progress: 0 };
    if (newPassword.length < 6) return { label: 'Muy Corto (Mín. 6)', colorClass: 'bg-rose-500 w-1/4', textColor: 'text-rose-500 dark:text-rose-400', progress: 25 };
    
    switch (strengthScore) {
      case 1:
        return { label: 'Débil', colorClass: 'bg-rose-500 w-1/4', textColor: 'text-rose-500 dark:text-rose-400', progress: 25 };
      case 2:
        return { label: 'Medio', colorClass: 'bg-amber-500 w-2/4', textColor: 'text-amber-500 dark:text-amber-400', progress: 50 };
      case 3:
        return { label: 'Fuerte', colorClass: 'bg-emerald-500 w-3/4', textColor: 'text-emerald-500 dark:text-emerald-400', progress: 75 };
      case 4:
        return { label: 'Muy Fuerte', colorClass: 'bg-blue-600 w-full', textColor: 'text-blue-600 dark:text-blue-400', progress: 100 };
      default:
        return { label: 'Débil', colorClass: 'bg-rose-500 w-1/4', textColor: 'text-rose-500 dark:text-rose-400', progress: 25 };
    }
  };

  const strengthInfo = getStrengthInfo();

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetsAllRequirements || !isMatch) return;

    // Trigger update up to parents
    onPasswordChanged({
      ...currentUser,
      password: newPassword,
      requiere_cambio_password: false
    });
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-300">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-150 dark:border-slate-800 overflow-hidden">
        
        {/* Progress header or lock indicator */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 p-6 text-white text-center">
          <div className="w-12 h-12 bg-white/10 dark:bg-black/20 text-white rounded-xl flex items-center justify-center mx-auto mb-3 shadow-md border border-white/10">
            <KeyRound className="w-6 h-6 text-white animate-pulse" />
          </div>
          <h2 className="text-sm font-black uppercase tracking-wider">Cambio Obligatorio de Contraseña</h2>
          <p className="text-[10px] text-indigo-200 mt-1 max-w-[280px] mx-auto">
            Por directiva de ciberseguridad y auditoría, debe reestablecer sus credenciales para continuar usando el ERP.
          </p>
        </div>

        {/* User Card */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-850 border-b border-slate-150 dark:border-slate-800 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-400 dark:text-slate-500 block text-[9px] uppercase tracking-wider font-bold">Colaborador Activo</span>
            <span className="font-extrabold text-slate-700 dark:text-slate-200">{currentUser.nombre}</span>
          </div>
          <div className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded font-mono font-bold text-[9.5px]">
            {currentUser.username}
          </div>
        </div>

        {/* Main Form */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          
          {/* New password field */}
          <div>
            <label className="block text-[10px] font-black text-slate-550 dark:text-slate-400 uppercase tracking-wide mb-1">
              Nueva Contraseña Contable-Fiscal *
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Introduzca nueva clave segura"
                className="w-full pl-3 pr-10 py-2 border border-slate-250 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50 dark:bg-slate-950 font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm password field */}
          <div>
            <label className="block text-[10px] font-black text-slate-550 dark:text-slate-400 uppercase tracking-wide mb-1">
              Confirme la Nueva Contraseña *
            </label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita la clave exacta"
                className="w-full pl-3 pr-10 py-2 border border-slate-250 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50 dark:bg-slate-950 font-mono text-xs"
                disabled={!meetsAllRequirements}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                disabled={!meetsAllRequirements}
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Key Validator Checker Block (Visual UI design) */}
          <div className="bg-slate-50 dark:bg-slate-950/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3.5 text-xs text-slate-600 dark:text-slate-400">
            
            {/* Strength indicator line */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[10px]">
                <span className="font-bold uppercase text-slate-400 dark:text-slate-500">Robustez de Clave</span>
                <span className={`font-black uppercase ${strengthInfo.textColor}`}>{strengthInfo.label}</span>
              </div>
              <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden transition-all duration-300">
                <div className={`h-full rounded-full transition-all duration-350 ${strengthInfo.colorClass}`}></div>
              </div>
            </div>

            {/* Criteria checklist */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]/relaxed font-medium pt-1 border-t border-slate-150 dark:border-slate-800">
              <div className="flex items-center gap-1.5">
                {hasMinLength ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <X className="w-3.5 h-3.5 text-rose-500" />}
                <span className={hasMinLength ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-450 dark:text-slate-500'}>Min. 8 caracteres</span>
              </div>
              <div className="flex items-center gap-1.5">
                {hasUppercase ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <X className="w-3.5 h-3.5 text-rose-500" />}
                <span className={hasUppercase ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-450 dark:text-slate-500'}>Letra Mayúscula (A-Z)</span>
              </div>
              <div className="flex items-center gap-1.5">
                {hasLowercase ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <X className="w-3.5 h-3.5 text-rose-500" />}
                <span className={hasLowercase ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-450 dark:text-slate-500'}>Letra Minúscula (a-z)</span>
              </div>
              <div className="flex items-center gap-1.5">
                {hasNumber ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <X className="w-3.5 h-3.5 text-rose-500" />}
                <span className={hasNumber ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-450 dark:text-slate-500'}>Al menos un Número</span>
              </div>
              <div className="flex items-center gap-1.5 sm:col-span-2">
                {hasSpecial ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <X className="w-3.5 h-3.5 text-rose-500" />}
                <span className={hasSpecial ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-450 dark:text-slate-500'}>Carácter Especial (!@#$@%&amp;)</span>
              </div>
            </div>

            {/* Coincidence checker */}
            <div className="pt-2 border-t border-slate-150 dark:border-slate-800 flex items-center justify-between text-[10.5px]">
              <span className="font-bold text-slate-500 dark:text-slate-450">Confirmación de Claves:</span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                newPassword && isMatch 
                  ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200' 
                  : 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border border-rose-200'
              }`}>
                {newPassword && isMatch ? (
                  <>✓ COINCIDEN</>
                ) : (
                  <>✗ NO COINCIDEN</>
                )}
              </span>
            </div>

          </div>

          {/* Action Button Controls */}
          <div className="pt-4 border-t border-slate-150 dark:border-slate-800 flex flex-col gap-2">
            <button
              type="submit"
              disabled={!meetsAllRequirements || !isMatch}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:shadow-none uppercase tracking-wider text-[11px] cursor-pointer flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              Guardar Contraseña y Continuar
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold rounded-lg transition-all text-[10.5px] cursor-pointer block text-center"
            >
              Cerrar Sesión (Cambiar de Usuario)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
